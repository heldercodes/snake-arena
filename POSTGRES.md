# Running Snake Arena with Postgres

The backend uses SQLAlchemy and reads `DATABASE_URL` from `backend/.env`.
When `DATABASE_URL` is not set, it falls back to SQLite. To run against
Postgres, set `DATABASE_URL` to a `postgresql+psycopg://...` URL.

## Prerequisites

- Docker Desktop, or another Docker runtime, running locally
- Backend dependencies synced with `uv`

```sh
cd backend
uv sync
```

## Start Postgres Locally

From the project root:

```sh
docker run --rm --name snake-arena-postgres \
  -e POSTGRES_USER=snake \
  -e POSTGRES_PASSWORD=snake \
  -e POSTGRES_DB=snake_arena \
  -p 5432:5432 \
  postgres:16
```

Leave this terminal running. Postgres is available on:

```text
postgresql+psycopg://snake:snake@localhost:5432/snake_arena
```

## Optional: Persist Data After Removing the Container

The command above stores Postgres data inside the container. If you remove the
container, that data is removed too. To keep the database data after deleting
or recreating the container, use a Docker volume.

Create a named volume:

```sh
docker volume create snake-arena-postgres-data
```

Start Postgres with that volume mounted at Postgres' data directory:

```sh
docker run --rm --name snake-arena-postgres \
  -e POSTGRES_USER=snake \
  -e POSTGRES_PASSWORD=snake \
  -e POSTGRES_DB=snake_arena \
  -p 5432:5432 \
  -v snake-arena-postgres-data:/var/lib/postgresql/data \
  postgres:16
```

When you stop or remove the container, the data remains in the
`snake-arena-postgres-data` volume. To start Postgres again with the same data,
run the same command with the same `-v` value.

List Docker volumes:

```sh
docker volume ls
```

Only remove the volume if you intentionally want to wipe the database:

```sh
docker volume rm snake-arena-postgres-data
```

## Configure the Backend

Create or update `backend/.env`:

```sh
DATABASE_URL=postgresql+psycopg://snake:snake@localhost:5432/snake_arena
```

The `+psycopg` part tells SQLAlchemy to use the Postgres driver installed in
the backend dependencies.

## Initialize and Run the App

In a second terminal, from the project root:

```sh
cd backend
uv run python -c "from app.store import DatabaseStore; DatabaseStore().initialize()"
uv run uvicorn app.main:app --reload --port 8000
```

Open the backend API docs:

```text
http://127.0.0.1:8000/api/docs
```

Seeded demo users are created automatically when the database is empty:

```text
username: neon
password: demo
```

Other seeded usernames are `pixel` and `viper`, also with password `demo`.

## Run the Full Local App

After Postgres is running and `backend/.env` is configured:

```sh
make install
make dev
```

The backend runs on `http://127.0.0.1:8000/`. The frontend dev server prints
its local URL in the terminal.

## Verify Postgres Is Being Used

Run the backend test suite with the Postgres URL:

```sh
cd backend
DATABASE_URL=postgresql+psycopg://snake:snake@localhost:5432/snake_arena uv run pytest
```

You can also check the API health endpoint while the backend is running:

```sh
curl http://127.0.0.1:8000/api/health
```

## Running the Docker App with Local Postgres

If the app itself is running inside Docker and Postgres is running on your
host machine, pass `DATABASE_URL` with `host.docker.internal`:

```sh
docker build -t snake-arena .
docker run --rm -p 8000:8000 \
  -e DATABASE_URL=postgresql+psycopg://snake:snake@host.docker.internal:5432/snake_arena \
  snake-arena
```

Then open:

```text
http://127.0.0.1:8000/
```

## Stop Postgres

If Postgres is running in the foreground, press `Ctrl+C`.

If it is running detached:

```sh
docker stop snake-arena-postgres
```
