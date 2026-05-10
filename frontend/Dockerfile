# Stage 1: build з Node
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build


# Stage 2: serve з nginx
FROM nginx:alpine

# Копіюємо зібраний бандл
COPY --from=builder /app/dist /usr/share/nginx/html

# Кастомна nginx-конфігурація з SPA-рутингом + проксі /api → backend
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
