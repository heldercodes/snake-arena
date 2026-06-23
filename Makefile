.PHONY: install backend frontend dev docker-up docker-down backend-tests frontend-tests test

install:
	cd backend && uv sync
	cd frontend && npm install

backend:
	cd backend && uv run uvicorn app.main:app --reload --port 8000

frontend:
	cd frontend && npm run dev

dev:
	$(MAKE) -j2 backend frontend

docker-up:
	docker compose up --build

docker-down:
	docker compose down

backend-tests:
	cd backend && uv run pytest

frontend-tests:
	cd frontend && npm run test

test: backend-tests frontend-tests

test-integration:
	cd backend && uv run pytest tests_integration/
