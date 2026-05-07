"""FastAPI ML-сервіс для виявлення синтетичних зображень."""
import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, UploadFile, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.schemas import HealthResponse, ClassifyResponse
from app.model import model_service

# Налаштування логів
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle — завантажуємо модель при старті, вивантажуємо при зупинці."""
    logger.info('Starting up ML service...')
    try:
        model_service.load()
    except FileNotFoundError as e:
        logger.warning(str(e))
        logger.warning('Service will start, but /classify will return 503 until model is provided.')
    yield
    logger.info('Shutting down ML service...')


app = FastAPI(
    title='SynthDetect ML Service',
    description='Inference service for synthetic image detection (EfficientNet-B0 + Grad-CAM)',
    version='0.1.0',
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)


@app.get('/health', response_model=HealthResponse)
async def health() -> HealthResponse:
    """Перевірка стану сервісу — використовується Docker healthcheck."""
    return HealthResponse(
        status='ok' if model_service.is_loaded else 'degraded',
        model_loaded=model_service.is_loaded,
        model_version=settings.MODEL_VERSION,
        device=str(model_service.device),
    )


@app.post('/classify', response_model=ClassifyResponse)
async def classify(file: UploadFile = File(...)) -> ClassifyResponse:
    """
    Класифікує зображення як real або synthetic + повертає Grad-CAM теплокарту.

    - **file**: зображення (JPEG/PNG/WebP), до MAX_FILE_SIZE_MB
    """
    if not model_service.is_loaded:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail='Model is not loaded. Place the .pth file and restart the service.',
        )

    # Перевірка типу
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f'File must be an image, got content-type: {file.content_type}',
        )

    # Читаємо байти + перевірка розміру
    image_bytes = await file.read()
    if len(image_bytes) > settings.max_file_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f'File exceeds max size of {settings.MAX_FILE_SIZE_MB} MB',
        )

    # Inference
    start = time.time()
    try:
        result = model_service.classify(image_bytes)
    except Exception as e:
        logger.exception('Classification failed')
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Classification failed: {type(e).__name__}: {str(e)}',
        )
    elapsed_ms = int((time.time() - start) * 1000)

    logger.info(
        f'Classified {file.filename}: {result["verdict"]} '
        f'(p_synth={result["probability_synthetic"]:.3f}, {elapsed_ms}ms)'
    )

    return ClassifyResponse(
        verdict=result['verdict'],
        probability_synthetic=result['probability_synthetic'],
        model_version=settings.MODEL_VERSION,
        processing_time_ms=elapsed_ms,
        heatmap_png_base64=result['heatmap_png_base64'],
    )


@app.get('/')
async def root():
    return {
        'service': 'SynthDetect ML',
        'version': '0.1.0',
        'docs': '/docs',
        'health': '/health',
    }
