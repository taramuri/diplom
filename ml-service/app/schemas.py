"""Pydantic-схеми запитів і відповідей."""
from typing import Literal
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """Відповідь для /health endpoint."""
    status: Literal['ok', 'degraded'] = 'ok'
    model_loaded: bool
    model_version: str
    device: str


class ClassifyResponse(BaseModel):
    """Результат класифікації одного зображення."""
    verdict: Literal['real', 'synthetic'] = Field(
        ...,
        description='Вердикт: real — реальне зображення, synthetic — згенероване'
    )
    probability_synthetic: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description='Імовірність того, що зображення синтетичне (0..1)'
    )
    model_version: str = Field(..., description='Версія моделі що використовувалась')
    processing_time_ms: int = Field(..., description='Час обробки в мілісекундах')
    heatmap_png_base64: str = Field(
        ...,
        description='PNG з накладеною Grad-CAM теплокартою, base64-кодований'
    )


class ErrorResponse(BaseModel):
    error: str
    detail: str | None = None
