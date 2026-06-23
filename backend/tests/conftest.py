import os

import pytest
from fastapi.testclient import TestClient

os.environ["DATABASE_URL"] = "sqlite:///./test_snake_arena.db"

from app.main import app
from app.store import store


@pytest.fixture(autouse=True)
def seeded_store():
    store.seed()
    yield
    store.reset()


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)
