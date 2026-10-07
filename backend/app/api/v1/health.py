from fastapi import APIRouter, Depends
from typing import Dict, Any
from app.core.database import neo4j_client
from app.core.config import settings
from app.core.security import get_current_user
from app.services.profile_service import profile_service

router = APIRouter(tags=["System"])

@router.get("/health")
async def health_check():
    neo4j_status = "connected" if neo4j_client.driver else "disconnected"
    return {
        "status": "online",
        "service": "PathPrint API Engine",
        "environment": settings.ENVIRONMENT,
        "database": {
            "neo4j": neo4j_status,
            "supabase_configured": bool(settings.SUPABASE_URL)
        }
    }

@router.post("/health/wipe-database")
async def wipe_database(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Safely purges ONLY the authenticated user's sub-graph and projects.
    Guarantees zero data loss or interference with other users.
    """
    user_id = current_user["id"]
    return await profile_service.reset_user_profile_data(user_id=user_id)

