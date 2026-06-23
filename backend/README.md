## Snake Arena Backend

FastAPI implementation of the root `openapi.yaml` contract.

Run it locally:

```sh
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

The server stores data with SQLAlchemy. It loads `DATABASE_URL` from
`backend/.env` by default, and falls back to a local SQLite file at
`sqlite:///./snake_arena.db` when the variable is not set. Point
`DATABASE_URL` at any SQLAlchemy-supported database URL:

```sh
DATABASE_URL=sqlite:///./snake_arena.db
```

Then open `http://localhost:8000/` or `http://localhost:8000/api/docs` for the
FastAPI interactive docs.

Run tests:

```sh
uv run pytest
```

Seeded demo users all use password `demo`: `neon`, `pixel`, and `viper`.
