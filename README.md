# PepTrackr v17.3 — npm-ci-free build
This version removes `npm ci` entirely to avoid lockfile mismatch issues in Portainer builds.

## Deploy with Portainer (Repository mode)
- Point the stack to this repo and use `docker-compose.yml` (has `build:`).
- Portainer will run `npm install` during the image build — no lockfile required.

## Deploy with Web editor (prebuilt image)
- Build & push once: `docker build -t ghcr.io/mcnannay/peptrackr:v17.3 . && docker push ghcr.io/mcnannay/peptrackr:v17.3`
- Use `docker-compose.web.yml` to pull the image.
