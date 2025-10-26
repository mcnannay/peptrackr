
FROM node:20-alpine

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src

ENV NODE_ENV=production
ENV PORT=8086

# Run migrations at startup via entrypoint
CMD (npx prisma migrate deploy || npx prisma db push) && node src/server.js
