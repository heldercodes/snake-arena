from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class AuthCredentials(StrictModel):
    username: str = Field(min_length=1)
    password: str = Field(min_length=1)


class User(StrictModel):
    id: str
    username: str


class GameMode(StrEnum):
    walls = "walls"
    wrap = "wrap"


class Point(StrictModel):
    x: int
    y: int


class GameSnapshot(StrictModel):
    size: int = Field(ge=1)
    snake: list[Point] = Field(min_length=1)
    food: Point
    dir: Point
    score: int = Field(ge=0)
    mode: GameMode
    over: bool


class LiveGame(StrictModel):
    id: str
    userId: str
    username: str
    mode: GameMode
    startedAt: int
    snapshot: GameSnapshot
    active: bool


class Score(StrictModel):
    id: str
    userId: str
    username: str
    mode: GameMode
    score: int = Field(ge=0)
    createdAt: int


class SubmitScoreRequest(StrictModel):
    mode: GameMode
    score: int = Field(ge=0)


class StartLiveGameRequest(StrictModel):
    mode: GameMode
    snapshot: GameSnapshot


class UpdateLiveGameSnapshotRequest(StrictModel):
    snapshot: GameSnapshot


class EndLiveGameRequest(StrictModel):
    finalScore: int = Field(ge=0)


class ErrorResponse(StrictModel):
    message: str
