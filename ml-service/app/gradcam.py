"""Генерація теплової карти Grad-CAM з накладанням на оригінал."""
import io
import numpy as np
from PIL import Image
import torch
from pytorch_grad_cam import GradCAM
from pytorch_grad_cam.utils.model_targets import ClassifierOutputTarget
from pytorch_grad_cam.utils.image import show_cam_on_image


def generate_heatmap(
    model: torch.nn.Module,
    target_layer: torch.nn.Module,
    input_tensor: torch.Tensor,
    target_class: int,
    original_image: Image.Image,
    image_size: int,
) -> bytes:
    """
    Будує Grad-CAM heatmap для заданого класу і накладає на оригінальне зображення.

    Args:
        model: натренована модель (eval mode)
        target_layer: останній згортковий шар (для EfficientNet-B0 — model.features[-1])
        input_tensor: вхід у моделі (1, 3, H, W)
        target_class: індекс класу для якого рахуємо CAM (0=FAKE для нашої моделі)
        original_image: PIL зображення (RGB)
        image_size: розмір вхідного зображення моделі (224)

    Returns:
        PNG-байти з накладеною теплокартою
    """
    cam = GradCAM(model=model, target_layers=[target_layer])
    targets = [ClassifierOutputTarget(target_class)]
    grayscale_cam = cam(input_tensor=input_tensor, targets=targets)[0]

    # Готуємо оригінал у форматі [0, 1] np.float32
    img_resized = original_image.resize((image_size, image_size))
    img_np = np.array(img_resized).astype(np.float32) / 255.0

    # Накладаємо теплокарту (RGB)
    visualization = show_cam_on_image(img_np, grayscale_cam, use_rgb=True)

    # Кодуємо як PNG
    overlay_img = Image.fromarray(visualization)
    buf = io.BytesIO()
    overlay_img.save(buf, format='PNG')
    return buf.getvalue()
