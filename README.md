
# PepTrackr

Mobile-first web app to track GLP-1 shots, weight, and visualize PK/step models. Dark theme by default.
No localStorage is used — all data is stored in PostgreSQL via an Express+Prisma API.

## Quick start

```bash
docker compose up -d --build
# App available on http://localhost:8085
```

- Only port **8085** is exposed (frontend). The backend (Express on 8086) is proxied at `/api` by nginx inside the `web` container.
- Database is PostgreSQL 16 in the `db` service.

## Default seed

On first boot, the backend seeds:
- One user named **You** (active)
- Preset meds: **Retatrutide** (t½=8d, q7d) and **Tirzepatide** (t½=5d, q7d)

## Backup/Restore
- Backup: `GET /api/backup` (returns JSON)
- Restore: `POST /api/restore` with a previously exported JSON body

## Notes
- Prisma schema lives in `backend/prisma/schema.prisma`.
- Nginx proxies `/api` → `backend:8086` on the Docker network so the browser only talks to `web:8085`.
