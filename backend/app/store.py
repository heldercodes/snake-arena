import os
from contextlib import contextmanager
from time import time
from typing import Iterator
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import JSON, Boolean, ForeignKey, Integer, String, create_engine, delete, select
from sqlalchemy.engine import Engine
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker

from app.auth import create_token, hash_password, verify_password
from app.models import GameMode, GameSnapshot, LiveGame, Point, Score, User

DEFAULT_DATABASE_URL = "sqlite:///./snake_arena.db"


def now_ms() -> int:
    return int(time() * 1000)


def uid(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:8]}"


class Base(DeclarativeBase):
    pass


class UserRow(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    username: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)


class SessionRow(Base):
    __tablename__ = "sessions"

    token: Mapped[str] = mapped_column(String(255), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)


class ScoreRow(Base):
    __tablename__ = "scores"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    username: Mapped[str] = mapped_column(String(255), nullable=False)
    mode: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    score: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[int] = mapped_column(Integer, index=True, nullable=False)


class LiveGameRow(Base):
    __tablename__ = "live_games"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    username: Mapped[str] = mapped_column(String(255), nullable=False)
    mode: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    started_at: Mapped[int] = mapped_column(Integer, nullable=False)
    snapshot: Mapped[dict] = mapped_column(JSON, nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, index=True, nullable=False)


def engine_kwargs(database_url: str) -> dict:
    if database_url.startswith("sqlite"):
        return {"connect_args": {"check_same_thread": False}}
    return {}


def user_from_row(row: UserRow) -> User:
    return User(id=row.id, username=row.username)


def score_from_row(row: ScoreRow) -> Score:
    return Score(
        id=row.id,
        userId=row.user_id,
        username=row.username,
        mode=GameMode(row.mode),
        score=row.score,
        createdAt=row.created_at,
    )


def game_from_row(row: LiveGameRow) -> LiveGame:
    return LiveGame(
        id=row.id,
        userId=row.user_id,
        username=row.username,
        mode=GameMode(row.mode),
        startedAt=row.started_at,
        snapshot=GameSnapshot.model_validate(row.snapshot),
        active=row.active,
    )


class DatabaseStore:
    def __init__(self, database_url: str | None = None) -> None:
        self.database_url = database_url or os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL)
        self.engine = self._create_engine(self.database_url)
        self.session_factory = sessionmaker(bind=self.engine, expire_on_commit=False)

    @staticmethod
    def _create_engine(database_url: str) -> Engine:
        return create_engine(database_url, **engine_kwargs(database_url))

    def configure(self, database_url: str) -> None:
        self.database_url = database_url
        self.engine.dispose()
        self.engine = self._create_engine(database_url)
        self.session_factory.configure(bind=self.engine)

    @contextmanager
    def session(self) -> Iterator[Session]:
        with self.session_factory() as session:
            try:
                yield session
                session.commit()
            except Exception:
                session.rollback()
                raise

    def init_db(self) -> None:
        Base.metadata.create_all(self.engine)

    def reset(self) -> None:
        Base.metadata.drop_all(self.engine)
        Base.metadata.create_all(self.engine)

    def seed(self) -> None:
        self.reset()
        self._seed_demo_data()

    def initialize(self) -> None:
        self.init_db()
        with self.session() as session:
            has_users = session.scalar(select(UserRow.id).limit(1)) is not None
        if not has_users:
            self._seed_demo_data()

    def _seed_demo_data(self) -> None:
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
        with self.session() as session:
            users = {row.username: row for row in session.scalars(select(UserRow)).all()}
            for username, mode, score, age in seed_scores:
                user = users[username]
                session.add(
                    ScoreRow(
                        id=uid("s"),
                        user_id=user.id,
                        username=user.username,
                        mode=mode.value,
                        score=score,
                        created_at=base - age,
                    )
                )

        neon = self._user_by_username("neon")
        pixel = self._user_by_username("pixel")
        self.create_live_game(neon, GameMode.walls, demo_snapshot(GameMode.walls))
        self.create_live_game(pixel, GameMode.wrap, demo_snapshot(GameMode.wrap))

    def _user_by_username(self, username: str) -> User:
        with self.session() as session:
            row = session.scalar(select(UserRow).where(UserRow.username == username))
            if row is None:
                raise HTTPException(status_code=404, detail="User not found")
            return user_from_row(row)

    def create_user(self, username: str, password: str) -> User:
        user = UserRow(id=uid("u"), username=username, password_hash=hash_password(password))
        with self.session() as session:
            session.add(user)
            try:
                session.flush()
            except IntegrityError as exc:
                raise HTTPException(status_code=409, detail="Username already taken") from exc
            return user_from_row(user)

    def authenticate(self, username: str, password: str) -> User:
        with self.session() as session:
            user = session.scalar(select(UserRow).where(UserRow.username == username))
            if not user or not verify_password(password, user.password_hash):
                raise HTTPException(status_code=401, detail="Invalid credentials")
            return user_from_row(user)

    def create_session(self, user: User) -> str:
        token = create_token()
        with self.session() as session:
            session.add(SessionRow(token=token, user_id=user.id))
        return token

    def delete_session(self, token: str) -> None:
        with self.session() as session:
            session.execute(delete(SessionRow).where(SessionRow.token == token))

    def user_for_token(self, token: str) -> User:
        with self.session() as session:
            session_row = session.scalar(select(SessionRow).where(SessionRow.token == token))
            if session_row is None:
                raise HTTPException(status_code=401, detail="Not signed in")
            user = session.get(UserRow, session_row.user_id)
            if user is None:
                raise HTTPException(status_code=401, detail="Not signed in")
            return user_from_row(user)

    def top_scores(self, mode: GameMode, limit: int) -> list[Score]:
        statement = (
            select(ScoreRow)
            .where(ScoreRow.mode == mode.value)
            .order_by(ScoreRow.score.desc(), ScoreRow.created_at.asc())
            .limit(limit)
        )
        with self.session() as session:
            return [score_from_row(row) for row in session.scalars(statement)]

    def add_score(self, user: User, mode: GameMode, score: int) -> Score:
        created = ScoreRow(
            id=uid("s"),
            user_id=user.id,
            username=user.username,
            mode=mode.value,
            score=score,
            created_at=now_ms(),
        )
        with self.session() as session:
            session.add(created)
            session.flush()
            return score_from_row(created)

    def active_games(self) -> list[LiveGame]:
        statement = select(LiveGameRow).where(LiveGameRow.active.is_(True)).order_by(LiveGameRow.started_at.asc())
        with self.session() as session:
            return [game_from_row(row) for row in session.scalars(statement)]

    def maybe_get_game(self, game_id: str) -> LiveGame | None:
        with self.session() as session:
            row = session.get(LiveGameRow, game_id)
            return game_from_row(row) if row is not None else None

    def get_game(self, game_id: str) -> LiveGame:
        game = self.maybe_get_game(game_id)
        if game is None:
            raise HTTPException(status_code=404, detail="Live game not found")
        return game

    def create_live_game(self, user: User, mode: GameMode, snapshot: GameSnapshot) -> LiveGame:
        game = LiveGameRow(
            id=uid("g"),
            user_id=user.id,
            username=user.username,
            mode=mode.value,
            started_at=now_ms(),
            snapshot=snapshot.model_dump(mode="json"),
            active=True,
        )
        with self.session() as session:
            session.add(game)
            session.flush()
            return game_from_row(game)

    def update_snapshot(self, game_id: str, user: User, snapshot: GameSnapshot) -> None:
        with self.session() as session:
            game = self._get_game_row(session, game_id)
            self.ensure_owner(game_from_row(game), user)
            game.snapshot = snapshot.model_dump(mode="json")

    def end_game(self, game_id: str, user: User, final_score: int) -> None:
        with self.session() as session:
            game = self._get_game_row(session, game_id)
            self.ensure_owner(game_from_row(game), user)
            final_snapshot = GameSnapshot.model_validate(game.snapshot).model_copy(update={"score": final_score, "over": True})
            game.active = False
            game.snapshot = final_snapshot.model_dump(mode="json")
            session.add(
                ScoreRow(
                    id=uid("s"),
                    user_id=user.id,
                    username=user.username,
                    mode=game.mode,
                    score=final_score,
                    created_at=now_ms(),
                )
            )

    @staticmethod
    def _get_game_row(session: Session, game_id: str) -> LiveGameRow:
        game = session.get(LiveGameRow, game_id)
        if game is None:
            raise HTTPException(status_code=404, detail="Live game not found")
        return game

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


store = DatabaseStore()
