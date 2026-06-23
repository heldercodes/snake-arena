## Snake Arena Backend

FastAPI implementation of the root `openapi.yaml` contract.

Run it locally:

```sh
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

Then open `http://localhost:8000/` or `http://localhost:8000/api/docs` for the
FastAPI interactive docs.

Run tests:

```sh
uv run pytest
```

Seeded demo users all use password `demo`: `neon`, `pixel`, and `viper`.
