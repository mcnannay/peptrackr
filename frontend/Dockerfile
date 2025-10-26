
# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund
RUN npm config set legacy-peer-deps true \
 && npm config set fund false \
 && npm config set audit false \
 && npm install
COPY . .
ARG BUILD_VERSION=dev
ENV VITE_APP_VERSION=$BUILD_VERSION
RUN npm run build

# Serve with nginx and proxy /api to backend
FROM nginx:1.27-alpine
RUN apk add --no-cache curl
RUN rm -rf /usr/share/nginx/html/*
COPY --from=build /app/dist /usr/share/nginx/html
# expose build version inside image
RUN cp /build-version.txt /usr/share/nginx/html/__build.txt || true
COPY nginx/nginx.conf /etc/nginx/nginx.conf
RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
