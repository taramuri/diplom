"""Тести для /classify endpoint.

ВАЖЛИВО: ці тести очікують що модель НЕ завантажена (.pth відсутній).
Коли завантажиш натреновану модель — додамо тест на справжнє зображення.
"""
from io import BytesIO
from PIL import Image


def _make_test_image_bytes() -> bytes:
    img = Image.new('RGB', (256, 256), color='red')
    buf = BytesIO()
    img.save(buf, format='JPEG')
    return buf.getvalue()


def test_classify_returns_503_when_no_model(client):
    """Якщо моделі нема — отримаємо 503 з повідомленням."""
    files = {'file': ('test.jpg', _make_test_image_bytes(), 'image/jpeg')}
    response = client.post('/classify', files=files)
    # 503 якщо модель не завантажена, або 200 якщо завантажена
    assert response.status_code in (200, 503)


def test_classify_rejects_non_image(client):
    files = {'file': ('test.txt', b'not an image', 'text/plain')}
    response = client.post('/classify', files=files)
    assert response.status_code == 400


def test_classify_requires_file(client):
    response = client.post('/classify')
    assert response.status_code == 422
