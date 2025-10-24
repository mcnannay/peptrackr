# PepTrackr v17.3.2 — no npm ci; resilient npm install
FROM node:20-bookworm-slim AS build
WORKDIR /app
ARG NO_CACHE_BUSTER
ENV NODE_OPTIONS=--max-old-space-size=1024     NPM_CONFIG_FUND=false     NPM_CONFIG_AUDIT=false     NPM_CONFIG_LEGACY_PEER_DEPS=true     NPM_CONFIG_LOGLEVEL=warn     NPM_CONFIG_PROGRESS=false     NPM_CONFIG_TIMEOUT=60000

RUN echo ">>> Using resilient build pipeline v17.3.2 (no npm ci)"

# Preconfigure npm and install deps
COPY package*.json ./
RUN npm config set legacy-peer-deps true  && npm config set registry https://registry.npmjs.org/  && rm -f package-lock.json npm-shrinkwrap.json  && for i in 1 2 3; do npm install && s=0 && break || s=$? && echo "npm install failed, retry $i/3" && sleep 3; done; (exit $s)

# Copy the rest and build
COPY . .
RUN npm run build

# Runtime image
FROM node:20-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production DATA_DIR=/data
# Copy built assets and node_modules from builder so runtime does NOT run npm
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/server.js ./server.js

EXPOSE 80
VOLUME ["/data"]
CMD ["node","server.js"]
