from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse

from app.routers import auth, live, scores
from app.store import store


def create_app() -> FastAPI:
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
    async def docs_redirect() -> RedirectResponse:
        return RedirectResponse(url="/api/docs")

    app.include_router(auth.router, prefix="/api")
    app.include_router(scores.router, prefix="/api")
    app.include_router(live.router, prefix="/api")

    return app


store.seed()
app = create_app()
