# PepTrackr (Server-backed, Reverse-Proxy Safe)

- Client uses **relative API URLs** via `apiUrl('api/...')`, so it works at `/` or any sub-path (e.g., `/peptrackr/`).
- Hydrates from server on load; hooks all `localStorage.setItem` to POST changes to the server.
- Server persists to `/data/db.json` (via Docker volume).
- Exposes container port **8080**; compose maps **8085:8080**.

## Build & Run (compose)
docker compose up -d --build
# open http://localhost:8085

## Direct docker
docker build -t peptrackr-test .
docker run -d --name peptrackr -p 8085:8080 -v peptrackr_data:/data peptrackr-test

## API quick checks
curl http://localhost:8085/api/storage/all
docker exec -it peptrackr sh -lc 'cat /data/db.json'
