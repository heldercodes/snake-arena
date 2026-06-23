import os
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse, Response

from app.routers import auth, live, scores
from app.store import store


def frontend_static_dir() -> Path:
    return Path(os.getenv("FRONTEND_STATIC_DIR", Path(__file__).resolve().parent.parent / "static"))


def frontend_index(static_dir: Path) -> Path | None:
    index_path = static_dir / "index.html"
    return index_path if index_path.is_file() else None


def frontend_file(static_dir: Path, path: str) -> Path | None:
    requested_path = (static_dir / path).resolve()
    static_root = static_dir.resolve()

    if not requested_path.is_relative_to(static_root) or not requested_path.is_file():
        return None

    return requested_path


def create_app() -> FastAPI:
    static_dir = frontend_static_dir()

    app = FastAPI(
        title="Snake Arena API",
        version="1.0.0",
        openapi_url="/api/openapi.json",
        docs_url="/api/docs",
        redoc_url="/api/redoc",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.exception_handler(HTTPException)
    async def http_exception_handler(_: Request, exc: HTTPException) -> JSONResponse:
        message = exc.detail if isinstance(exc.detail, str) else "Request failed"
        return JSONResponse(status_code=exc.status_code, content={"message": message}, headers=exc.headers)

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(_: Request, __: RequestValidationError) -> JSONResponse:
        return JSONResponse(status_code=400, content={"message": "Invalid request data"})

    @app.get("/api/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/", include_in_schema=False)
    async def root() -> Response:
        if index_path := frontend_index(static_dir):
            return FileResponse(index_path)

        return RedirectResponse(url="/api/docs")

    app.include_router(auth.router, prefix="/api")
    app.include_router(scores.router, prefix="/api")
    app.include_router(live.router, prefix="/api")

    @app.get("/{path:path}", include_in_schema=False)
    async def frontend(path: str) -> Response:
        if path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not found")

        if file_path := frontend_file(static_dir, path):
            return FileResponse(file_path)

        if index_path := frontend_index(static_dir):
            return FileResponse(index_path)

        raise HTTPException(status_code=404, detail="Not found")

    return app


store.initialize()
app = create_app()
