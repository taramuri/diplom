# SynthDetect Frontend

React 18 + TypeScript SPA для виявлення синтетичних зображень.

## Стек

- React 18 + TypeScript (strict)
- Vite (швидка збірка + HMR)
- TailwindCSS 3 (utility-first)
- React Router 6
- Axios з auth interceptor

## Запуск

Перед запуском фронту переконайся що працюють:
- Backend на `http://localhost:3000`
- ML-сервіс на `http://localhost:8000`

```bash
cd frontend
npm install
npm run dev
```

Відкривається на `http://localhost:5173`. Vite автоматично проксує `/api/*`
на backend, тому CORS не парить.

## Структура

```
src/
├── api/           axios клієнт + ендпоінти (auth, analyze, history)
├── components/    UI компоненти (Header, UploadZone, ResultCard, ...)
├── context/       AuthContext — стан користувача в localStorage
├── pages/         сторінки маршрутів
├── types/         TS типи (User, Analysis, ...)
├── utils/         форматування (probability, date)
├── App.tsx        роути
├── main.tsx       entry point
└── index.css      Tailwind imports
```

## Маршрути

| URL | Сторінка | Авторизація |
|---|---|---|
| `/login` | Вхід | Публічна |
| `/register` | Реєстрація | Публічна |
| `/` | Dashboard (upload + результат) | Захищена |
| `/history` | Історія аналізів | Захищена |
| `*` | 404 | — |

## Збірка для production

```bash
npm run build
# готовий статичний бандл у dist/
```

## Налаштування кольорів

Основний бордовий колір (#5e3c50) — з твоєї презентації.
Налаштовується у `tailwind.config.js` → `theme.extend.colors.primary`.
