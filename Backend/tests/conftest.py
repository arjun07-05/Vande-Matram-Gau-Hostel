import os

# Test-only environment configuration.
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("SECRET_KEY", "test-secret-key-at-least-32-characters-long")
os.environ.setdefault("INITIAL_ADMIN_EMAIL", "testadmin@gauhostel.com")
os.environ.setdefault("INITIAL_ADMIN_PASSWORD", "AdminPass123456!")
os.environ.setdefault("INITIAL_ADMIN_NAME", "Test Admin")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.api.deps import get_db
from app.database.session import Base
from app.core.security import get_password_hash
from app.models.user import User

# In-memory SQLite database using StaticPool
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    # Seed test admin
    db = TestingSessionLocal()
    admin = User(
        email="testadmin@gauhostel.com",
        name="Test Admin",
        password_hash=get_password_hash("AdminPass123"),
        role="Admin",
        active=True
    )
    db.add(admin)
    db.commit()
    db.close()
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def db_session():
    session = TestingSessionLocal()
    yield session
    session.close()

@pytest.fixture
def client():
    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

@pytest.fixture
def admin_token(client):
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "testadmin@gauhostel.com", "password": "AdminPass123"}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["access_token"]
