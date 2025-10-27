FROM node:20-slim as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-slim
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY server.js ./server.js
RUN npm install express
EXPOSE 8085
CMD ["node", "server.js"]
