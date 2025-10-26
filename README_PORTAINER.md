# PepTrackr — Portainer Deploy (Unstick Build)

This repo is wired so Portainer always picks up your latest frontend when you BUMP the build arg.

## Deploy
1. In Portainer > Stacks, open your stack editor.
2. In `docker-compose.yml`, under `services.web.build.args`, set:
   ```yaml
   BUILD_VERSION: "portainer-100"
   ```
   Bump the number **every redeploy**: `"portainer-101"`, `"portainer-102"`, ...
3. Click **Deploy/Update the stack**.
4. Hard refresh your browser (Ctrl/Cmd + Shift + R). The version chip in the app header shows the exact string you set.

## Why this works
- The frontend build bakes `VITE_APP_VERSION` into the app (visible in the header).
- Changing `BUILD_VERSION` invalidates Docker’s cache, forcing a fresh Vite build.
- Nginx is configured not to cache `index.html`, so the SPA shell always fetches the fresh asset manifest.

## Notes
- Healthchecks are disabled in this compose so Portainer doesn't block deployment.
- No `.env` file is required; everything is in the compose/Dockerfiles.
