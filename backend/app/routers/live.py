import asyncio
import json
from collections.abc import AsyncIterator

from fastapi import APIRouter, Depends
from fastapi.responses import Response, StreamingResponse

from app.dependencies import current_user
from app.models import EndLiveGameRequest, GameMode, LiveGame, StartLiveGameRequest, UpdateLiveGameSnapshotRequest, User
from app.store import store

router = APIRouter(prefix="/live/games", tags=["Live Games"])


def sse_data(payload: object) -> str:
    return f"data: {json.dumps(payload)}\n\n"


async def pulse(payload_factory) -> AsyncIterator[str]:
    while True:
        yield sse_data(payload_factory())
        await asyncio.sleep(1)


@router.get("", response_model=list[LiveGame])
async def list_live_games() -> list[LiveGame]:
    return store.active_games()


@router.post("", response_model=LiveGame, status_code=201)
async def start_live_game(payload: StartLiveGameRequest, user: User = Depends(current_user)) -> LiveGame:
    return store.create_live_game(user, payload.mode, payload.snapshot)


@router.get("/stream")
async def subscribe_live_game_list() -> StreamingResponse:
    return StreamingResponse(
        pulse(lambda: [game.model_dump(mode="json") for game in store.active_games()]),
        media_type="text/event-stream",
    )


@router.get("/{gameId}", response_model=LiveGame)
async def get_live_game(gameId: str) -> LiveGame:
    return store.get_game(gameId)


@router.get("/{gameId}/stream")
async def subscribe_live_game(gameId: str) -> StreamingResponse:
    store.get_game(gameId)

    def payload() -> dict | None:
        game = store.maybe_get_game(gameId)
        return game.model_dump(mode="json") if game else None

    return StreamingResponse(pulse(payload), media_type="text/event-stream")


@router.put("/{gameId}/snapshot", status_code=204)
async def tick_live_game(
    gameId: str,
    payload: UpdateLiveGameSnapshotRequest,
    user: User = Depends(current_user),
) -> Response:
    store.update_snapshot(gameId, user, payload.snapshot)
    return Response(status_code=204)


@router.post("/{gameId}/end", status_code=204)
async def end_live_game(
    gameId: str,
    payload: EndLiveGameRequest,
    user: User = Depends(current_user),
) -> Response:
    store.end_game(gameId, user, payload.finalScore)
    return Response(status_code=204)
