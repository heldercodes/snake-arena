from fastapi import APIRouter, Depends, Response

from app.auth import clear_auth_cookie, set_auth_headers, token_from_request
from app.dependencies import current_user
from app.models import AuthCredentials, User
from app.store import store

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/signup", response_model=User, status_code=201)
async def signup(credentials: AuthCredentials, response: Response) -> User:
    user = store.create_user(credentials.username, credentials.password)
    token = store.create_session(user)
    set_auth_headers(response, token)
    return user


@router.post("/login", response_model=User)
async def login(credentials: AuthCredentials, response: Response) -> User:
    user = store.authenticate(credentials.username, credentials.password)
    token = store.create_session(user)
    set_auth_headers(response, token)
    return user


@router.post("/logout", status_code=204)
async def logout(token: str = Depends(token_from_request)) -> Response:
    store.delete_session(token)
    response = Response(status_code=204)
    clear_auth_cookie(response)
    return response


@router.get("/me", response_model=User)
async def me(user: User = Depends(current_user)) -> User:
    return user
