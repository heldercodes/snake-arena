from dataclasses import dataclass
from time import time
from uuid import uuid4

from fastapi import HTTPException

from app.auth import create_token, hash_password, verify_password
from app.models import GameMode, GameSnapshot, LiveGame, Point, Score, User


def now_ms() -> int:
    return int(time() * 1000)


def uid(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:8]}"


@dataclass
class StoredUser:
    id: str
    username: str
    password_hash: str

    def public(self) -> User:
        return User(id=self.id, username=self.username)


class InMemoryStore:
    def __init__(self) -> None:
        self.users_by_id: dict[str, StoredUser] = {}
        self.users_by_username: dict[str, StoredUser] = {}
        self.sessions: dict[str, str] = {}
        self.scores: list[Score] = []
        self.games: dict[str, LiveGame] = {}

    def reset(self) -> None:
        self.users_by_id.clear()
        self.users_by_username.clear()
        self.sessions.clear()
        self.scores.clear()
        self.games.clear()

    def seed(self) -> None:
        self.reset()
        for username in ("neon", "pixel", "viper"):
            self.create_user(username, "demo")

        seed_scores: list[tuple[str, GameMode, int, int]] = [
            ("neon", GameMode.walls, 42, 6_000),
            ("pixel", GameMode.walls, 31, 5_000),
            ("viper", GameMode.walls, 67, 4_000),
            ("neon", GameMode.wrap, 88, 3_000),
            ("pixel", GameMode.wrap, 120, 2_000),
            ("viper", GameMode.wrap, 54, 1_000),
        ]
        base = now_ms()
        for username, mode, score, age in seed_scores:
            user = self.users_by_username[username]
            self.scores.append(
                Score(
                    id=uid("s"),
                    userId=user.id,
                    username=user.username,
                    mode=mode,
                    score=score,
                    createdAt=base - age,
                )
            )

        self.create_live_game(self.users_by_username["neon"].public(), GameMode.walls, demo_snapshot(GameMode.walls))
        self.create_live_game(self.users_by_username["pixel"].public(), GameMode.wrap, demo_snapshot(GameMode.wrap))

    def create_user(self, username: str, password: str) -> User:
        if username in self.users_by_username:
            raise HTTPException(status_code=409, detail="Username already taken")
        user = StoredUser(id=uid("u"), username=username, password_hash=hash_password(password))
        self.users_by_id[user.id] = user
        self.users_by_username[user.username] = user
        return user.public()

    def authenticate(self, username: str, password: str) -> User:
        user = self.users_by_username.get(username)
        if not user or not verify_password(password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        return user.public()

    def create_session(self, user: User) -> str:
        token = create_token()
        self.sessions[token] = user.id
        return token

    def delete_session(self, token: str) -> None:
        self.sessions.pop(token, None)

    def user_for_token(self, token: str) -> User:
        user_id = self.sessions.get(token)
        user = self.users_by_id.get(user_id or "")
        if not user:
            raise HTTPException(status_code=401, detail="Not signed in")
        return user.public()

    def top_scores(self, mode: GameMode, limit: int) -> list[Score]:
        return sorted(
            (score for score in self.scores if score.mode == mode),
            key=lambda score: (-score.score, score.createdAt),
        )[:limit]

    def add_score(self, user: User, mode: GameMode, score: int) -> Score:
        created = Score(id=uid("s"), userId=user.id, username=user.username, mode=mode, score=score, createdAt=now_ms())
        self.scores.append(created)
        return created

    def active_games(self) -> list[LiveGame]:
        return [game for game in self.games.values() if game.active]

    def get_game(self, game_id: str) -> LiveGame:
        game = self.games.get(game_id)
        if not game:
            raise HTTPException(status_code=404, detail="Live game not found")
        return game

    def create_live_game(self, user: User, mode: GameMode, snapshot: GameSnapshot) -> LiveGame:
        game = LiveGame(
            id=uid("g"),
            userId=user.id,
            username=user.username,
            mode=mode,
            startedAt=now_ms(),
            snapshot=snapshot,
            active=True,
        )
        self.games[game.id] = game
        return game

    def update_snapshot(self, game_id: str, user: User, snapshot: GameSnapshot) -> None:
        game = self.get_game(game_id)
        self.ensure_owner(game, user)
        self.games[game_id] = game.model_copy(update={"snapshot": snapshot})

    def end_game(self, game_id: str, user: User, final_score: int) -> None:
        game = self.get_game(game_id)
        self.ensure_owner(game, user)
        final_snapshot = game.snapshot.model_copy(update={"score": final_score, "over": True})
        self.games[game_id] = game.model_copy(update={"active": False, "snapshot": final_snapshot})
        self.add_score(user, game.mode, final_score)

    @staticmethod
    def ensure_owner(game: LiveGame, user: User) -> None:
        if game.userId != user.id:
            raise HTTPException(status_code=403, detail="You cannot modify this live game")


def demo_snapshot(mode: GameMode) -> GameSnapshot:
    return GameSnapshot(
        size=20,
        snake=[Point(x=10, y=10), Point(x=9, y=10), Point(x=8, y=10)],
        food=Point(x=5, y=5),
        dir=Point(x=1, y=0),
        score=0,
        mode=mode,
        over=False,
    )


store = InMemoryStore()
