from fastapi import APIRouter, Depends, Query

from app.dependencies import current_user
from app.models import GameMode, Score, SubmitScoreRequest, User
from app.store import store

router = APIRouter(prefix="/scores", tags=["Scores"])


@router.get("", response_model=list[Score])
async def top_scores(mode: GameMode, limit: int = Query(default=10, ge=1, le=100)) -> list[Score]:
    return store.top_scores(mode, limit)


@router.post("", response_model=Score, status_code=201)
async def submit_score(payload: SubmitScoreRequest, user: User = Depends(current_user)) -> Score:
    return store.add_score(user, payload.mode, payload.score)
