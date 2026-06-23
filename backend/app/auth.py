import hashlib
import hmac
import secrets
from dataclasses import dataclass

from fastapi import Cookie, Depends, Header, HTTPException, Response

SESSION_COOKIE = "snake_session"


@dataclass
class PasswordHash:
    salt: str
    digest: str

    def encode(self) -> str:
        return f"{self.salt}${self.digest}"

    @classmethod
    def decode(cls, value: str) -> "PasswordHash":
        salt, digest = value.split("$", 1)
        return cls(salt=salt, digest=digest)


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), 390_000).hex()
    return PasswordHash(salt=salt, digest=digest).encode()


def verify_password(password: str, encoded_hash: str) -> bool:
    try:
        parsed = PasswordHash.decode(encoded_hash)
    except ValueError:
        return False
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(parsed.salt), 390_000).hex()
    return hmac.compare_digest(digest, parsed.digest)


def create_token() -> str:
    return secrets.token_urlsafe(32)


def set_auth_headers(response: Response, token: str) -> None:
    response.set_cookie(
        SESSION_COOKIE,
        token,
        httponly=True,
        samesite="lax",
        secure=False,
        path="/",
    )
    response.headers["Authorization"] = f"Bearer {token}"
    response.headers["X-Auth-Token"] = token


def clear_auth_cookie(response: Response) -> None:
    response.delete_cookie(SESSION_COOKIE, path="/")


def token_from_request(
    authorization: str | None = Header(default=None),
    session_cookie: str | None = Cookie(default=None, alias=SESSION_COOKIE),
) -> str:
    if authorization:
        scheme, _, value = authorization.partition(" ")
        if scheme.lower() == "bearer" and value:
            return value
    if session_cookie:
        return session_cookie
    raise HTTPException(status_code=401, detail="Not signed in")


TokenDep = Depends(token_from_request)
