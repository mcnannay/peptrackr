FROM node:20-bullseye-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates   && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm set legacy-peer-deps true  && npm set fund false  && npm set audit false  && npm install

COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src

ENV NODE_ENV=production
ENV PORT=8086
EXPOSE 8086

CMD ["node", "src/server.js"]
