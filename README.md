# PepTrackr (server-backed storage)

This package converts the original local-only Vite app into a server-backed app with persistent storage.
It adds a tiny Express API that persists data to a JSON file mounted at `/data` inside the container.

## What changed
- **Client (`client/`)**: The `save()` helper now *writes through* to `/api/storage`. On first load, the app also **hydrates** from `/api/storage/all` so your data is restored from the server if you clear the browser.
- **Server (`server/`)**: Provides `GET /api/storage/all`, `GET /api/storage/:key`, `POST /api/storage` (
`{ key, value }`).
- **Docker**: A single-container image builds the Vite client and serves it via the Express server. A named volume keeps data on the server.

## Quick start (Portainer/GitHub)
1. Push this folder to your GitHub repo.
2. In Portainer, create a new **Stack** and point it at your repo (or paste the `docker-compose.yml`).
3. Deploy the stack.
4. Visit `http://<your-host>:8080` and use the app.

Data persists in the named volume `peptrackr_data`.

## Local dev
```bash
# Build and run
docker compose up -d --build
open http://localhost:8080
```

## Notes
- This approach keeps your existing UI/logic. It simply mirrors the app's `save()`s to the server and bootstraps from the server on load.
- If you ever need to back up or migrate data, copy the JSON file from the container volume (e.g., `/var/lib/docker/volumes/<stack>_peptrackr_data/_data/db.json`).
