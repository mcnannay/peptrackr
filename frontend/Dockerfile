# --- Build stage ---
FROM node:20-alpine AS build
WORKDIR /app

# Cache dependencies
COPY package*.json ./
RUN npm ci --no-audit --no-fund

# Copy source and build
COPY . .
# Add a cache-busting build arg (Portainer will pass a new value)
ARG BUILD_VERSION=dev
# Provide the version to Vite (no .env files needed)
ENV VITE_APP_VERSION=$BUILD_VERSION
RUN npm run build

# --- Runtime stage ---
FROM nginx:1.27-alpine
RUN apk add --no-cache curl
# clean target (defensive)
RUN rm -rf /usr/share/nginx/html/*
COPY --from=build /app/dist /usr/share/nginx/html

# Master and site config
COPY nginx/nginx.conf /etc/nginx/nginx.conf
RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
