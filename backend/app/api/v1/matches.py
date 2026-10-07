import logging
from typing import Dict, Any, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from app.core.security import get_current_user
from app.services.matchmaking_service import matchmaking_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/matches", tags=["Matchmaking & Outreach"])

class JobAnalyzeRequest(BaseModel):
    job_description: str
    company_override: Optional[str] = None
    role_override: Optional[str] = None

class PitchGenerateRequest(BaseModel):
    job_summary: Dict[str, Any]
    target_contact: Dict[str, Any]

@router.post("/analyze", response_model=Dict[str, Any])
async def analyze_job_match(
    payload: JobAnalyzeRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Analyzes any pasted Job Description against the user's Graph:
    - Calculates Skill Match % (Code-verified vs Missing)
    - Recommends best proof-of-work projects
    - Discovers hidden Alumni & 1st-degree referral paths at target company
    """
    user_id = current_user["id"]
    try:
        # 1. Parse Job requirements via Gemini
        job_req = await matchmaking_service.extract_job_requirements(payload.job_description)
        if payload.company_override:
            job_req["company_name"] = payload.company_override
        if payload.role_override:
            job_req["job_title"] = payload.role_override

        # 2. Match against Neo4j Graph
        analysis = await matchmaking_service.analyze_match_against_graph(
            user_id=user_id,
            job_req=job_req
        )
        return analysis
    except Exception as e:
        logger.error(f"Job match analysis failed for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-pitch", response_model=Dict[str, Any])
async def generate_referral_pitch(
    payload: PitchGenerateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Generates tailored, high-converting LinkedIn connection notes and cold emails
    incorporating candidate's real code projects and alumni bridges.
    """
    user_id = current_user["id"]
    try:
        pitch = await matchmaking_service.generate_personalized_pitch(
            user_id=user_id,
            job_summary=payload.job_summary,
            target_contact=payload.target_contact
        )
        return {
            "status": "success",
            "pitch": pitch
        }
    except Exception as e:
        logger.error(f"Pitch generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
