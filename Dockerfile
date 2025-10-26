# ---------- Builder: install deps & build client ----------
FROM node:20-bullseye AS builder
RUN apt-get update && apt-get install -y --no-install-recommends     python3 build-essential git ca-certificates &&     rm -rf /var/lib/apt/lists/*

WORKDIR /app/client
COPY client/ ./
RUN npm install --no-audit --no-fund --legacy-peer-deps --unsafe-perm
RUN npm install -D vite@5 --no-audit --no-fund
RUN npx vite build

# ---------- Runtime: server with SQLite persistence ----------
FROM node:20-bullseye
ENV NODE_ENV=production
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends     python3 build-essential ca-certificates sqlite3 &&     rm -rf /var/lib/apt/lists/*

COPY server/package.json ./server/package.json
RUN cd server && npm install --omit=dev --no-audit --no-fund
COPY server/ ./server/
COPY --from=builder /app/client/dist/ ./server/public/

VOLUME ["/data"]
ENV DATA_DIR=/data
ENV PORT=8080  # INTERNAL PORT MUST BE 8080
EXPOSE 8080

CMD ["node", "server/index.js"]
