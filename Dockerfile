# Build client
FROM node:20-alpine AS client
WORKDIR /app/client
COPY client/package.json ./
# Use npm install (no lockfile needed)
RUN npm install --no-audit --no-fund
COPY client ./
RUN npm run build

# Server
FROM node:20-alpine
WORKDIR /app/server
RUN apk add --no-cache curl
ENV NODE_ENV=production
ENV PORT=8080
COPY server/package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY server ./
# Bring in prebuilt client to ./public
COPY --from=client /app/client/dist ./public
EXPOSE 8080
CMD ["node", "index.js"]
