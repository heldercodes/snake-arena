# Running with Docker Compose

Docker Compose starts both services needed for the app:

- `postgres`, with data stored in the named `postgres-data` volume
- `app`, built from the root `Dockerfile`

## Start

From the project root:

```sh
make docker-up
```

This runs:

```sh
docker compose up --build
```

The app is available at:

```text
http://127.0.0.1:8000/
```

API docs are available at:

```text
http://127.0.0.1:8000/api/docs
```

## Stop

```sh
make docker-down
```

This stops and removes the containers, but keeps the Postgres volume so data
survives the next start.

## Reset the Database

Only run this when you intentionally want to delete local Postgres data:

```sh
docker compose down -v
```
