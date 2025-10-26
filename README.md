# PepTrackr — Direct-to-Database Storage (No localStorage)

- INTERNAL PORT is **8080**. docker-compose maps **8085 → 8080** (keep this mapping).
- Client **does not persist** to browser storage. A facade replaces localStorage with an **in-memory** map.
- Server injects current DB into `window.__PEP_BOOT__` so the app starts with data synchronously.
- All writes go **straight to SQLite** via `/api/storage` or `/api/storage/bulk`.
- Data lives in the Docker volume `peptrackr_data` at `/data/app.db`.

## Build & Run
```bash
sudo docker build --no-cache -t peptrackr-directdb .
sudo docker run -d --name peptrackr -p 8085:8080 -v peptrackr_data:/data peptrackr-directdb
# http://localhost:8085
sudo docker logs -f peptrackr
```

## Verify
```bash
curl http://localhost:8085/api/storage/all
sudo docker exec -it peptrackr sh -lc 'ls -l /data && sqlite3 /data/app.db ".tables" && sqlite3 /data/app.db "select count(*) from kv"'
```

## Notes
- JSON backup imports are detected via FileReader hook; a full snapshot is pushed after import.
- If your app uses other persistence methods, the facade ensures compatibility without changing your components.
