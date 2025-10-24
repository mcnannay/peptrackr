# PepTrackr v17.2 — CI-built image for Portainer

This repo is set up to **build & publish** a Docker image to **GHCR** automatically on push to `main`. That means you can deploy in Portainer **without building locally**.

## How it works
- GitHub Actions (`.github/workflows/docker.yml`) builds the image using the Dockerfile and **pushes**:
  - `ghcr.io/mcnannay/peptrackr:latest`
  - `ghcr.io/mcnannay/peptrackr:v17.2` (matches package.json version)

## One-time repo settings
- Ensure **GHCR** is enabled for your account/org.
- Actions automatically has `GITHUB_TOKEN` with `packages:write` (permissions are set in the workflow).
- After the first push, your image appears at: `ghcr.io/mcnannay/peptrackr`.

## Deploy in Portainer (Web editor)
Paste this (or use `docker-compose.web.yml`):
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

If the registry is private, add a **GHCR registry** in Portainer (use a classic PAT or deploy key) and select it when deploying.

## Repository mode (Portainer can build)
If you prefer Repository mode and your node can access npm, use `docker-compose.yml` (includes `build:`).

## Dev locally
```bash
npm install
npm run dev
# or
docker compose up --build -d
```
