
FROM node:20-alpine

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src

ENV NODE_ENV=production
ENV PORT=8086

# Run migrations at startup via entrypoint
CMD npx prisma migrate deploy && node src/server.js
