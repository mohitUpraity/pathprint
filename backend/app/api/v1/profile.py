import logging
from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any
from app.core.security import get_current_user
from app.services.profile_service import profile_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/profile", tags=["Profile Intelligence"])

@router.get("/analysis", response_model=Dict[str, Any])
async def get_profile_analysis(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Retrieves deep Graph Intelligence analysis of the authenticated user's career footprint:
    - Code-verified vs Resume-claimed skills
    - GitHub projects & linked tech stack
    - Work experience & Education history
    - Network Reach & Alumni company connections
    - Career Readiness & Profile Completeness Score
    """
    user_id = current_user["id"]
    try:
        analysis = await profile_service.get_comprehensive_profile_analysis(user_id=user_id)
        return analysis
    except Exception as e:
        logger.error(f"Failed to fetch profile analysis for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/graph", response_model=Dict[str, Any])
async def get_graph_topology(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Retrieves full physics-simulated node and edge topology for D3 Force-Directed Canvas.
    """
    user_id = current_user["id"]
    try:
        topology = await profile_service.get_graph_topology(user_id=user_id)
        return topology
    except Exception as e:
        logger.error(f"Failed to fetch graph topology for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/connections", response_model=Dict[str, Any])
async def get_connections(
    search: str = "",
    limit: int = 100,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Retrieves searchable connection directory and alumni bridges.
    """
    user_id = current_user["id"]
    try:
        connections = await profile_service.get_user_connections(user_id=user_id, search=search, limit=limit)
        return {
            "status": "success",
            "total": len(connections),
            "connections": connections,
            "contacts": connections
        }
    except Exception as e:
        logger.error(f"Failed to fetch connections for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/preferences", response_model=Dict[str, Any])
async def get_user_preferences(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Retrieves user's career & opportunity matching preferences (Target Country, Cities, Roles, Work Modes, Stipend/Salary).
    """
    from app.services.neo4j_service import neo4j_service
    user_id = current_user["id"]
    try:
        prefs = await neo4j_service.get_user_preferences(user_id=user_id)
        return {
            "status": "success",
            "preferences": prefs
        }
    except Exception as e:
        logger.error(f"Failed to fetch preferences for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/preferences", response_model=Dict[str, Any])
async def update_user_preferences(
    payload: Dict[str, Any],
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Updates user's career & opportunity matching preferences in Neo4j.
    """
    from app.services.neo4j_service import neo4j_service
    user_id = current_user["id"]
    try:
        updated = await neo4j_service.upsert_user_preferences(user_id=user_id, preferences=payload)
        return {
            "status": "success",
            "message": "Career preferences successfully updated",
            "preferences": updated
        }
    except Exception as e:
        logger.error(f"Failed to update preferences for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/details", response_model=Dict[str, Any])
async def get_profile_details(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Retrieves full user identity, headline, bio, education, experience,
    core skills list, and career matching preferences.
    """
    user_id = current_user["id"]
    try:
        details = await profile_service.get_user_profile_details(user_id=user_id)
        return {
            "status": "success",
            "profile": details
        }
    except Exception as e:
        logger.error(f"Failed to fetch profile details for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/details", response_model=Dict[str, Any])
async def update_profile_details(
    payload: Dict[str, Any],
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Updates full user profile information, education, experience, skills,
    and matching preferences in Neo4j.
    """
    user_id = current_user["id"]
    try:
        updated = await profile_service.update_user_profile_details(user_id=user_id, payload=payload)
        return {
            "status": "success",
            "message": "User profile and career preferences updated successfully",
            "profile": updated
        }
    except Exception as e:
        logger.error(f"Failed to update profile details for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/reset", response_model=Dict[str, Any])
async def reset_profile(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Safely resets the user's personal profile and graph data.
    """
    user_id = current_user["id"]
    try:
        res = await profile_service.reset_user_profile_data(user_id=user_id)
        return res
    except Exception as e:
        logger.error(f"Failed to reset profile for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/market-intelligence", response_model=Dict[str, Any])
async def get_market_intelligence(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Calculates live market skill demand percentages, high-ROI missing skill unlock metrics,
    and actionable project sprints for bridging gaps.
    """
    user_id = current_user["id"]
    try:
        data = await profile_service.get_market_intelligence(user_id=user_id)
        return data
    except Exception as e:
        logger.error(f"Failed to calculate market intelligence for {user_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/learning-action", response_model=Dict[str, Any])
async def toggle_learning_action(
    payload: Dict[str, Any],
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Interactively toggles a skill between learning, mastered (synced to graph), or removed.
    """
    user_id = current_user["id"]
    skill_name = payload.get("skill_name", "")
    action = payload.get("action", "")
    try:
        res = await profile_service.toggle_learning_skill(user_id=user_id, skill_name=skill_name, action=action)
        return res
    except Exception as e:
        logger.error(f"Failed to execute learning action for {user_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))





