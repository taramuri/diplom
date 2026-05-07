"""Завантаження моделі і inference."""
import io
import base64
import logging
from pathlib import Path

import torch
import torch.nn as nn
from torchvision import models
from PIL import Image

from app.config import settings
from app.preprocess import build_eval_transform, preprocess_image
from app.gradcam import generate_heatmap

logger = logging.getLogger(__name__)

# Порядок класів з ImageFolder (алфавітний): FAKE=0, REAL=1
DEFAULT_CLASSES = ['FAKE', 'REAL']
FAKE_CLASS_IDX = 0
REAL_CLASS_IDX = 1


def _resolve_device(device_setting: str) -> torch.device:
    if device_setting == 'auto':
        return torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    return torch.device(device_setting)


def _build_efficientnet_b0(num_classes: int = 2) -> nn.Module:
    """EfficientNet-B0 без pretrained ваг (вони підвантажаться з checkpoint)."""
    model = models.efficientnet_b0(weights=None)
    in_features = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(in_features, num_classes)
    return model


class ModelService:
    """Інкапсулює завантаження моделі та одиничний inference."""

    def __init__(self) -> None:
        self.model: nn.Module | None = None
        self.device: torch.device = _resolve_device(settings.DEVICE)
        self.classes: list[str] = DEFAULT_CLASSES
        self.transform = build_eval_transform(settings.IMAGE_SIZE)
        self._target_layer: nn.Module | None = None

    @property
    def is_loaded(self) -> bool:
        return self.model is not None

    def load(self) -> None:
        """Завантажує модель з диска. Викликається при старті сервісу."""
        model_path = Path(settings.MODEL_PATH)
        if not model_path.exists():
            logger.error(f'Model file not found: {model_path}')
            raise FileNotFoundError(
                f'Model file not found: {model_path}. '
                f'Train the model first (see ml-training/training_notebook.ipynb) '
                f'and place the .pth file at {model_path}.'
            )

        logger.info(f'Loading model from {model_path} on {self.device}...')
        model = _build_efficientnet_b0(num_classes=2)
        checkpoint = torch.load(model_path, map_location=self.device, weights_only=False)
        model.load_state_dict(checkpoint['model_state_dict'])
        model.to(self.device)
        model.eval()

        self.model = model
        self._target_layer = model.features[-1]  # останній conv-блок для Grad-CAM

        if 'classes' in checkpoint:
            self.classes = checkpoint['classes']
            logger.info(f'Loaded classes from checkpoint: {self.classes}')

        logger.info('✓ Model loaded successfully')

    def classify(self, image_bytes: bytes) -> dict:
        """
        Виконує класифікацію одного зображення + Grad-CAM.

        Returns dict with: verdict, probability_synthetic, heatmap_png_base64
        """
        if not self.is_loaded or self.model is None or self._target_layer is None:
            raise RuntimeError('Model is not loaded')

        # Декодуємо зображення
        image = Image.open(io.BytesIO(image_bytes))
        input_tensor, rgb_image = preprocess_image(image, self.transform)
        input_tensor = input_tensor.to(self.device)

        # Forward pass для отримання ймовірностей
        with torch.no_grad():
            logits = self.model(input_tensor)
            probs = torch.softmax(logits, dim=1)[0]

        prob_fake = float(probs[FAKE_CLASS_IDX].item())
        verdict = 'synthetic' if prob_fake >= settings.CLASSIFICATION_THRESHOLD else 'real'

        # Grad-CAM (потребує grad-обчислень, тому окремий forward поза no_grad)
        heatmap_png = generate_heatmap(
            model=self.model,
            target_layer=self._target_layer,
            input_tensor=input_tensor,
            target_class=FAKE_CLASS_IDX,
            original_image=rgb_image,
            image_size=settings.IMAGE_SIZE,
        )
        heatmap_b64 = base64.b64encode(heatmap_png).decode('utf-8')

        return {
            'verdict': verdict,
            'probability_synthetic': prob_fake,
            'heatmap_png_base64': heatmap_b64,
        }


# Глобальний інстанс — завантажується при старті FastAPI
model_service = ModelService()
