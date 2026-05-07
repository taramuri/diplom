# SynthDetect

ПЗ для виявлення синтетичних зображень, згенерованих нейромережами.

**Дипломна робота** | КНУ ім. Тараса Шевченка | ФІТ | ІПЗ-44мс
**Виконала:** Тетяна Голуб
**Науковий керівник:** к.т.н., доц. Ксенія Духновська

## Архітектура

Мікросервісна система з трьох компонентів:

- **frontend/** — React + TypeScript SPA
- **backend/** — Node.js + Express + Sequelize REST API
- **ml-service/** — Python + FastAPI inference service з EfficientNet-B0

PostgreSQL для зберігання даних, Docker Compose для оркестрації.

## Швидкий старт

```bash
# 1. Підняти БД
docker compose up -d

# 2. Backend
cd backend
cp .env.example .env
npm install
npm run migrate
npm run dev

# 3. ML-service (TODO)
# 4. Frontend (TODO)
```

## Структура

```
synthdetect/
├── frontend/          React + TS клієнт
├── backend/           Express API + Sequelize
├── ml-service/        FastAPI + PyTorch
├── ml-training/       Jupyter notebooks тренування
├── docs/              схема БД, API contract
├── docker-compose.yml
└── README.md
```

## Стек

| Шар | Технології |
|---|---|
| Frontend | React 18, TypeScript, Vite, TailwindCSS, Axios, React Router |
| Backend | Node.js 20, Express, TypeScript, Sequelize, JWT, Multer, Winston, Joi, Jest |
| БД | PostgreSQL 16 |
| ML | Python 3.11, FastAPI, PyTorch, pytorch-grad-cam |
| Інфра | Docker Compose, GitHub Actions |
