import asyncio
import os
import httpx
from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse, JSONResponse
from app.core.config import settings
from app.core.database import neo4j_client
from app.api.v1 import health, ingest, profile, matches, resume, opportunities

logging.basicConfig(level=settings.LOG_LEVEL)
logger = logging.getLogger("pathprint")

async def keep_alive_worker():
    """
    Background worker that pings the /health endpoint periodically.
    Prevents free-tier cloud containers from entering sleep/cold-start state.
    """
    target_url = settings.KEEP_ALIVE_URL or settings.RENDER_EXTERNAL_URL
    if not target_url:
        render_service_name = os.environ.get("RENDER_SERVICE_NAME")
        if render_service_name:
            target_url = f"https://{render_service_name}.onrender.com"
        elif settings.ENVIRONMENT == "production":
            target_url = "http://localhost:8000"

    if not target_url:
        logger.info("Self-pinger dormant (no KEEP_ALIVE_URL set).")
        return

    health_endpoint = f"{target_url.rstrip('/')}/api/v1/health"
    logger.info(f"Self-ping keep-alive loop active for {health_endpoint} (every {settings.KEEP_ALIVE_INTERVAL_SECONDS}s)")
    
    # Wait 60s for server port to bind
    await asyncio.sleep(60)

    while True:
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.get(health_endpoint)
                logger.info(f"Keep-alive self-ping delivered to {health_endpoint} [status: {res.status_code}]")
        except Exception as e:
            logger.debug(f"Keep-alive ping notice: {e}")
        
        await asyncio.sleep(settings.KEEP_ALIVE_INTERVAL_SECONDS)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing PathPrint backend engine...")
    await neo4j_client.connect()
    
    # Spawn background self-ping task
    keep_alive_task = asyncio.create_task(keep_alive_worker())
    
    yield
    
    logger.info("Shutting down PathPrint backend engine...")
    keep_alive_task.cancel()
    await neo4j_client.close()

app = FastAPI(
    title="PathPrint Core API",
    description="Autonomous Career Navigation, Skill Topology Graph & Dynamic Resume Studio",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://pathprint.vercel.app",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ] + settings.cors_origin_list,
    allow_origin_regex=r"https://.*\.vercel\.app|https://.*\.onrender\.com|https://.*\.railway\.app|https://.*\.pages\.dev|http://localhost:\d+|http://127\.0\.0\.1:\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global unhandled error on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "status": "error"}
    )

# Register Phase 1 Core API Routers
app.include_router(health.router, prefix="/api/v1")
app.include_router(ingest.router, prefix="/api/v1")
app.include_router(profile.router, prefix="/api/v1")
app.include_router(matches.router, prefix="/api/v1")
app.include_router(resume.router, prefix="/api/v1")
app.include_router(opportunities.router, prefix="/api/v1")

# Mount Static Frontend if built
frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))
if os.path.exists(frontend_dir):
    app.mount("/dashboard", StaticFiles(directory=frontend_dir, html=True), name="dashboard")

@app.get("/healthz")
@app.get("/health")
async def root_health_check():
    return {"status": "healthy", "service": "PathPrint"}

@app.get("/")
async def root():
    return RedirectResponse(url="/docs")
