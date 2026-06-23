# Running Snake Arena with Docker

This project has a single Docker image that:

- builds the frontend static bundle
- installs the Python backend with `uv`
- copies the frontend static files into the backend image
- serves the API and frontend from the same FastAPI process

## Prerequisites

- Docker Desktop, or another Docker runtime, running locally
- Port `8000` available on your machine

## Build the Image

From the project root:

```bash
docker build -t snake-arena .
```

If you want to make sure Docker does not reuse an old frontend bundle:

```bash
docker build --no-cache -t snake-arena .
```

## Run the App

```bash
docker run --rm -p 8000:8000 snake-arena
```

Open the app in your browser:

```text
http://127.0.0.1:8000/
```

The API docs are available at:

```text
http://127.0.0.1:8000/api/docs
```

## Sign In

Seed demo accounts are available:

```text
username: neon
password: demo
```

Other seeded usernames include `pixel` and `viper`, also with password `demo`.

## Useful Checks

Health check:

```bash
curl http://127.0.0.1:8000/api/health
```

Login through the API:

```bash
curl -i \
  -X POST http://127.0.0.1:8000/api/auth/login \
  -H 'Content-Type: application/json' \
  --data '{"username":"neon","password":"demo"}'
```

## Stop the Container

If you ran it with `--rm` in the foreground, press `Ctrl+C`.

If you started it in detached mode, find and stop it:

```bash
docker ps
docker stop <container-id>
```

## Troubleshooting

If the browser still shows an old version after changes, rebuild without cache:

```bash
docker build --no-cache -t snake-arena .
```

If port `8000` is already in use, map a different local port:

```bash
docker run --rm -p 8001:8000 snake-arena
```

Then open:

```text
http://127.0.0.1:8001/
```

If Docker cannot connect to the daemon, make sure Docker Desktop is running before building or running the image.
