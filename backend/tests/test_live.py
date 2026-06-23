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


def login(client, username="neon"):
    response = client.post("/api/auth/login", json={"username": username, "password": "demo"})
    return response.headers["x-auth-token"]


def test_live_games_are_seeded(client):
    response = client.get("/api/live/games")

    assert response.status_code == 200
    games = response.json()
    assert len(games) == 2
    assert {game["username"] for game in games} == {"neon", "pixel"}


def test_start_tick_and_end_live_game(client):
    token = login(client, "neon")

    start = client.post(
        "/api/live/games",
        json={"mode": "walls", "snapshot": snapshot()},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert start.status_code == 201
    game = start.json()

    tick = client.put(
        f"/api/live/games/{game['id']}/snapshot",
        json={"snapshot": snapshot(score=5)},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert tick.status_code == 204
    assert client.get(f"/api/live/games/{game['id']}").json()["snapshot"]["score"] == 5

    end = client.post(
        f"/api/live/games/{game['id']}/end",
        json={"finalScore": 9},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert end.status_code == 204
    ended = client.get(f"/api/live/games/{game['id']}").json()
    assert ended["active"] is False
    assert ended["snapshot"]["over"] is True
    assert ended["snapshot"]["score"] == 9


def test_only_owner_can_update_live_game(client):
    neon_token = login(client, "neon")
    pixel_token = login(client, "pixel")
    start = client.post(
        "/api/live/games",
        json={"mode": "walls", "snapshot": snapshot()},
        headers={"Authorization": f"Bearer {neon_token}"},
    )

    response = client.put(
        f"/api/live/games/{start.json()['id']}/snapshot",
        json={"snapshot": snapshot(score=1)},
        headers={"Authorization": f"Bearer {pixel_token}"},
    )

    assert response.status_code == 403
