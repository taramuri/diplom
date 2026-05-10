# Multi-stage не критичний бо backend невеликий, але робимо для чистоти
FROM node:20-alpine AS builder

WORKDIR /app

# Залежності (включно з dev для tsc)
COPY package*.json ./
COPY tsconfig.json ./
RUN npm ci --no-audit --no-fund

# Код
COPY src ./src
COPY migrations ./migrations
COPY .sequelizerc ./

# Компіляція TS → dist/
RUN npm run build


# ============= Production image =============
FROM node:20-alpine

WORKDIR /app

# Системні утиліти для healthcheck
RUN apk add --no-cache wget

# Тільки production залежності
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

# Скомпільований код + конфіги
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/config/database.cjs ./src/config/database.cjs
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/.sequelizerc ./.sequelizerc

# Папка для аплоадів (volume mount)
RUN mkdir -p /app/uploads

# Entrypoint скрипт — міграції + старт
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:3000/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
