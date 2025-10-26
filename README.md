# PepTrackr with Server-Side Storage (SQLite + Docker Volume)

This build keeps your original client and injects a *non-intrusive* storage shim:
- On load, it **hydrates** from the server (`/api/storage/all`) into `localStorage`.
- Every `localStorage.setItem` is **mirrored** to the server (`POST /api/storage`).
Storage is persisted in a Docker **named volume** at `/data/app.db` (SQLite file).

## Run locally with Docker
```bash
sudo docker build --no-cache -t peptrackr-sqlite .
sudo docker run -d --name peptrackr -p 8085:8085 -v peptrackr_data:/data peptrackr-sqlite
# open http://localhost:8085
sudo docker logs -f peptrackr
```

## With docker-compose (Portainer-friendly)
Point Portainer at this repo or use:
```yaml
services:
  peptrackr:
    build: .
    container_name: peptrackr
    ports: ["8085:8085"]
    environment: ["DATA_DIR=/data"]
    volumes: ["peptrackr_data:/data"]
    restart: unless-stopped

volumes:
  peptrackr_data:
```

## API
- `GET /api/storage/all` → returns all key/values
- `GET /api/storage/:key` → returns one
- `POST /api/storage` with `{ "key": "...", "value": <any JSON or string> }`

## Notes
- No edits to your React components were required; shim is loaded via `index.html` → `/storage-shim.js`.
- Data survives container restarts and is shared by all devices using the same server URL.
- DB lives in the Docker volume `peptrackr_data` as `/data/app.db`.
