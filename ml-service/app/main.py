"""FastAPI app — ensemble inference endpoint."""
import io
import logging
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, File, HTTPException, UploadFile
from PIL import Image

from .config import settings
from .model import ModelService
from .schemas import ClassifyResponse, HealthResponse

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
)
logger = logging.getLogger(__name__)


state = {'model_service': None}


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Запускаю ML-сервіс…")
    state['model_service'] = ModelService()
    logger.info("✓ ML-сервіс готовий")
    yield
    logger.info("Завершення роботи")


app = FastAPI(
    title='SynthDetect ML Service',
    description='Ансамбль детекції синтетичних зображень',
    version='2.0',
    lifespan=lifespan,
)


@app.get('/health', response_model=HealthResponse)
async def health():
    ms: ModelService = state['model_service']
    if ms is None or not ms.is_ready:
        raise HTTPException(503, 'Сервіс ще не готовий')
    return HealthResponse(
        status='ok',
        models_loaded=ms.loaded_model_names,
        device=settings.DEVICE,
    )


@app.post('/classify', response_model=ClassifyResponse)
async def classify(
    image: Optional[UploadFile] = File(default=None),
    file: Optional[UploadFile] = File(default=None),
):
    """
    Приймає файл під полем 'image' АБО 'file' — для сумісності з різними backend-клієнтами.
    Тільки одне з полів має бути присутнім.
    """
    ms: ModelService = state['model_service']
    if ms is None or not ms.is_ready:
        raise HTTPException(503, 'Сервіс не готовий')

    upload = image if image is not None else file
    if upload is None:
        raise HTTPException(
            400,
            "Файл не передано. Очікую поле 'image' або 'file' у multipart/form-data.",
        )

    # Валідація типу
    if not upload.content_type or not upload.content_type.startswith('image/'):
        raise HTTPException(400, f'Invalid content type: {upload.content_type}')

    # Читання + валідація розміру
    data = await upload.read()
    size_mb = len(data) / (1024 * 1024)
    if size_mb > settings.MAX_FILE_SIZE_MB:
        raise HTTPException(
            413,
            f'Файл занадто великий: {size_mb:.1f} MB (максимум {settings.MAX_FILE_SIZE_MB} MB)',
        )

    # Парсинг зображення
    try:
        pil_image = Image.open(io.BytesIO(data))
        pil_image.load()
    except Exception as e:
        raise HTTPException(400, f'Не вдалось прочитати зображення: {e}')

    # Inference
    try:
        result = ms.predict(pil_image)
    except Exception as e:
        logger.exception("Inference error")
        raise HTTPException(500, f'Помилка обробки: {e}')

    return ClassifyResponse(**result)
