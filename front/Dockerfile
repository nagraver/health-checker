# === Этап 1: сборка фронта ===
FROM node:18-alpine AS build
WORKDIR /app
COPY . .
RUN npm install && npm run build

# === Этап 2: сервер nginx ===
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY ./nginx.conf /etc/nginx/conf.d/default.conf
