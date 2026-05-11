"""Генерація теплової карти Grad-CAM зі збереженням aspect ratio оригіналу."""
import io
import numpy as np
import cv2
from PIL import Image
import torch
from pytorch_grad_cam import GradCAM
from pytorch_grad_cam.utils.model_targets import ClassifierOutputTarget
from pytorch_grad_cam.utils.image import show_cam_on_image


# Максимальна довжина більшої сторони у вихідному PNG.
# Більший розмір — гарніше але важчий файл.
MAX_DISPLAY_DIMENSION = 800


def generate_heatmap(
    model: torch.nn.Module,
    target_layer: torch.nn.Module,
    input_tensor: torch.Tensor,
    target_class: int,
    original_image: Image.Image,
    image_size: int,  # лишено для сумісності інтерфейсу, не використовується
) -> bytes:
    """
    Будує Grad-CAM heatmap для target_class і накладає на оригінал
    із ЗБЕРЕЖЕННЯМ aspect ratio (не сплющує).

    Workflow:
    1. Обчислюємо heatmap 224×224 на основі input_tensor (це те що модель бачила).
    2. Беремо оригінал у його справжніх пропорціях.
    3. Зменшуємо оригінал до display-розміру (≤ MAX_DISPLAY_DIMENSION по довшій стороні),
       зберігаючи aspect ratio.
    4. Растягуємо heatmap до тих самих пропорцій (224×224 → display_w × display_h).
    5. Накладаємо і повертаємо PNG.
    """
    cam = GradCAM(model=model, target_layers=[target_layer])
    targets = [ClassifierOutputTarget(target_class)]
    grayscale_cam = cam(input_tensor=input_tensor, targets=targets)[0]  # 224×224

    # Гарантуємо RGB
    if original_image.mode != 'RGB':
        original_image = original_image.convert('RGB')

    # Display-розмір зі збереженням aspect ratio
    orig_w, orig_h = original_image.size
    longest = max(orig_w, orig_h)
    if longest > MAX_DISPLAY_DIMENSION:
        scale = MAX_DISPLAY_DIMENSION / longest
        display_w = int(round(orig_w * scale))
        display_h = int(round(orig_h * scale))
    else:
        display_w, display_h = orig_w, orig_h

    # Зменшуємо оригінал
    display_img = original_image.resize((display_w, display_h), Image.LANCZOS)
    img_np = np.array(display_img).astype(np.float32) / 255.0

    # Розтягуємо heatmap до display-розміру (з 224×224)
    heatmap_resized = cv2.resize(
        grayscale_cam,
        (display_w, display_h),
        interpolation=cv2.INTER_LINEAR,
    )

    # Накладаємо (з рекомендованим alpha 0.4)
    visualization = show_cam_on_image(
        img_np,
        heatmap_resized,
        use_rgb=True,
        image_weight=0.6,
    )

    # Кодуємо як PNG
    overlay_img = Image.fromarray(visualization)
    buf = io.BytesIO()
    overlay_img.save(buf, format='PNG', optimize=True)
    return buf.getvalue()
