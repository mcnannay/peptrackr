# PepTrackr v17.4 — Pull-only deploy via Portainer

This repo ships with a GitHub Action that **builds & pushes** a Docker image to **GHCR** so Portainer never runs npm.
The app includes server-side persistence (/data) and multi-user support.

## Push to GitHub
1. Create repo (e.g. `mcnannay/peptrackr`), upload all files (keep `.github/workflows/docker.yml`).
2. Push to `main`. The Action builds & publishes:
   - `ghcr.io/mcnannay/peptrackr:latest`
   - `ghcr.io/mcnannay/peptrackr:v17.4`

## Portainer — Web editor (no build)
Paste `docker-compose.web.yml` or:
```yaml
version: "3.9"
services:
  peptrackr:
    image: ghcr.io/mcnannay/peptrackr:latest
    ports:
      - "8085:80"
    restart: unless-stopped
    volumes:
      - peptrackr_data:/data
volumes:
  peptrackr_data:
```
If GHCR is private, add a GHCR registry in Portainer and use your PAT.

## Portainer — Repository mode (still no build)
Use `docker-compose.yml` (pull-only). Portainer will just pull `ghcr.io/mcnannay/peptrackr:latest`.

## Local dev
```bash
npm install
npm run dev
```
