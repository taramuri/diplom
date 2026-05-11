"""Pydantic-схеми для API."""
from typing import Dict, Optional
from pydantic import BaseModel, Field


class ClassifyResponse(BaseModel):
    """Відповідь /classify endpoint."""
    verdict: str = Field(..., description="'real' або 'synthetic'")
    probability_synthetic: float = Field(..., ge=0.0, le=1.0)
    model_version: str
    processing_time_ms: int
    heatmap_png_base64: Optional[str] = None

    # Розбивка по моделях ансамблю — опційно
    # Якщо ансамбль з 3 моделей, повертає {"EfficientNet-B0": 0.91, "ResNet-50": 0.88, "ViT-B/16": 0.93}
    model_predictions: Optional[Dict[str, float]] = None


class HealthResponse(BaseModel):
    """Відповідь /health endpoint."""
    status: str
    models_loaded: list[str]
    device: str
