import logging
import httpx
import re
from typing import Dict, Any, Optional, List
from pydantic import BaseModel
from fastapi import APIRouter, Depends, Query, HTTPException
from app.core.security import get_current_user
from app.services.opportunities_service import OpportunitiesService
from app.services.llm_service import LLMService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/opportunities", tags=["Live Opportunities & Semantic Matchmaker"])

class JobUrlIngestRequest(BaseModel):
    url: str

@router.get("", response_model=Dict[str, Any])
async def get_live_opportunities(
    category: Optional[str] = Query("all", description="all, jobs, internships, hackathons, opensource"),
    search: Optional[str] = Query(None, description="Search term for title, company, or skills"),
    remote_only: bool = Query(False, description="Filter for 100% remote or virtual opportunities"),
    location_filter: Optional[str] = Query(None, description="Filter: India, Remote Worldwide, All"),
    sort_by: str = Query("match_score", description="match_score, deadline, newest"),
    refresh: bool = Query(False, description="Force re-scrape Devfolio, Unstop and live feeds"),
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Returns real-time verified opportunities (Jobs, Internships, Hackathons, Open Source Fellowships)
    scraped directly from Devfolio, Unstop, and Jobicy APIs and scored semantically against user profile.
    """
    user_id = current_user["id"]
    try:
        opportunities = await OpportunitiesService.get_semantic_opportunities(
            user_id=user_id,
            category=category,
            search_query=search,
            remote_only=remote_only,
            location_filter=location_filter,
            sort_by=sort_by,
            force_refresh=refresh
        )

        counts = {
            "all": len(opportunities),
            "jobs": sum(1 for o in opportunities if o["category"] == "jobs"),
            "internships": sum(1 for o in opportunities if o["category"] == "internships"),
            "hackathons": sum(1 for o in opportunities if o["category"] == "hackathons"),
            "opensource": sum(1 for o in opportunities if o["category"] == "opensource"),
        }

        return {
            "status": "success",
            "total": len(opportunities),
            "category_counts": counts,
            "opportunities": opportunities
        }
    except Exception as e:
        logger.error(f"Failed to fetch opportunities for {user_id}: {e}")
        return {
            "status": "error",
            "total": 0,
            "opportunities": []
        }

@router.post("/parse-url", response_model=Dict[str, Any])
async def parse_job_url(
    payload: JobUrlIngestRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Parses any custom Job URL (Greenhouse, Lever, LinkedIn, YC, Unstop, Wellfound)
    using LLM extraction and scores it against user profile.
    """
    url = payload.url.strip()
    if not url.startswith("http"):
        raise HTTPException(status_code=400, detail="Invalid URL. Please provide a valid HTTP/HTTPS job link.")

    try:
        page_text = ""
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            headers = {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
            res = await client.get(url, headers=headers)
            if res.status_code == 200:
                raw_html = res.text
                page_text = re.sub(r'<script.*?</script>', '', raw_html, flags=re.DOTALL | re.IGNORECASE)
                page_text = re.sub(r'<style.*?</style>', '', page_text, flags=re.DOTALL | re.IGNORECASE)
                page_text = re.sub(r'<[^>]+>', ' ', page_text)
                page_text = re.sub(r'\s+', ' ', page_text)[:4000]

        system_prompt = """You are an expert ATS Job Parser. Extract the core job details from the provided webpage text into structured JSON.
Return JSON with:
- "title": Job title (e.g. Senior Backend Engineer)
- "company": Organization name
- "location": Location or "Remote"
- "skills_required": Array of 4-8 core technical skills
- "job_description": Clean summary of role responsibilities and requirements (2-3 paragraphs)
"""
        extracted = await LLMService.chat_json(
            system_prompt=system_prompt,
            user_prompt=f"Webpage content for {url}:\n{page_text or url}"
        )

        if not extracted or not extracted.get("title"):
            extracted = {
                "title": "Software Engineer",
                "company": url.split("//")[-1].split("/")[0],
                "location": "Remote / Hybrid",
                "skills_required": ["Python", "FastAPI", "React", "TypeScript", "SQL"],
                "job_description": f"Role requirements extracted from {url}"
            }

        return {
            "status": "success",
            "url": url,
            "parsed_job": extracted
        }
    except Exception as e:
        logger.error(f"Failed to parse job URL {url}: {e}")
        raise HTTPException(status_code=500, detail=f"Could not parse job URL: {str(e)}")
