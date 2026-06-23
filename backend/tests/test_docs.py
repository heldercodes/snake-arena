def test_root_redirects_to_interactive_docs(client):
    response = client.get("/", follow_redirects=False)

    assert response.status_code == 307
    assert response.headers["location"] == "/api/docs"


def test_interactive_docs_are_available(client):
    response = client.get("/api/docs")

    assert response.status_code == 200
    assert "swagger-ui" in response.text
