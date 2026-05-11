"""
Ensemble Model Service: EfficientNet-B0 + ResNet-50 + ViT-B/16.

Preprocess робиться інлайн (без залежності від preprocess.py):
- Resize коротшої сторони до 256
- CenterCrop до 224×224
- Normalize ImageNet (mean/std)

Це consistent з eval_transform у train_ensemble_notebook.
"""
import base64
import logging
import time
from pathlib import Path
from typing import Dict, List, Optional

import numpy as np
import torch
import torch.nn as nn
from PIL import Image
from torchvision import transforms
from torchvision.models import efficientnet_b0, resnet50

from .config import settings
from .gradcam import generate_heatmap

logger = logging.getLogger(__name__)

CLASS_SYNTHETIC = 0
CLASS_REAL = 1

# ViT може бути недоступним у старих torchvision (< 0.13)
try:
    from torchvision.models import vit_b_16
    VIT_AVAILABLE = True
except ImportError:
    VIT_AVAILABLE = False
    logger.warning("ViT-B/16 недоступна в цьому torchvision. Оновити: pip install torchvision>=0.13")

# Стандартна нормалізація ImageNet (всі 3 моделі тренувались з нею)
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]


def _create_efficientnet_b0(num_classes: int = 2) -> nn.Module:
    model = efficientnet_b0(weights=None)
    in_features = model.classifier[1].in_features
    model.classifier = nn.Sequential(
        nn.Dropout(p=0.2, inplace=True),
        nn.Linear(in_features, num_classes),
    )
    return model


def _create_resnet50(num_classes: int = 2) -> nn.Module:
    model = resnet50(weights=None)
    model.fc = nn.Linear(model.fc.in_features, num_classes)
    return model


def _create_vit_b16(num_classes: int = 2) -> nn.Module:
    if not VIT_AVAILABLE:
        raise RuntimeError("ViT-B/16 недоступна")
    model = vit_b_16(weights=None)
    model.heads.head = nn.Linear(model.heads.head.in_features, num_classes)
    return model


class LoadedModel:
    """Одна завантажена модель + target layer для Grad-CAM (якщо є)."""

    def __init__(
        self,
        name: str,
        model: nn.Module,
        target_layer_for_cam: Optional[nn.Module] = None,
    ):
        self.name = name
        self.model = model
        self.target_layer_for_cam = target_layer_for_cam

    @torch.no_grad()
    def predict_proba(self, input_tensor: torch.Tensor) -> np.ndarray:
        logits = self.model(input_tensor)
        return torch.softmax(logits, dim=1)[0].cpu().numpy()


class ModelService:
    """Ensemble inference + Grad-CAM."""

    def __init__(self) -> None:
        self.device = torch.device(settings.DEVICE)
        self.models: List[LoadedModel] = []
        self.gradcam_model: Optional[LoadedModel] = None

        # Preprocess pipeline — інлайн, без залежності від preprocess.py
        # Збігається з eval_transform у train_ensemble_notebook
        self.transform = transforms.Compose([
            transforms.Resize(256),
            transforms.CenterCrop(settings.IMAGE_SIZE),
            transforms.ToTensor(),
            transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
        ])

        self._load_all()

    def _try_load(
        self,
        path: Optional[str],
        factory,
        name: str,
        cam_layer_fn=None,
    ) -> Optional[LoadedModel]:
        if not path or not Path(path).exists():
            logger.warning(f"  ✗ {name}: файл не знайдено ({path}) — пропускаю")
            return None
        try:
            model = factory()
            state = torch.load(path, map_location=self.device, weights_only=True)
            if isinstance(state, dict) and 'model_state_dict' in state:
                state = state['model_state_dict']
            model.load_state_dict(state)
            model = model.to(self.device).eval()

            cam_layer = cam_layer_fn(model) if cam_layer_fn else None

            n_params = sum(p.numel() for p in model.parameters())
            logger.info(f"  ✓ {name}: завантажено ({n_params:,} params)")
            return LoadedModel(name, model, cam_layer)
        except Exception as e:
            logger.error(f"  ✗ {name}: помилка завантаження — {e}")
            return None

    def _load_all(self) -> None:
        logger.info(f"Завантажую моделі ансамблю на {self.device}...")

        em = self._try_load(
            settings.MODEL_PATH,
            _create_efficientnet_b0,
            'EfficientNet-B0',
            cam_layer_fn=lambda m: m.features[-1],
        )
        if em:
            self.models.append(em)
            self.gradcam_model = em

        em = self._try_load(
            settings.MODEL_PATH_R50,
            _create_resnet50,
            'ResNet-50',
            cam_layer_fn=lambda m: m.layer4[-1],
        )
        if em:
            self.models.append(em)
            if self.gradcam_model is None:
                self.gradcam_model = em

        if VIT_AVAILABLE:
            em = self._try_load(
                settings.MODEL_PATH_VIT,
                _create_vit_b16,
                'ViT-B/16',
                cam_layer_fn=None,
            )
            if em:
                self.models.append(em)

        if not self.models:
            raise RuntimeError(
                'Жодну модель не завантажено! Перевір MODEL_PATH, MODEL_PATH_R50, '
                'MODEL_PATH_VIT і чи є .pth файли у /app/models/'
            )

        model_names = [m.name for m in self.models]
        logger.info(
            f"✓ Ансамбль готовий: {len(self.models)} моделей — {model_names}"
        )
        if self.gradcam_model:
            logger.info(f"✓ Grad-CAM джерело: {self.gradcam_model.name}")
        else:
            logger.warning("⚠ Grad-CAM недоступний (немає CNN моделей)")

    def _preprocess(self, image: Image.Image) -> torch.Tensor:
        """Препроцесинг — гарантує RGB, потім transform pipeline."""
        if image.mode != 'RGB':
            image = image.convert('RGB')
        return self.transform(image).unsqueeze(0).to(self.device)

    def predict(self, image: Image.Image) -> Dict:
        t0 = time.time()

        # Препроцесинг (інлайн)
        input_tensor = self._preprocess(image)

        # Передбачення кожної моделі окремо
        per_model: Dict[str, float] = {}
        synth_probs: List[float] = []
        for em in self.models:
            probs = em.predict_proba(input_tensor)
            p_synth = float(probs[CLASS_SYNTHETIC])
            per_model[em.name] = p_synth
            synth_probs.append(p_synth)

        # Ансамбль: середнє ймовірностей "synthetic"
        ensemble_p_synth = float(np.mean(synth_probs))
        verdict = 'synthetic' if ensemble_p_synth >= settings.DECISION_THRESHOLD else 'real'

        # Grad-CAM з пріоритетної CNN
        heatmap_base64: Optional[str] = None
        if self.gradcam_model and self.gradcam_model.target_layer_for_cam is not None:
            target_class = CLASS_SYNTHETIC if verdict == 'synthetic' else CLASS_REAL
            try:
                heatmap_bytes = generate_heatmap(
                    model=self.gradcam_model.model,
                    target_layer=self.gradcam_model.target_layer_for_cam,
                    input_tensor=input_tensor,
                    target_class=target_class,
                    original_image=image,
                    image_size=settings.IMAGE_SIZE,
                )
                heatmap_base64 = base64.b64encode(heatmap_bytes).decode('utf-8')
            except Exception as e:
                logger.error(f"Grad-CAM error: {e}")

        processing_time_ms = int((time.time() - t0) * 1000)

        return {
            'verdict': verdict,
            'probability_synthetic': ensemble_p_synth,
            'model_version': settings.MODEL_VERSION,
            'processing_time_ms': processing_time_ms,
            'heatmap_png_base64': heatmap_base64,
            'model_predictions': per_model,
        }

    @property
    def is_ready(self) -> bool:
        return len(self.models) > 0

    @property
    def loaded_model_names(self) -> List[str]:
        return [m.name for m in self.models]
