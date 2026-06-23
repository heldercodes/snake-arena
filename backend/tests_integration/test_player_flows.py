def snapshot(mode="walls", score=0, over=False):
    return {
        "size": 20,
        "snake": [{"x": 10, "y": 10}, {"x": 9, "y": 10}],
        "food": {"x": 5, "y": 5},
        "dir": {"x": 1, "y": 0},
        "score": score,
        "mode": mode,
        "over": over,
    }


def bearer(response):
    return {"Authorization": response.headers["authorization"]}


def test_signup_login_submit_score_and_read_leaderboard(client):
    empty_leaderboard = client.get("/api/scores", params={"mode": "wrap"})
    assert empty_leaderboard.status_code == 200
    assert empty_leaderboard.json() == []

    signup = client.post("/api/auth/signup", json={"username": "orbit", "password": "secret"})
    assert signup.status_code == 201
    assert signup.json()["username"] == "orbit"

    me_from_signup_session = client.get("/api/auth/me", headers=bearer(signup))
    assert me_from_signup_session.status_code == 200
    assert me_from_signup_session.json() == signup.json()

    logout = client.post("/api/auth/logout", headers=bearer(signup))
    assert logout.status_code == 204
    assert client.get("/api/auth/me", headers=bearer(signup)).status_code == 401

    login = client.post("/api/auth/login", json={"username": "orbit", "password": "secret"})
    assert login.status_code == 200
    assert login.json() == signup.json()

    submitted = client.post(
        "/api/scores",
        json={"mode": "wrap", "score": 321},
        headers=bearer(login),
    )
    assert submitted.status_code == 201
    submitted_score = submitted.json()
    assert submitted_score["username"] == "orbit"
    assert submitted_score["score"] == 321
    assert submitted_score["mode"] == "wrap"

    leaderboard = client.get("/api/scores", params={"mode": "wrap", "limit": 10})
    assert leaderboard.status_code == 200
    assert leaderboard.json() == [submitted_score]


def test_live_game_flow_records_final_score_on_leaderboard(client):
    signup = client.post("/api/auth/signup", json={"username": "vortex", "password": "secret"})
    auth_headers = bearer(signup)

    no_live_games = client.get("/api/live/games")
    assert no_live_games.status_code == 200
    assert no_live_games.json() == []

    start = client.post(
        "/api/live/games",
        json={"mode": "walls", "snapshot": snapshot()},
        headers=auth_headers,
    )
    assert start.status_code == 201
    game = start.json()
    assert game["username"] == "vortex"
    assert game["active"] is True

    active_games = client.get("/api/live/games")
    assert active_games.status_code == 200
    assert [active_game["id"] for active_game in active_games.json()] == [game["id"]]

    tick = client.put(
        f"/api/live/games/{game['id']}/snapshot",
        json={"snapshot": snapshot(score=17)},
        headers=auth_headers,
    )
    assert tick.status_code == 204

    updated = client.get(f"/api/live/games/{game['id']}")
    assert updated.status_code == 200
    assert updated.json()["snapshot"]["score"] == 17

    end = client.post(
        f"/api/live/games/{game['id']}/end",
        json={"finalScore": 25},
        headers=auth_headers,
    )
    assert end.status_code == 204

    ended = client.get(f"/api/live/games/{game['id']}")
    assert ended.status_code == 200
    assert ended.json()["active"] is False
    assert ended.json()["snapshot"]["over"] is True
    assert ended.json()["snapshot"]["score"] == 25

    assert client.get("/api/live/games").json() == []

    leaderboard = client.get("/api/scores", params={"mode": "walls"})
    assert leaderboard.status_code == 200
    assert [
        {
            "username": score["username"],
            "mode": score["mode"],
            "score": score["score"],
        }
        for score in leaderboard.json()
    ] == [{"username": "vortex", "mode": "walls", "score": 25}]
