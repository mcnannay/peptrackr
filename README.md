# PepTrackr (Server-backed, Fixed API Prefix)

## Why this works behind any reverse proxy
- The API is mounted at an absolute path **/peptrackr-api** in the server.
- The client always calls **/peptrackr-api/...** (absolute), so it doesn't depend on where the app is mounted (/, /peptrackr/, etc.).
- Configure your reverse proxy to route **/peptrackr-api/** to the same container as the app.

## Build & Run (compose)
docker compose up -d --build
# open http://localhost:8085

## Direct docker
docker build -t peptrackr-test .
docker run -d --name peptrackr -p 8085:8080 -v peptrackr_data:/data peptrackr-test

## Reverse proxy (examples)

### nginx (subpath /peptrackr for UI + fixed API path)
location /peptrackr/ {
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
  rewrite ^/peptrackr/(.*)$ /$1 break;
  proxy_pass http://127.0.0.1:8085/;
}

location /peptrackr-api/ {
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
  proxy_pass http://127.0.0.1:8085/peptrackr-api/;
}

### Caddy
your.domain {
  handle_path /peptrackr/* {
    reverse_proxy 127.0.0.1:8085
  }
  handle_path /peptrackr-api/* {
    reverse_proxy 127.0.0.1:8085
  }
}

## API quick checks
curl http://localhost:8085/peptrackr-api/storage/all
docker exec -it peptrackr sh -lc 'cat /data/db.json'
