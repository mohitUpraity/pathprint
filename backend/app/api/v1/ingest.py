import asyncio
import logging
from typing import Dict, Any, Optional, List
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from app.core.security import get_current_user
from app.schemas.ingest_models import GitHubIngestRequest, GitHubIngestResponse
from app.schemas.resume_blueprint import ResumeIngestResponse
from app.services.github_service import github_service
from app.services.gemini_extractor import gemini_extractor
from app.services.resume_service import resume_service
from app.services.linkedin_service import linkedin_service
from app.services.neo4j_service import neo4j_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ingest", tags=["Data Ingestion"])

@router.get("/github/status")
async def get_github_sync_status(
    username: str = Query(...),
    token: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Returns total public repositories on GitHub vs currently synced repositories in Neo4j.
    """
    if not username or not username.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="GitHub username is required")

    user_id = current_user["id"]
    synced_projects = await neo4j_service.get_user_synced_projects(user_id)
    synced_names = {str(p.get("name", "")).lower() for p in synced_projects if p.get("name")}
    
    total_public_repos = await github_service.get_user_public_repo_count(username=username.strip(), token=token)
    
    return {
        "status": "success",
        "username": username.strip(),
        "total_github_repos": total_public_repos,
        "synced_projects_count": len(synced_projects),
        "unsynced_repos_count": max(0, total_public_repos - len(synced_projects)),
        "synced_projects": synced_projects
    }

@router.post("/github", response_model=GitHubIngestResponse)
async def ingest_github_repositories(
    payload: GitHubIngestRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Ingests public repositories for a candidate, extracts tech stacks using Gemini/Groq in parallel,
    and merges the graph topology into Neo4j scoped to the authenticated user.
    Supports syncing all repos (max_repos=0) and incremental syncing of only unsynced repos.
    """
    username = (payload.username or "").strip()
    if not username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="GitHub username is required for repository synchronization"
        )
    user_id = current_user["id"]
    user_email = current_user.get("email", "")


    logger.info(f"Initiating GitHub ingestion for user {user_id} (GitHub: {username}, max_repos: {payload.max_repos}, only_unsynced: {payload.only_unsynced})")

    # 1. Fetch currently synced repositories in Neo4j
    synced_identifiers = set(await neo4j_service.get_user_synced_project_ids(user_id))

    # 2. Fetch target repositories from GitHub
    raw_projects = await github_service.fetch_user_repositories(
        username=username,
        token=payload.github_token,
        max_repos=payload.max_repos,
        include_forks=payload.include_forks
    )

    if not raw_projects:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No public repositories found for GitHub user '{username}'"
        )

    total_found = len(raw_projects)
    already_synced_in_batch = 0
    projects_to_process = []

    # 3. Filter if incremental sync requested
    for proj in raw_projects:
        proj_id_lower = str(proj["id"]).lower()
        proj_name_lower = str(proj["name"]).lower()
        is_synced = (proj_id_lower in synced_identifiers) or (proj_name_lower in synced_identifiers)

        if is_synced:
            already_synced_in_batch += 1
            if payload.only_unsynced:
                continue  # Skip already synced projects

        projects_to_process.append(proj)

    # If only_unsynced was requested and no new repos remain:
    if payload.only_unsynced and not projects_to_process:
        return GitHubIngestResponse(
            status="success",
            username=username,
            repos_processed=0,
            repos_total_found=total_found,
            new_repos_synced=0,
            already_synced_count=already_synced_in_batch,
            skills_extracted=0,
            projects=[],
            graph_nodes_merged=0
        )

    # 4. Extract skills concurrently with bounded semaphore
    semaphore = asyncio.Semaphore(6)
    total_skills = set()

    async def process_project_skills(proj: Dict[str, Any]) -> Dict[str, Any]:
        async with semaphore:
            extracted_skills = await gemini_extractor.extract_project_skills(proj)
            proj["skills"] = extracted_skills
            return proj

    processed_projects = await asyncio.gather(*[process_project_skills(p) for p in projects_to_process])

    for proj in processed_projects:
        for s in proj.get("skills", []):
            total_skills.add(s["name"])

    # 5. Upsert into Neo4j Graph with Multi-Tenant Isolation
    nodes_merged = await neo4j_service.upsert_user_github_projects(
        user_id=user_id,
        user_email=user_email,
        github_username=username,
        projects=processed_projects
    )

    new_synced_count = len(processed_projects) if payload.only_unsynced else max(0, len(processed_projects) - already_synced_in_batch)

    return GitHubIngestResponse(
        status="success",
        username=username,
        repos_processed=len(processed_projects),
        repos_total_found=total_found,
        new_repos_synced=new_synced_count,
        already_synced_count=already_synced_in_batch,
        skills_extracted=len(total_skills),
        projects=processed_projects,
        graph_nodes_merged=nodes_merged
    )


@router.post("/resume", response_model=ResumeIngestResponse)
async def ingest_candidate_resume(
    file: UploadFile = File(None),
    storage_path: Optional[str] = Form(None),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Ingests Golden Base Resume (PDF upload or Supabase storage path),
    extracts sections into an editable JSON Blueprint using Gemini 1.5 Flash,
    and updates user profile, university, and experience nodes in Neo4j AuraDB.
    """
    user_id = current_user["id"]
    logger.info(f"Processing resume upload for user {user_id}")

    pdf_bytes = b""
    if file:
        pdf_bytes = await file.read()
    elif storage_path:
        # Future: download from Supabase storage if storage_path provided
        logger.info(f"Fetching from storage path: {storage_path}")

    if not pdf_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No PDF file provided in upload"
        )

    try:
        # 1. Extract digital text stream
        raw_text = resume_service.extract_text_from_pdf(pdf_bytes)
        if not raw_text:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Failed to extract text from PDF document"
            )

        # 2. Parse into structured JSON layout blueprint
        blueprint = await resume_service.parse_resume_to_blueprint(raw_text)

        # 3. Upsert into Neo4j Graph
        nodes_merged = await neo4j_service.upsert_user_resume_blueprint(
            user_id=user_id,
            blueprint=blueprint
        )

        all_skills = []
        for cat in blueprint.skills:
            all_skills.extend(cat.skills)

        universities = [edu.university for edu in blueprint.education if edu.university]
        companies = [exp.company for exp in blueprint.experience if exp.company]

        return ResumeIngestResponse(
            status="success",
            user_id=user_id,
            blueprint=blueprint,
            total_skills_extracted=len(set(all_skills)),
            universities_mapped=universities,
            companies_mapped=companies,
            graph_nodes_merged=nodes_merged
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing resume upload: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Resume processing failed: {str(e)}"
        )

@router.post("/linkedin")
async def ingest_linkedin_connections(
    file: UploadFile = File(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Ingests official LinkedIn Connections.csv, mapping 1st-degree contacts,
    current employers, and alumni nodes into Neo4j AuraDB.
    """
    user_id = current_user["id"]
    logger.info(f"Processing LinkedIn Connections.csv for user {user_id}")

    csv_bytes = await file.read()
    connections = linkedin_service.parse_connections_csv(csv_bytes)

    if not connections:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Failed to parse valid connections from uploaded CSV. Ensure it is the official LinkedIn Connections.csv file."
        )

    # Upsert into Neo4j
    nodes_merged = await neo4j_service.upsert_user_linkedin_connections(
        user_id=user_id,
        connections=connections
    )

    companies = list(set([c["company"] for c in connections if c["company"]]))

    return {
        "status": "success",
        "user_id": user_id,
        "total_connections_imported": len(connections),
        "companies_mapped": len(companies),
        "sample_companies": companies[:10],
        "graph_nodes_merged": nodes_merged
    }

class LeadPostRequest(BaseModel):
    post_text: str
    target_role_hint: Optional[str] = None

@router.post("/lead-post")
async def ingest_hiring_lead_post(
    payload: LeadPostRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Pastes a raw LinkedIn 'I am hiring' post or job snippet, extracts company and skills,
    and immediately runs graph traversal to discover referral paths in your network.
    """
    user_id = current_user["id"]
    lead_data = await linkedin_service.parse_hiring_lead_post(payload.post_text)
    
    result = await neo4j_service.upsert_hiring_lead_job(
        user_id=user_id,
        lead_data=lead_data
    )

    return {
        "status": "success",
        "lead_extracted": lead_data,
        "referral_bridges": result["referral_bridges"]
    }

class PostsIngestRequest(BaseModel):
    posts_text: str

@router.post("/linkedin/posts")
async def ingest_linkedin_user_posts(
    file: UploadFile = File(None),
    posts_text: Optional[str] = Form(None),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Ingests official LinkedIn 'Shares.csv' / 'Posts.csv' data export OR raw pasted post updates.
    Extracts Hackathons (e.g. Microsoft Noida Hackathon), Competitions, Project Milestones,
    Workshops, and Certifications using Gemini 1.5 Flash and permanently maps them into Neo4j AuraDB.
    """
    from app.services.linkedin_posts_service import linkedin_posts_service
    user_id = current_user["id"]
    combined_content = ""

    if file:
        file_bytes = await file.read()
        try:
            decoded_text = file_bytes.decode("utf-8", errors="ignore")
            # If CSV, parse rows
            if file.filename and file.filename.endswith(".csv"):
                parsed_list = linkedin_posts_service.parse_csv_posts(decoded_text)
                combined_content = "\n\n---\n\n".join(parsed_list)
            else:
                combined_content = decoded_text
        except Exception as e:
            logger.warning(f"Error reading file bytes: {e}")

    if posts_text:
        combined_content = (combined_content + "\n\n" + posts_text).strip()

    if not combined_content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide a Shares.csv/Posts.csv file upload or post text in 'posts_text'."
        )

    # 1. Extract intelligence via Gemini
    knowledge = await linkedin_posts_service.extract_knowledge_from_posts(combined_content)

    # 2. Merge into Neo4j Knowledge Graph
    nodes_merged = await linkedin_posts_service.merge_posts_knowledge_to_graph(
        user_id=user_id,
        knowledge=knowledge
    )

    return {
        "status": "success",
        "user_id": user_id,
        "extracted_knowledge": knowledge,
        "hackathons_count": len(knowledge.get("hackathons", [])),
        "achievements_count": len(knowledge.get("achievements", [])),
        "certifications_count": len(knowledge.get("certifications_or_workshops", [])),
        "skills_count": len(knowledge.get("extracted_skills", [])),
        "graph_nodes_merged": nodes_merged
    }

class TargetProfileIngestRequest(BaseModel):
    name: str
    headline: Optional[str] = None
    company: Optional[str] = None
    role: Optional[str] = None
    location: Optional[str] = None
    profile_url: Optional[str] = None
    shared_college: Optional[str] = None
    skills: Optional[List[str]] = None
    recent_posts: Optional[List[str]] = None
    connections_preview: Optional[List[Dict[str, Any]]] = None

@router.post("/linkedin/target-profile")
async def ingest_scanned_target_profile(
    payload: TargetProfileIngestRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Ingests any viewed LinkedIn profile scanned by the PathPrint Chrome Extension.
    Maps their current company, college alumni edge, and computes instant referral bridges.
    """
    user_id = current_user["id"]
    logger.info(f"Ingesting scanned target profile: {payload.name} @ {payload.company} for user {user_id}")

    res = await neo4j_service.upsert_target_scanned_profile(
        user_id=user_id,
        target_data=payload.model_dump()
    )

    return res

