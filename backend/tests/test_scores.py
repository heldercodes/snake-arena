def test_scores_are_seeded_and_sorted(client):
    response = client.get("/api/scores", params={"mode": "walls", "limit": 2})

    assert response.status_code == 200
    scores = response.json()
    assert [score["username"] for score in scores] == ["viper", "neon"]
    assert [score["score"] for score in scores] == [67, 42]


def test_submit_score_requires_auth(client):
    response = client.post("/api/scores", json={"mode": "wrap", "score": 200})

    assert response.status_code == 401
    assert response.json() == {"message": "Not signed in"}


def test_submit_score_uses_signed_in_user(client):
    login = client.post("/api/auth/login", json={"username": "pixel", "password": "demo"})
    token = login.headers["x-auth-token"]

    response = client.post(
        "/api/scores",
        json={"mode": "wrap", "score": 200},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 201
    assert response.json()["username"] == "pixel"
    assert response.json()["score"] == 200
