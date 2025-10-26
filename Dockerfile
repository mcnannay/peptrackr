# Build client
FROM node:20-alpine AS client
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm install --no-audit --no-fund
COPY client ./
RUN npm run build

# Server
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
ENV DATA_DIR=/data
RUN apk add --no-cache curl
COPY server/package.json server/package-lock.json ./server/
WORKDIR /app/server
RUN npm install --omit=dev --no-audit --no-fund
COPY server ./
# copy client build
COPY --from=client /app/client/dist ../client_dist
EXPOSE 8080
CMD ["node", "index.js"]
