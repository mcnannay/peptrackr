# Build with Node, serve with Nginx
FROM node:20-alpine AS build
WORKDIR /app

ARG VITE_API_BASE=http://localhost:8080
ENV VITE_API_BASE=${VITE_API_BASE}

# Copy package files; do not rely on optional shells or redirections
COPY package.json ./
# Copy lockfile if present (won't fail if absent)
COPY package-lock.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm i; fi

# Copy the rest and build
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
