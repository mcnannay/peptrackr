# ---------- BUILD ----------
FROM node:20-alpine AS build
WORKDIR /app

# Cache-busting + visible version in UI
ARG BUILD_VERSION=dev
ARG CACHE_BUSTER=0
ENV VITE_APP_VERSION=$BUILD_VERSION
RUN echo "BUILD_VERSION=$BUILD_VERSION" > /build-version.txt
RUN echo "CACHE_BUSTER=$CACHE_BUSTER" > /cache-buster.txt

# Copy manifests (if lockfile exists, it will be included by the glob)
COPY package*.json ./

# Make npm tolerant in constrained builders (Portainer, proxies, peer deps)
RUN npm set legacy-peer-deps true \
 && npm set fund false \
 && npm set audit false \
 && npm set progress=false \
 && npm set fetch-retries 5 \
 && npm set fetch-retry-factor 2 \
 && npm set fetch-retry-maxtimeout 120000 \
 && npm set fetch-timeout 120000

# Install deps: prefer ci when lockfile is present; else safe install
RUN if [ -f package-lock.json ]; then \
       echo "Using npm ci (lockfile found)"; \
       npm ci --no-audit --no-fund --omit=optional; \
    else \
       echo "No lockfile found; using npm install"; \
       npm install --no-audit --no-fund --omit=optional; \
    fi

# Copy the rest and build
COPY . .
RUN npm run build

# ---------- RUNTIME ----------
FROM nginx:1.27-alpine
RUN apk add --no-cache curl

# Clean any existing content to avoid stale assets
RUN rm -rf /usr/share/nginx/html/*

# Copy fresh build + a readable build stamp
COPY --from=build /app/dist /usr/share/nginx/html
COPY --from=build /build-version.txt /usr/share/nginx/html/__build.txt

# Use custom nginx config (no-cache index.html; immutable assets; /api proxy)
COPY nginx/nginx.conf /etc/nginx/nginx.conf
RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
