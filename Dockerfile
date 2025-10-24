# ---------- Build stage ----------
FROM node:20-slim AS build
WORKDIR /app

# Avoid OOM & noisy audits/funding during CI builds
ENV NODE_OPTIONS=--max-old-space-size=1024 \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_AUDIT=false

# Install deps first (better cache)
COPY package*.json ./
# Use npm ci if lock exists, else fallback to install
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Copy source and build
COPY . .
RUN npm run build

# ---------- Runtime stage ----------
FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production \
    DATA_DIR=/data

# Only production deps for the tiny express server
COPY package*.json ./
RUN npm install --omit=dev

# App bundle + server
COPY --from=build /app/dist ./dist
COPY server.js ./server.js

EXPOSE 80
VOLUME ["/data"]
CMD ["node", "server.js"]
