from fastapi.testclient import TestClient

from app.main import create_app


def test_frontend_index_is_served_when_static_build_exists(monkeypatch, tmp_path):
    static_dir = tmp_path / "static"
    static_dir.mkdir()
    (static_dir / "index.html").write_text("<!doctype html><div id=\"root\"></div>", encoding="utf-8")

    monkeypatch.setenv("FRONTEND_STATIC_DIR", str(static_dir))
    client = TestClient(create_app())

    response = client.get("/")

    assert response.status_code == 200
    assert "<div id=\"root\"></div>" in response.text


def test_frontend_routes_fall_back_to_index(monkeypatch, tmp_path):
    static_dir = tmp_path / "static"
    static_dir.mkdir()
    (static_dir / "index.html").write_text("<!doctype html><main>Snake Arena</main>", encoding="utf-8")

    monkeypatch.setenv("FRONTEND_STATIC_DIR", str(static_dir))
    client = TestClient(create_app())

    response = client.get("/play/walls")

    assert response.status_code == 200
    assert "Snake Arena" in response.text


def test_frontend_static_assets_are_served(monkeypatch, tmp_path):
    static_dir = tmp_path / "static"
    assets_dir = static_dir / "assets"
    assets_dir.mkdir(parents=True)
    (static_dir / "index.html").write_text("<!doctype html>", encoding="utf-8")
    (assets_dir / "app.js").write_text("console.log('snake')", encoding="utf-8")

    monkeypatch.setenv("FRONTEND_STATIC_DIR", str(static_dir))
    client = TestClient(create_app())

    response = client.get("/assets/app.js")

    assert response.status_code == 200
    assert response.text == "console.log('snake')"


def test_unmatched_api_routes_do_not_fall_back_to_frontend(monkeypatch, tmp_path):
    static_dir = tmp_path / "static"
    static_dir.mkdir()
    (static_dir / "index.html").write_text("<!doctype html><main>Snake Arena</main>", encoding="utf-8")

    monkeypatch.setenv("FRONTEND_STATIC_DIR", str(static_dir))
    client = TestClient(create_app())

    response = client.get("/api/missing")

    assert response.status_code == 404
    assert response.json() == {"message": "Not found"}
