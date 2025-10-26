# Build with Node, serve with Nginx
FROM node:20-alpine AS build
WORKDIR /app

ARG VITE_API_BASE=http://localhost:8080
ENV VITE_API_BASE=${VITE_API_BASE}

# Copy manifest files (works even if no lockfile is present)
COPY package*.json ./

# Install deps (npm ci if lockfile exists, otherwise npm i)
RUN if [ -f package-lock.json ]; then npm ci; else npm i; fi

# Copy the rest and build
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
