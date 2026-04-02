run:
	uvicorn app.main:app --reload --port 8000

run-fe:
	cd frontend && npm run dev

up:
	docker compose up --build