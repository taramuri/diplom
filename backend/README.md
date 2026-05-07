# SynthDetect Backend

REST API для системи виявлення синтетичних зображень.

## Стек

- Node.js 20 + Express + TypeScript (strict mode)
- Sequelize ORM + PostgreSQL 16
- JWT auth + bcrypt
- Multer (upload), Winston (логи), Joi (валідація)
- Jest + Supertest для тестів

## Швидкий старт

1. Підняти PostgreSQL (з кореня проєкту):

   ```bash
   docker compose up -d
   ```

2. Залежності:

   ```bash
   npm install
   ```

3. Налаштувати env:

   ```bash
   cp .env.example .env
   ```

   У `.env` вже є робочі дефолти для локальної розробки. JWT_SECRET у production
   обовʼязково замінити на довгий випадковий рядок.

4. Міграції:

   ```bash
   npm run migrate
   ```

5. Запустити dev-сервер з hot reload:

   ```bash
   npm run dev
   ```

Сервер на `http://localhost:3000`. Health-check: `GET /health`.

## API

### Реалізовано

- `POST /api/auth/register` — { email, password } → { user, token }
- `POST /api/auth/login` — { email, password } → { user, token }
- `GET  /api/auth/me` — Bearer token → { user }

### TODO (наступні етапи)

- `POST /api/analyze` — multipart upload зображення → виклик ML-сервісу
- `GET  /api/analyze/:id` — деталі та теплова карта
- `GET  /api/history` — пагінований список аналізів користувача

## Перевірка вручну (curl)

```bash
# Реєстрація
curl -X POST http://localhost:3000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"password123"}'

# Логін (зберегти token у TOKEN)
curl -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"password123"}'

# Профіль
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

## Структура

```
src/
├── config/         Sequelize конфіг (TS + CommonJS для CLI)
├── models/         Sequelize моделі та зв`язки
├── controllers/    обробники запитів
├── routes/         реєстрація endpoints
├── middleware/     auth, validation, error handling
└── utils/          logger, jwt, password helpers
migrations/         Sequelize міграції БД
```
