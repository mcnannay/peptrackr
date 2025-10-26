# ---------- BUILD ----------
FROM node:20-bullseye-slim AS build
WORKDIR /app

# Cache-busting + visible version in UI
ARG BUILD_VERSION=portainer-305
ARG CACHE_BUSTER=305
ENV VITE_APP_VERSION=$BUILD_VERSION
RUN echo "BUILD_VERSION=$BUILD_VERSION" > /build-version.txt
RUN echo "CACHE_BUSTER=$CACHE_BUSTER" > /cache-buster.txt

# Copy manifests (lockfile will be included if present)
COPY package*.json ./

# Make npm resilient
RUN npm set legacy-peer-deps true  && npm set fund false  && npm set audit false  && npm set progress=false  && npm set fetch-retries 5  && npm set fetch-retry-factor 2  && npm set fetch-retry-maxtimeout 120000  && npm set fetch-timeout 120000

# Install deps: ci if lockfile, else install (do NOT omit optional)
RUN if [ -f package-lock.json ]; then        echo "Using npm ci (lockfile found)";        npm ci --no-audit --no-fund;     else        echo "No lockfile found; using npm install";        npm install --no-audit --no-fund;     fi

# Build
COPY . .
RUN npm run build

# ---------- RUNTIME ----------
FROM nginx:1.27-alpine
RUN apk add --no-cache curl

RUN rm -rf /usr/share/nginx/html/*
COPY --from=build /app/dist /usr/share/nginx/html
COPY --from=build /build-version.txt /usr/share/nginx/html/__build.txt

COPY nginx/nginx.conf /etc/nginx/nginx.conf
RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
