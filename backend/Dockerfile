
FROM node:20-alpine

# System deps for native builds + openssl for Prisma
RUN apk add --no-cache python3 make g++ openssl

WORKDIR /app

# Copy manifests and Prisma schema first so npm install can see it if needed
COPY package*.json ./
COPY prisma ./prisma

# Avoid peer dep conflicts; install deps
RUN npm config set legacy-peer-deps true  && npm config set fund false  && npm config set audit false  && npm install

# Then copy source
COPY src ./src

ENV NODE_ENV=production
ENV PORT=8086

# Generate client now that deps are in place
RUN npx prisma generate

# Migrate or push schema on start
CMD (npx prisma migrate deploy || npx prisma db push) && node src/server.js
