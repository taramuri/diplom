"""Препроцесинг зображень — має збігатися з тренуванням."""
from typing import Tuple
from PIL import Image
from torchvision import transforms
import torch


IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]


def build_eval_transform(image_size: int) -> transforms.Compose:
    """
    Стандартна ImageNet-схема evaluation:
    1. Resize до 256 по коротшій стороні (зберігає aspect ratio)
    2. CenterCrop до 224×224 (квадрат з центру)

    Це не сплющує неквадратні зображення.
    """
    resize_to = int(image_size * 256 / 224)  

    return transforms.Compose([
        transforms.Resize(resize_to), 
        transforms.CenterCrop(image_size),
        transforms.ToTensor(),
        transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
    ])


def preprocess_image(image: Image.Image, transform: transforms.Compose) -> Tuple[torch.Tensor, Image.Image]:
    """
    Перетворює PIL зображення на тензор для моделі.

    Returns:
        tensor: (1, 3, H, W) — готовий для inference
        rgb_image: оригінал у форматі RGB (для накладання heatmap)
    """
    if image.mode != 'RGB':
        image = image.convert('RGB')
    tensor = transform(image).unsqueeze(0)
    return tensor, image