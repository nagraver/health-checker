
# 1) Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
# Use npm ci if lockfile exists, otherwise fall back to npm install
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
COPY . .
RUN npm run build

# 2) Nginx serve
FROM nginx:1.27-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
# Basic SPA config + proxy to backend at http://backend:8000
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
