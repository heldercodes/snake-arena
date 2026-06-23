## Snake Arena Backend

FastAPI implementation of the root `openapi.yaml` contract.

Run it locally:

```sh
uv sync
uv run uvicorn main:app --reload
```

Run tests:

```sh
uv run pytest
```

Seeded demo users all use password `demo`: `neon`, `pixel`, and `viper`.
