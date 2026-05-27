#!/usr/bin/env python3

import argparse
import io
import json
import time
from pathlib import Path

import requests
from datasets import load_dataset
from PIL import Image
from sklearn.metrics import (
    accuracy_score, classification_report,
    confusion_matrix, roc_auc_score
)
from tqdm import tqdm

# ── Налаштування ──────────────────────────────────────────────
API_URL    = "http://localhost:8080"
N_SAMPLES  = 100   # загальна кількість (50 real + 50 synthetic)
OUTPUT     = Path("test_results.json")

# Клас маппінг в AI-vs-Real 
LABEL_MAP  = {"REAL": 1, "FAKE": 0}  # 1=real, 0=synthetic


def login(email: str, password: str) -> str:
    resp = requests.post(f"{API_URL}/api/auth/login",
                         json={"email": email, "password": password})
    resp.raise_for_status()
    token = resp.json()["token"]
    print(f"✓ Авторизація успішна")
    return token


def analyze_image(img: Image.Image, token: str) -> dict:
    """Надсилає зображення на /api/analyze і повертає результат."""
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    buf.seek(0)

    resp = requests.post(
        f"{API_URL}/api/analyze",
        headers={"Authorization": f"Bearer {token}"},
        files={"image": ("test.jpg", buf, "image/jpeg")},
        timeout=60,
    )
    if resp.status_code != 200 and resp.status_code != 201:
        return None
    return resp.json()


def load_test_images(n: int = 100):
    print("Завантаження тестових зображень...")
    ds = load_dataset("cyberagent/ai-vs-human-generated-dataset", split="test")


    # Розділяємо по класах
    real_indices  = [i for i, x in enumerate(ds["binary_label"]) if x == 1]
    fake_indices  = [i for i, x in enumerate(ds["binary_label"]) if x == 0]

    # Беремо з кінця кожного класу (щоб не перетинатись з train split)
    half = n // 2
    selected = real_indices[-half:] + fake_indices[-half:]

    test_ds = ds.select(selected)

    images, labels = [], []
    for item in tqdm(test_ds, desc="Підготовка"):
        img = item["image"]
        if not isinstance(img, Image.Image):
            img = Image.fromarray(img)
        images.append(img.convert("RGB"))
        labels.append(int(item["binary_label"]))

    synth_count = labels.count(0)
    real_count  = labels.count(1)
    print(f"✓ Завантажено {len(images)}: {real_count} реальних, {synth_count} синтетичних")
    return images, labels


def run_tests(images, labels, token):
    """Надсилає кожне зображення на API і збирає результати."""
    y_true, y_pred, y_prob = [], [], []
    errors = 0

    for i, (img, true_label) in enumerate(
        tqdm(zip(images, labels), total=len(images), desc="Тестування API")
    ):
        result = analyze_image(img, token)

        if result is None:
            errors += 1
            continue

        p_synth = result.get("probability_synthetic", 0.5)
        verdict = result.get("verdict", "real")

        pred_label = 0 if verdict == "synthetic" else 1

        y_true.append(true_label)
        y_pred.append(pred_label)
        y_prob.append(1 - p_synth)  # prob_real для AUC

        # Невелика пауза щоб не перевантажити API
        time.sleep(0.3)

    print(f"\n✓ Протестовано: {len(y_true)} зображень, помилок API: {errors}")
    return y_true, y_pred, y_prob


def compute_metrics(y_true, y_pred, y_prob):
    """Обраховує і виводить метрики."""
    acc = accuracy_score(y_true, y_pred)
    auc = roc_auc_score(y_true, y_prob)
    cm  = confusion_matrix(y_true, y_pred)
    report = classification_report(
        y_true, y_pred,
        target_names=["Synthetic", "Real"],
        output_dict=True,
    )

    print("\n" + "="*50)
    print("РЕЗУЛЬТАТИ ТЕСТУВАННЯ")
    print("="*50)
    print(f"Accuracy:  {acc*100:.2f}%")
    print(f"AUC-ROC:   {auc*100:.2f}%")
    print(f"\nПо класах:")
    for cls in ["Synthetic", "Real"]:
        r = report[cls]
        print(f"  {cls:12s} Precision={r['precision']*100:.1f}%  "
              f"Recall={r['recall']*100:.1f}%  F1={r['f1-score']*100:.1f}%")
    print(f"\nМатриця помилок:")
    print(f"              Pred:Synthetic  Pred:Real")
    print(f"True:Synthetic     {cm[0][0]:4d}         {cm[0][1]:4d}")
    print(f"True:Real          {cm[1][0]:4d}         {cm[1][1]:4d}")

    return {
        "accuracy": acc,
        "auc_roc": auc,
        "confusion_matrix": cm.tolist(),
        "per_class": report,
        "n_tested": len(y_true),
    }


def main():
    global API_URL
    
    parser = argparse.ArgumentParser()
    parser.add_argument("--email",    required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--n",        type=int, default=N_SAMPLES)
    parser.add_argument("--url",      default=API_URL)
    args = parser.parse_args()

    API_URL = args.url

    # 1. Авторизація
    token = login(args.email, args.password)

    # 2. Завантаження тестових зображень
    images, labels = load_test_images(args.n)

    # 3. Тестування API
    y_true, y_pred, y_prob = run_tests(images, labels, token)

    # 4. Метрики
    metrics = compute_metrics(y_true, y_pred, y_prob)

    # 5. Збереження
    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2, ensure_ascii=False)
    print(f"\n✓ Результати збережено → {OUTPUT}")


if __name__ == "__main__":
    main()
