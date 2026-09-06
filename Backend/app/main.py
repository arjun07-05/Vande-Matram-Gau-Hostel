import logging
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.api.api_router import api_router
from app.database.session import SessionLocal
from app.core.init_db import init_db

# Configure structured application logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Set CORS allowed origins
cors_kwargs = {
    "allow_origins": settings.get_cors_origins(),
    "allow_credentials": True,
    "allow_methods": ["*"],
    "allow_headers": ["*"],
}

if settings.CORS_ORIGINS_REGEX:
    cors_kwargs["allow_origin_regex"] = settings.CORS_ORIGINS_REGEX

app.add_middleware(CORSMiddleware, **cors_kwargs)

# Static files for uploads (Cow photos, member photos, system logo)
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.on_event("startup")
def on_startup():
    try:
        db = SessionLocal()
        init_db(db)
        db.close()
        logger.info("Application startup check completed.")
    except Exception as e:
        logger.error(f"Error during startup init check: {e}")

@app.get("/")
def root():
    return {"message": "Welcome to Vande Mataram Gau Hostel API", "status": "healthy"}
