# New Web App Starter (Docker + Portainer-friendly)

A clean, minimal starter with:
- **Frontend:** Vite + React, built and served by Nginx
- **Backend:** FastAPI + SQLite (easily switch to Postgres)
- **Dockerized:** `docker-compose.yml` for local/prod; works great via Portainer (pull from GitHub)
- **Healthchecks:** `/health` endpoint
- **CORS:** configurable via `.env`

## Quick Start (Locally with Docker Compose)

```bash
cp .env.sample .env
docker compose up -d --build
```

- Web UI: http://localhost:3000
- API docs: http://localhost:8080/docs
- Health: http://localhost:8080/health

## Portainer Deployment (from GitHub)

1. Push this repo to your GitHub.
2. In Portainer → *Stacks* → **Add stack** → *Repository*.
3. Enter repo URL and set **Compose path** to `docker-compose.yml`.
4. Set any needed env vars in *Environment variables* (or mount a `.env`).
5. Deploy the stack.

## Environment Variables (`.env`)
Copy `.env.sample` to `.env` and adjust:

```
API_HOST=0.0.0.0
API_PORT=8080
DATABASE_URL=sqlite:///./data.db
CORS_ORIGINS=*
VITE_API_BASE=http://api:8080
```

> **Note:** `VITE_API_BASE` is compiled into the frontend at build time. The compose file passes it as a build arg to the frontend image.

## Switching to Postgres (optional)
1. Uncomment the `postgres` service in `docker-compose.yml`.
2. Set `DATABASE_URL=postgresql+psycopg://app:app@postgres:5432/appdb` in `.env`.
3. Rebuild and redeploy.

## Project Structure
```
.
├─ backend/               # FastAPI app
│  ├─ app/
│  │  ├─ main.py
│  │  ├─ db.py
│  │  ├─ models.py
│  │  ├─ schemas.py
│  │  └─ routers/
│  │     └─ todos.py
│  ├─ requirements.txt
│  └─ Dockerfile
├─ frontend/              # React + Vite
│  ├─ src/
│  │  ├─ App.jsx
│  │  ├─ main.jsx
│  │  └─ api.js
│  ├─ index.html
│  ├─ package.json
│  ├─ vite.config.js
│  └─ Dockerfile
├─ docker-compose.yml
├─ .env.sample
└─ README.md
```

## API Examples
- `GET /api/v1/todos` → list todos
- `POST /api/v1/todos` → create todo `{ "title": "Buy milk" }`
- `PATCH /api/v1/todos/{id}` → update partial
- `DELETE /api/v1/todos/{id}` → delete

## License
MIT
