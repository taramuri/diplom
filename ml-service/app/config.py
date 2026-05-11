"""Конфігурація через pydantic-settings (читає з env vars / .env)."""
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', extra='ignore')

    # === Server ===
    HOST: str = '0.0.0.0'
    PORT: int = 8000
    DEVICE: str = 'cpu'  # 'cpu' або 'cuda'

    # === Image processing ===
    IMAGE_SIZE: int = 224
    MAX_FILE_SIZE_MB: int = 10

    # === Models ===
    # MODEL_PATH = шлях до EfficientNet-B0 (зберігається для зворотньої сумісності)
    MODEL_PATH: str = '/app/models/efficientnet_b0_synthdetect_v2.pth'
    MODEL_PATH_R50: Optional[str] = '/app/models/resnet50_synthdetect.pth'
    MODEL_PATH_VIT: Optional[str] = '/app/models/vit_b16_synthdetect.pth'

    # Версія ансамблю — повертається у API і записується в Analysis.model_version
    MODEL_VERSION: str = 'ensemble_b0_r50_vit_v1.0'

    # === Inference ===
    # Поріг для визначення вердикту (probability_synthetic >= threshold → synthetic)
    DECISION_THRESHOLD: float = 0.5


settings = Settings()
