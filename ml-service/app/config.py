"""Налаштування ML-сервісу через змінні середовища."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Модель
    MODEL_PATH: str = 'models/efficientnet_b0_synthdetect.pth'
    MODEL_VERSION: str = 'efficientnet_b0_v1.0'
    DEVICE: str = 'auto'  # 'auto', 'cuda', 'cpu'

    # Сервер
    HOST: str = '0.0.0.0'
    PORT: int = 8000

    # Обмеження
    MAX_FILE_SIZE_MB: int = 10

    # CORS
    CORS_ORIGINS: list[str] = ['http://localhost:3000']

    # Параметри препроцесингу (мають збігатися з тренуванням)
    IMAGE_SIZE: int = 224
    CLASSIFICATION_THRESHOLD: float = 0.5

    @property
    def max_file_size_bytes(self) -> int:
        return self.MAX_FILE_SIZE_MB * 1024 * 1024

    model_config = SettingsConfigDict(env_file='.env', case_sensitive=False)


settings = Settings()
