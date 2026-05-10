#!/bin/sh
set -e

echo "→ Очікую готовності БД…"
until npx sequelize-cli db:migrate:status > /dev/null 2>&1; do
    echo "  БД ще не готова, чекаю 2с…"
    sleep 2
done

echo "→ Запуск міграцій…"
npx sequelize-cli db:migrate

echo "→ Старт сервера…"
exec node dist/index.js
