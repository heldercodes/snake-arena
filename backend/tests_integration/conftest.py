import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client(tmp_path, monkeypatch):
    database_url = f"sqlite:///{tmp_path / 'snake_arena.sqlite3'}"
    monkeypatch.setenv("DATABASE_URL", database_url)

    from app.main import app
    from app.store import store

    store.configure(database_url)
    store.reset()

    with TestClient(app) as test_client:
        yield test_client

    store.reset()
    store.engine.dispose()
