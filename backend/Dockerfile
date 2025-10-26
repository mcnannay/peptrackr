FROM node:20-bullseye-slim

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates curl \ 
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma

RUN npm config set legacy-peer-deps true \ 
 && npm config set fund false \ 
 && npm config set audit false \ 
 && npm install

COPY src ./src

RUN npx prisma generate

ENV NODE_ENV=production
ENV PORT=8086

CMD npx prisma db push && node src/server.js
