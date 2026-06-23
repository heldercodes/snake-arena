import pytest
from fastapi.testclient import TestClient

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
