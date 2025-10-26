# ---------- Builder: install deps & build client ----------
FROM node:20-bullseye AS builder
RUN apt-get update && apt-get install -y --no-install-recommends     python3 build-essential git ca-certificates &&     rm -rf /var/lib/apt/lists/*

WORKDIR /app/client
COPY client/ ./
# Tolerant npm install; then build with vite explicitly
RUN npm install --no-audit --no-fund --legacy-peer-deps --unsafe-perm
RUN npm install -D vite@5 --no-audit --no-fund
RUN npx vite build

# ---------- Runtime: server with SQLite persistence ----------
FROM node:20-bullseye
ENV NODE_ENV=production
WORKDIR /app

# Install toolchain for sqlite3 native build before npm install
RUN apt-get update && apt-get install -y --no-install-recommends     python3 build-essential ca-certificates &&     rm -rf /var/lib/apt/lists/*

# Server deps and code
COPY server/package.json ./server/package.json
RUN cd server && npm install --omit=dev --no-audit --no-fund
COPY server/ ./server/

# Built client
COPY --from=builder /app/client/dist/ ./server/public/

# Persistent data
VOLUME ["/data"]
ENV DATA_DIR=/data
ENV PORT=8085

EXPOSE 8085
CMD ["node", "server/index.js"]
