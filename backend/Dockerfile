
FROM node:20-bullseye-slim

# System deps (openssl for Prisma). Avoid dev toolchain unless needed.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy manifests & prisma early
COPY package*.json ./
COPY prisma ./prisma

# npm config & install
RUN npm config set legacy-peer-deps true  && npm config set fund false  && npm config set audit false  && npm install --omit=dev

# Copy source
COPY src ./src

# Generate Prisma client
RUN npx prisma generate

ENV NODE_ENV=production
ENV PORT=8086

# Push schema (idempotent), then start server
CMD npx prisma db push && node src/server.js
