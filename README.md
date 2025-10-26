# PepTrackr (Docker, Portainer-ready)

- Frontend: React + Vite, dark theme, bottom nav, PK/Step toggle styled, version chip, bulk shot add.
- Backend: Express + Prisma + Postgres with presets (Retatrutide, Tirzepatide), absorption half-life field, bulk shot API.
- Docker: cache-busting & no-cache rules to avoid stale UI; healthchecks disabled.

## Run
docker compose up -d --build
Open http://localhost:8085

## Force fresh build
Bump these in docker-compose.yml (web service):
- image tag
- BUILD_VERSION
- CACHE_BUSTER
