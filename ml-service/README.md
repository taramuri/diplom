# SynthDetect ML Service

FastAPI inference сервіс для виявлення синтетичних зображень.
Завантажує натреновану модель EfficientNet-B0 і повертає вердикт + Grad-CAM теплокарту.

## Стек

- Python 3.11
- FastAPI + Uvicorn
- PyTorch 2.x + torchvision
- pytorch-grad-cam (для теплокарт)
- OpenCV + Pillow для роботи із зображеннями
- pytest + httpx для тестів

## Структура

```
ml-service/
├── app/
│   ├── main.py          FastAPI додаток + endpoints
│   ├── config.py        налаштування через env
│   ├── schemas.py       Pydantic моделі запитів/відповідей
│   ├── model.py         завантаження моделі + inference
│   ├── preprocess.py    препроцесинг зображень
│   └── gradcam.py       генерація heatmap
├── tests/               pytest тести
├── models/              сюди кладеш .pth (gitignored)
├── requirements.txt
├── Dockerfile
├── .env.example
└── README.md
```

## Швидкий старт (локально)

1. Створи venv та став залежності:

   ```bash
   python -m venv .venv
   # Windows:
   .venv\Scripts\activate
   # Linux/Mac:
   source .venv/bin/activate

   pip install -r requirements.txt
   ```

2. Скопіюй env:

   ```bash
   cp .env.example .env
   ```

3. Поклади натреновану модель у `models/efficientnet_b0_synthdetect.pth`
   (отримуєш з ml-training/training_notebook.ipynb).

4. Запусти сервер:

   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

Сервіс на `http://localhost:8000`. Інтерактивна Swagger-документація: `http://localhost:8000/docs`.

## API

### `GET /health`

Перевірка стану. Використовується Docker healthcheck.

```json
{
  "status": "ok",
  "model_loaded": true,
  "model_version": "efficientnet_b0_v1.0",
  "device": "cpu"
}
```

### `POST /classify`

Класифікація зображення.

**Запит:** multipart/form-data, поле `file` — JPEG/PNG/WebP, до 10 MB.

**Відповідь:**

```json
{
  "verdict": "synthetic",
  "probability_synthetic": 0.873,
  "model_version": "efficientnet_b0_v1.0",
  "processing_time_ms": 142,
  "heatmap_png_base64": "iVBORw0KGgo..."
}
```

## Перевірка вручну (curl)

```bash
# Health
curl http://localhost:8000/health

# Класифікація
curl -X POST http://localhost:8000/classify \
  -F "file=@some_image.jpg" | python -m json.tool
```

## Тести

```bash
pip install -r requirements-dev.txt
pytest -v
```

## Docker

```bash
docker build -t synthdetect-ml .
docker run -p 8000:8000 -v $(pwd)/models:/app/models synthdetect-ml
```

Або в складі docker-compose з усім стеком (див. кореневий `docker-compose.yml`).

## Інтеграція з backend

Backend (Node.js) звертається до `POST /classify` через HTTP, передає завантажене
користувачем зображення як multipart, отримує JSON з вердиктом + base64 PNG
теплокарти, зберігає метадані в БД, повертає клієнту.
