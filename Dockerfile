# ---------- Builder: install deps & build client ----------
FROM node:20-bullseye AS builder
# Tools for native modules (node-gyp)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 build-essential git ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app/client

# Copy manifests first for better caching (support npm/yarn/pnpm)
COPY client/package.json ./
COPY client/package-lock.json ./ 2>/dev/null || true
COPY client/yarn.lock ./ 2>/dev/null || true
COPY client/pnpm-lock.yaml ./ 2>/dev/null || true

# Use the right package manager and be tolerant of lockfile/peer issues
RUN corepack enable || true && \
    if [ -f pnpm-lock.yaml ]; then \
      corepack pnpm install --frozen-lockfile || corepack pnpm install; \
    elif [ -f yarn.lock ]; then \
      corepack yarn install --frozen-lockfile || corepack yarn install; \
    elif [ -f package-lock.json ]; then \
      npm ci --no-audit --no-fund || npm install --no-audit --no-fund --legacy-peer-deps; \
    else \
      npm install --no-audit --no-fund --legacy-peer-deps; \
    fi

# Now bring in the rest of the client and build
COPY client/ ./ 
# If your build script is named differently, adjust this
RUN npm run build

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
