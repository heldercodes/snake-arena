from fastapi import Depends

from app.auth import token_from_request
from app.models import User
from app.store import store


def current_user(token: str = Depends(token_from_request)) -> User:
    return store.user_for_token(token)
