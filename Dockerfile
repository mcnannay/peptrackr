# ---------- Builder: install deps & build client ----------
FROM node:20-bullseye AS builder
# Tools for native modules (node-gyp)
RUN apt-get update && apt-get install -y --no-install-recommends     python3 build-essential git ca-certificates &&     rm -rf /var/lib/apt/lists/*

WORKDIR /app/client

# Copy client first and install with npm only (tolerant flags)
COPY client/ ./
RUN npm install --no-audit --no-fund --legacy-peer-deps --unsafe-perm

# Ensure a build command exists; if not, try vite directly
# 1) Try package.json "build", else 2) npx vite build (install vite if missing)
RUN npm run build || (npx --yes vite --version >/dev/null 2>&1 || npm install -D vite@5) && npx --yes vite build

# ---------- Runtime: tiny server with persistent storage ----------
FROM node:20-bullseye
ENV NODE_ENV=production
WORKDIR /app

# Server deps (Express + lowdb)
COPY server/package.json ./server/package.json
RUN cd server && npm install --omit=dev --no-audit --no-fund

# App code + built client
COPY server/ ./server/
COPY --from=builder /app/client/dist/ ./server/public/

# Persistent data
VOLUME ["/data"]
ENV DATA_DIR=/data
ENV PORT=8080

EXPOSE 8080
CMD ["node", "server/index.js"]
