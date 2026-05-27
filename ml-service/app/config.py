"""Конфігурація через pydantic-settings (читає з env vars / .env)."""
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=['.env', '/app/.env'],
        env_file_encoding='utf-8',
        extra='ignore',
    )

    # === Server ===
    HOST: str = '0.0.0.0'
    PORT: int = 8000
    DEVICE: str = 'cpu'

    # === Image processing ===
    IMAGE_SIZE: int = 224
    MAX_FILE_SIZE_MB: int = 10

    # === Models ===
    MODEL_PATH: str = '/app/models/efficientnet_b0_synthdetect_v2.pth'
    MODEL_PATH_R50: Optional[str] = '/app/models/resnet50_synthdetect.pth'
    MODEL_PATH_VIT: Optional[str] = '/app/models/vit_b16_synthdetect.pth'

    MODEL_VERSION: str = 'ensemble_b0_r50_vit_v1.0'

    # === Inference ===
    DECISION_THRESHOLD: float = 0.5


settings = Settings()