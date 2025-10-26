
FROM node:20-alpine

# System deps that sometimes help with native modules (kept minimal)
RUN apk add --no-cache python3 make g++

WORKDIR /app
COPY package*.json ./
# Avoid peer dep conflicts in constrained builders (Portainer, older npm proxies)
RUN npm config set legacy-peer-deps true \
 && npm config set fund false \
 && npm config set audit false \
 && npm install

COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src

ENV NODE_ENV=production
ENV PORT=8086

# Prisma migrate, fallback to db push if no migrations are present
CMD (npx prisma migrate deploy || npx prisma db push) && node src/server.js
