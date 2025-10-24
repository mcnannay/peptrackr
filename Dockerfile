# ---------- Build stage ----------
FROM node:20-bookworm-slim AS build
WORKDIR /app

# Hardened npm defaults + avoid peer-deps issues
ENV NODE_OPTIONS=--max-old-space-size=1024 \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_AUDIT=false \
    NPM_CONFIG_LEGACY_PEER_DEPS=true \
    NPM_CONFIG_LOGLEVEL=warn \
    NPM_CONFIG_PROGRESS=false \
    NPM_CONFIG_TIMEOUT=60000

# Install deps first (cacheable). Ignore any lockfiles to avoid 'npm ci' strictness.
COPY package*.json ./
RUN rm -f package-lock.json npm-shrinkwrap.json \
 && npm cache clean --force \
 && npm install

# Copy source and build
COPY . .
RUN npm run build

# ---------- Runtime stage ----------
FROM node:20-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production \
    DATA_DIR=/data

# Copy built app + server + node_modules from build stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/server.js ./server.js

EXPOSE 80
VOLUME ["/data"]
CMD ["node", "server.js"]
