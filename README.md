# PepTrackr v17.5 — Portainer deploy with NO npm in Portainer

## What you do
1) Create a GitHub repo (e.g., `mcnannay/peptrackr`) and upload everything in this folder (keep `.github/workflows/docker.yml`).
2) Push to `main`. GitHub Actions builds and publishes to GHCR:
   - `ghcr.io/mcnannay/peptrackr:latest`
3) In Portainer → Stacks → Web editor, paste **docker-compose.web.yml** (or use Repository mode pointing to `docker-compose.yml`). This **pulls** the image; Portainer does **not** build or run npm.

## Portainer Web editor compose
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

If your GHCR package is private, add GHCR in Portainer Registries and deploy with those credentials.

Data persists in the Docker volume `peptrackr_data` at `/data` inside the container.
