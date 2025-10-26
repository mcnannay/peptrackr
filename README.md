# PepTrackr (SQLite + Server Sync-Poll) — Internal 8080, Host 8085

- Server persists to `/data/app.db` (Docker named volume `peptrackr_data`).
- Client syncs via write-through **and** 5s poll+reconcile, so importing a JSON backup on one device propagates to others.
- INTERNAL PORT is **8080**. docker-compose maps host **8085 → 8080**.

## Build & Run
```bash
sudo docker build --no-cache -t peptrackr-sqlite-syncpoll .
sudo docker run -d --name peptrackr -p 8085:8080 -v peptrackr_data:/data peptrackr-sqlite-syncpoll
# open http://localhost:8085
sudo docker logs -f peptrackr
```

## Compose
```yaml
services:
  peptrackr:
    build: .
    container_name: peptrackr
    ports: ["8085:8080"]
    environment: ["DATA_DIR=/data"]
    volumes: ["peptrackr_data:/data"]
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:8080/health"]
      interval: 20s
      timeout: 5s
      retries: 5
      start_period: 20s
volumes:
  peptrackr_data:
```

## Verify server-side storage
```bash
curl http://localhost:8085/api/storage/all
sudo docker exec -it peptrackr sh -lc 'ls -l /data && sqlite3 /data/app.db ".tables" && sqlite3 /data/app.db "select count(*) from kv"'
```

## Notes
- Sync-poll model ensures uploads/imports that bypass `setItem` still get pushed (bulk debounce + on-hide beacon) and pulled (5s interval).
- If you serve behind a reverse proxy with a path prefix, change fetch URLs to relative (`"api/storage"`) or prepend your base path.
