#!/usr/bin/env python3
"""
SynthDetect — тестування на cyberagent/ai-vs-human-generated-dataset.
Встановити: pip install requests datasets Pillow scikit-learn matplotlib seaborn tqdm

Запуск:
    python test_hf_dataset.py --email EMAIL --password PASS
    python test_hf_dataset.py --email EMAIL --password PASS --n 200
"""
import argparse
import io
import json
import time
from pathlib import Path

import matplotlib.patches as mpatches
import matplotlib.pyplot as plt
import numpy as np
import requests
import seaborn as sns
from datasets import load_dataset
from PIL import Image
from sklearn.metrics import (
    accuracy_score, classification_report,
    confusion_matrix, roc_auc_score, roc_curve,
)
from tqdm import tqdm

API_URL  = "http://localhost:8080"
OUTPUT   = Path("results_hf")
DARK, SYNTH, REAL = "#5e3c50", "#8b5e7e", "#7aad9b"


# ── Auth ─────────────────────────────────────────────────────

def login(email: str, password: str) -> str:
    r = requests.post(f"{API_URL}/api/auth/login",
                      json={"email": email, "password": password})
    r.raise_for_status()
    print("✓ Авторизація успішна")
    return r.json()["token"]


# ── Аналіз через API ─────────────────────────────────────────

def analyze_image(img: Image.Image, token: str):
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    buf.seek(0)
    r = requests.post(
        f"{API_URL}/api/analyze",
        headers={"Authorization": f"Bearer {token}"},
        files={"image": ("test.jpg", buf, "image/jpeg")},
        timeout=90,
    )
    if r.status_code in (200, 201):
        return r.json()
    return None


# ── Завантаження датасету ────────────────────────────────────

def load_test_images(n: int = 100):
    print("Пошук доступного датасету...")

    # Список датасетів для спроби
    candidates = [
        ("Hemang2005/AI-vs-Real-Images", "train", "label", {0: 0, 1: 1}),
        ("prasad9696/AI_Generated_Images", "train", "label", {0: 0, 1: 1}),
        ("Parveshiiii/AI-vs-Real", "train", "binary_label", {0: 0, 1: 1}),
    ]

    ds = None
    label_col = "label"
    label_map = {0: 0, 1: 1}

    for name, split, lcol, lmap in candidates:
        try:
            ds = load_dataset(name, split=split, verification_mode="no_checks")
            label_col = lcol
            label_map = lmap
            print(f"✓ Завантажено: {name}")
            print(f"  Колонки: {ds.column_names}")
            print(f"  Приклад label: {ds[0][label_col]}")
            break
        except Exception as e:
            print(f"✗ {name}: недоступний")

    if ds is None:
        raise RuntimeError("Жоден датасет не доступний")

    real_idx  = [i for i, x in enumerate(ds[label_col]) if label_map[int(x)] == 1]
    synth_idx = [i for i, x in enumerate(ds[label_col]) if label_map[int(x)] == 0]

    # Беремо з середини датасету (не з кінця/початку)
    half = n // 2
    mid_r = len(real_idx) // 2
    mid_s = len(synth_idx) // 2
    selected = real_idx[mid_r:mid_r+half] + synth_idx[mid_s:mid_s+half]

    test_ds = ds.select(selected)
    images, labels = [], []
    for item in tqdm(test_ds, desc="Підготовка"):
        img = item["image"]
        if not isinstance(img, Image.Image):
            img = Image.fromarray(img)
        images.append(img.convert("RGB"))
        labels.append(label_map[int(item[label_col])])

    print(f"✓ {len(images)}: {labels.count(1)} реальних, {labels.count(0)} синтетичних")
    return images, labels


# ── Тестування ────────────────────────────────────────────────

def run_tests(images, labels, token):
    y_true, y_pred, y_prob = [], [], []
    errors = 0

    for img, true_label in tqdm(zip(images, labels), total=len(images), desc="Тестування API"):
        result = analyze_image(img, token)
        if result is None:
            errors += 1
            continue
        p_synth   = result.get("probability_synthetic", 0.5)
        verdict   = result.get("verdict", "real")
        pred_lbl  = 0 if verdict == "synthetic" else 1
        y_true.append(true_label)
        y_pred.append(pred_lbl)
        y_prob.append(1 - p_synth)
        time.sleep(0.2)

    print(f"\n✓ Протестовано: {len(y_true)}, помилок API: {errors}")
    return y_true, y_pred, y_prob


# ── Метрики ───────────────────────────────────────────────────

def compute_metrics(y_true, y_pred, y_prob):
    acc    = accuracy_score(y_true, y_pred)
    report = classification_report(
        y_true, y_pred,
        target_names=["Synthetic", "Real"],
        output_dict=True, labels=[0, 1], zero_division=0,
    )
    cm  = confusion_matrix(y_true, y_pred, labels=[0, 1])
    auc = roc_auc_score(y_true, y_prob) if len(set(y_true)) > 1 else None

    print("\n" + "="*55)
    print("РЕЗУЛЬТАТИ ТЕСТУВАННЯ")
    print("="*55)
    print(f"Вибірка:  {len(y_true)} ({y_true.count(1)} real, {y_true.count(0)} synthetic)")
    print(f"Accuracy: {acc*100:.2f}%")
    if auc: print(f"AUC-ROC:  {auc*100:.2f}%")
    print()
    for cls in ["Synthetic", "Real"]:
        r = report[cls]
        print(f"  {cls:10s}  Precision={r['precision']*100:.1f}%  "
              f"Recall={r['recall']*100:.1f}%  F1={r['f1-score']*100:.1f}%")
    print(f"\nМатриця помилок:")
    print(f"                 Synthetic  Real")
    print(f"  Synthetic  →    {cm[0][0]:5d}    {cm[0][1]:5d}")
    print(f"  Real       →    {cm[1][0]:5d}    {cm[1][1]:5d}")

    return {"accuracy": acc, "auc_roc": auc,
            "confusion_matrix": cm.tolist(),
            "per_class": report, "n_tested": len(y_true)}


# ── Графіки ───────────────────────────────────────────────────

def plot_metrics_bar(report, acc, out_dir):
    lbls   = ["Accuracy", "Precision\nSynthetic", "Recall\nSynthetic", "F1\nSynthetic",
              "Precision\nReal", "Recall\nReal", "F1\nReal"]
    vals   = [acc,
              report["Synthetic"]["precision"], report["Synthetic"]["recall"],
              report["Synthetic"]["f1-score"],
              report["Real"]["precision"],      report["Real"]["recall"],
              report["Real"]["f1-score"]]
    vals   = [v * 100 for v in vals]
    colors = [DARK] + [SYNTH]*3 + [REAL]*3

    fig, ax = plt.subplots(figsize=(12, 5))
    bars = ax.bar(lbls, vals, color=colors, edgecolor="white", linewidth=0.8, width=0.6)
    for bar, val in zip(bars, vals):
        ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.8,
                f"{val:.1f}%", ha="center", va="bottom", fontsize=9.5, fontweight="bold")
    ax.set_ylim(0, 118)
    ax.set_ylabel("Значення (%)", fontsize=11)
    ax.set_title("Метрики якості класифікатора SynthDetect\n(cyberagent/ai-vs-human-generated-dataset)",
                 fontsize=12, fontweight="bold", pad=10)
    ax.axhline(90, color="gray", linestyle="--", alpha=0.3)
    ax.legend(handles=[
        mpatches.Patch(color=DARK,  label="Загальна Accuracy"),
        mpatches.Patch(color=SYNTH, label="Клас: Synthetic"),
        mpatches.Patch(color=REAL,  label="Клас: Real"),
    ], loc="lower right", fontsize=9)
    plt.tight_layout()
    p = out_dir / "metrics_bar.png"
    plt.savefig(p, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"  ✓ {p.name}")


def plot_confusion_matrix(cm, out_dir):
    fig, ax = plt.subplots(figsize=(5, 4))
    sns.heatmap(cm, annot=True, fmt="d", cmap="YlOrRd",
                xticklabels=["Synthetic", "Real"],
                yticklabels=["Synthetic", "Real"],
                ax=ax, linewidths=0.5, annot_kws={"size": 14})
    ax.set_xlabel("Передбачений клас", fontsize=11)
    ax.set_ylabel("Реальний клас", fontsize=11)
    ax.set_title("Матриця помилок", fontsize=12, fontweight="bold")
    plt.tight_layout()
    p = out_dir / "confusion_matrix.png"
    plt.savefig(p, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"  ✓ {p.name}")


def plot_roc(y_true, y_prob, auc, out_dir):
    fpr, tpr, _ = roc_curve(y_true, y_prob)
    fig, ax = plt.subplots(figsize=(5, 5))
    ax.plot(fpr, tpr, color=DARK, lw=2, label=f"AUC = {auc:.4f}")
    ax.plot([0,1],[0,1],"k--", lw=1, alpha=0.4)
    ax.fill_between(fpr, tpr, alpha=0.08, color=DARK)
    ax.set_xlim([-0.01,1.01]); ax.set_ylim([-0.01,1.05])
    ax.set_xlabel("False Positive Rate", fontsize=11)
    ax.set_ylabel("True Positive Rate", fontsize=11)
    ax.set_title("ROC-крива ансамблю", fontsize=12, fontweight="bold")
    ax.legend(loc="lower right", fontsize=11)
    plt.tight_layout()
    p = out_dir / "roc_curve.png"
    plt.savefig(p, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"  ✓ {p.name}")


def plot_prob_dist(y_true, y_prob, out_dir):
    real_p  = [p for p, l in zip(y_prob, y_true) if l == 1]
    synth_p = [1-p for p, l in zip(y_prob, y_true) if l == 0]
    bins = np.linspace(0, 1, 21)
    fig, ax = plt.subplots(figsize=(7, 4))
    ax.hist([1-p for p in real_p], bins=bins, alpha=0.7, color=REAL,
            label=f"Реальні ({len(real_p)})", edgecolor="white")
    ax.hist(synth_p, bins=bins, alpha=0.7, color=SYNTH,
            label=f"Синтетичні ({len(synth_p)})", edgecolor="white")
    ax.axvline(0.5, color=DARK, linestyle="--", linewidth=1.5, label="Поріг 0.5")
    ax.set_xlabel("Ймовірність синтетичності", fontsize=11)
    ax.set_ylabel("Кількість зображень", fontsize=11)
    ax.set_title("Розподіл ймовірностей по класах", fontsize=12, fontweight="bold")
    ax.legend(fontsize=10)
    plt.tight_layout()
    p = out_dir / "prob_distribution.png"
    plt.savefig(p, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"  ✓ {p.name}")


# ── Main ──────────────────────────────────────────────────────

def main():
    global API_URL
    parser = argparse.ArgumentParser()
    parser.add_argument("--email",    required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--n",        type=int, default=100)
    parser.add_argument("--url",      default=API_URL)
    args = parser.parse_args()

    API_URL = args.url
    OUTPUT.mkdir(exist_ok=True)

    token = login(args.email, args.password)
    images, labels = load_test_images(args.n)
    y_true, y_pred, y_prob = run_tests(images, labels, token)
    metrics = compute_metrics(y_true, y_pred, y_prob)

    print("\nГенерація графіків...")
    plot_metrics_bar(metrics["per_class"], metrics["accuracy"], OUTPUT)
    plot_confusion_matrix(np.array(metrics["confusion_matrix"]), OUTPUT)
    if metrics["auc_roc"]:
        plot_roc(y_true, y_prob, metrics["auc_roc"], OUTPUT)
    plot_prob_dist(y_true, y_prob, OUTPUT)

    out_json = OUTPUT / "test_results.json"
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2, ensure_ascii=False, default=float)
    print(f"\n✓ Готово! Результати → {OUTPUT}/")


if __name__ == "__main__":
    main()
