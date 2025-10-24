# ---------- Build stage ----------
FROM node:20-bookworm-slim AS build
WORKDIR /app

ENV NODE_OPTIONS=--max-old-space-size=1024     NPM_CONFIG_FUND=false     NPM_CONFIG_AUDIT=false

COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY . .
RUN npm run build

# ---------- Runtime stage ----------
FROM node:20-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production DATA_DIR=/data

COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev

COPY --from=build /app/dist ./dist
COPY server.js ./server.js

EXPOSE 80
VOLUME ["/data"]
CMD ["node","server.js"]
