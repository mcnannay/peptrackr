# ---- Build client ----
FROM node:20-bullseye AS builder
WORKDIR /app/client
COPY client/package.json client/package-lock.json* ./
RUN npm ci --no-audit --no-fund
COPY client/ ./
RUN npm run build

# ---- Runtime ----
FROM node:20-bullseye
ENV NODE_ENV=production
WORKDIR /app

# Install server deps
COPY server/package.json ./server/package.json
RUN cd server && npm install --omit=dev --no-audit --no-fund

# Copy server and built client
COPY server/ ./server/
COPY --from=builder /app/client/dist/ ./server/public/

# Create data dir for persistence
VOLUME ["/data"]
ENV DATA_DIR=/data
ENV PORT=8080

EXPOSE 8080
CMD ["node", "server/index.js"]
