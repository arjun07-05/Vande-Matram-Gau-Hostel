from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.api.api_router import api_router
from app.database.session import engine, SessionLocal
from app.database.base import Base
from app.core.init_db import init_db
import logging
import os

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("app.log", mode="a", encoding="utf-8") if os.path.exists("logs") else logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Set CORS allowed origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost", "https://localhost"],
    allow_origin_regex=os.getenv("CORS_ORIGINS_REGEX", r"https?://.*\.compute-1\.amazonaws\.com"),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.on_event("startup")
def on_startup():
    # Database tables should be created and managed by Alembic in production.
    # We leave the initialization of default data, but wrapped in a try/except or strictly using migrations.
    pass

@app.get("/")
def root():
    return {"message": "Welcome to Vande Mataram Gau Hostel API"}


