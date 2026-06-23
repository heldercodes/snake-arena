def token_from(response):
    return response.headers["x-auth-token"]


def test_signup_hashes_password_and_authenticates_with_bearer(client):
    response = client.post("/api/auth/signup", json={"username": "orbit", "password": "secret"})

    assert response.status_code == 201
    assert response.json()["username"] == "orbit"
    assert response.headers["authorization"].startswith("Bearer ")
    assert "snake_session=" in response.headers["set-cookie"]

    token = token_from(response)
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json() == response.json()


def test_login_rejects_invalid_credentials(client):
    response = client.post("/api/auth/login", json={"username": "neon", "password": "wrong"})

    assert response.status_code == 401
    assert response.json() == {"message": "Invalid credentials"}


def test_logout_invalidates_token(client):
    login = client.post("/api/auth/login", json={"username": "neon", "password": "demo"})
    token = token_from(login)

    response = client.post("/api/auth/logout", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 204

    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 401
