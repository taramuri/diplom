#!/usr/bin/env python3
"""
SynthDetect — генерація графіків з metrics_ensemble.json.
Встановити: pip install matplotlib seaborn numpy

Запуск (з папки де лежить metrics_ensemble.json):
    python generate_charts.py
    python generate_charts.py --input metrics_ensemble.json --out charts/
"""
import argparse
import json
from pathlib import Path

import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import numpy as np
import seaborn as sns

DARK  = "#5e3c50"
SYNTH = "#8b5e7e"
REAL  = "#7aad9b"
GRAY  = "#b0b0b0"

MODELS_UA = {
    "EfficientNet-B0": "EfficientNet-B0",
    "ResNet-50":       "ResNet-50",
    "ViT-B/16":        "ViT-B/16",
    "Ensemble":        "Ансамбль",
}

plt.rcParams.update({
    "font.family":     "DejaVu Sans",
    "axes.spines.top":    False,
    "axes.spines.right":  False,
    "axes.grid":          True,
    "grid.alpha":         0.3,
    "grid.linestyle":     "--",
})


# ── 1. Стовпчикова діаграма метрик по моделях ────────────────

def plot_model_comparison(data: dict, out_dir: Path):
    models = list(MODELS_UA.values())
    metrics = {
        "Accuracy":  [data["models"][m]["accuracy"] * 100 for m in MODELS_UA],
        "Precision": [data["models"][m]["precision_synth"] * 100 for m in MODELS_UA],
        "Recall":    [data["models"][m]["recall_synth"] * 100 for m in MODELS_UA],
        "F1-score":  [data["models"][m]["f1_synth"] * 100 for m in MODELS_UA],
    }

    x     = np.arange(len(models))
    width = 0.2
    colors = [DARK, SYNTH, REAL, "#d4a0c0"]

    fig, ax = plt.subplots(figsize=(12, 6))
    for i, (metric, values) in enumerate(metrics.items()):
        offset = (i - 1.5) * width
        bars = ax.bar(x + offset, values, width, label=metric,
                      color=colors[i], edgecolor="white", linewidth=0.6)
        for bar, val in zip(bars, values):
            ax.text(bar.get_x() + bar.get_width()/2,
                    bar.get_height() + 0.3,
                    f"{val:.1f}", ha="center", va="bottom",
                    fontsize=7.5, fontweight="bold")

    ax.set_xticks(x)
    ax.set_xticklabels(models, fontsize=11)
    ax.set_ylim(85, 103)
    ax.set_ylabel("Значення (%)", fontsize=11)
    ax.set_title("Порівняння метрик моделей ансамблю SynthDetect",
                 fontsize=13, fontweight="bold", pad=12)
    ax.legend(loc="lower right", fontsize=10)
    plt.tight_layout()
    p = out_dir / "model_comparison.png"
    plt.savefig(p, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"  ✓ {p.name}")


# ── 2. AUC-ROC по моделях ────────────────────────────────────

def plot_auc_bars(data: dict, out_dir: Path):
    models = list(MODELS_UA.values())
    aucs   = [data["models"][m]["auc_roc"] * 100 for m in MODELS_UA]
    colors = [SYNTH, SYNTH, SYNTH, DARK]

    fig, ax = plt.subplots(figsize=(7, 4))
    bars = ax.barh(models, aucs, color=colors, edgecolor="white", linewidth=0.6)
    for bar, val in zip(bars, aucs):
        ax.text(val + 0.01, bar.get_y() + bar.get_height()/2,
                f"{val:.2f}%", va="center", fontsize=10, fontweight="bold")
    ax.set_xlim(98, 100.4)
    ax.set_xlabel("AUC-ROC (%)", fontsize=11)
    ax.set_title("AUC-ROC по моделях", fontsize=12, fontweight="bold")
    ax.legend(handles=[
        mpatches.Patch(color=DARK,  label="Ансамбль"),
        mpatches.Patch(color=SYNTH, label="Окрема модель"),
    ], fontsize=9)
    plt.tight_layout()
    p = out_dir / "auc_bars.png"
    plt.savefig(p, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"  ✓ {p.name}")


# ── 3. Матриця помилок — Ансамбль ────────────────────────────

def plot_confusion_matrix(data: dict, out_dir: Path):
    cm = np.array(data["models"]["Ensemble"]["confusion_matrix"])
    fig, ax = plt.subplots(figsize=(5, 4))
    sns.heatmap(
        cm, annot=True, fmt="d", cmap="YlOrRd",
        xticklabels=["Synthetic", "Real"],
        yticklabels=["Synthetic", "Real"],
        ax=ax, linewidths=0.5, annot_kws={"size": 16},
    )
    ax.set_xlabel("Передбачений клас", fontsize=11)
    ax.set_ylabel("Реальний клас", fontsize=11)
    ax.set_title("Матриця помилок — Ансамбль", fontsize=12, fontweight="bold")
    plt.tight_layout()
    p = out_dir / "confusion_matrix_ensemble.png"
    plt.savefig(p, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"  ✓ {p.name}")


# ── 4. Матриці помилок — всі моделі ──────────────────────────

def plot_all_confusion_matrices(data: dict, out_dir: Path):
    fig, axes = plt.subplots(1, 4, figsize=(18, 4))
    for ax, (key, ua_name) in zip(axes, MODELS_UA.items()):
        cm = np.array(data["models"][key]["confusion_matrix"])
        sns.heatmap(
            cm, annot=True, fmt="d",
            cmap="YlOrRd" if key == "Ensemble" else "Blues",
            xticklabels=["Synth", "Real"],
            yticklabels=["Synth", "Real"],
            ax=ax, linewidths=0.5,
            annot_kws={"size": 13},
        )
        acc = data["models"][key]["accuracy"] * 100
        ax.set_title(f"{ua_name}\nAcc={acc:.2f}%",
                     fontsize=11, fontweight="bold")
        ax.set_xlabel("Predicted", fontsize=9)
        ax.set_ylabel("Actual", fontsize=9)
    plt.suptitle("Матриці помилок по моделях", fontsize=13,
                 fontweight="bold", y=1.02)
    plt.tight_layout()
    p = out_dir / "all_confusion_matrices.png"
    plt.savefig(p, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"  ✓ {p.name}")


# ── 5. Зведена таблиця метрик (як рисунок) ───────────────────

def plot_metrics_table(data: dict, out_dir: Path):
    rows = []
    for key, ua in MODELS_UA.items():
        m = data["models"][key]
        rows.append([
            ua,
            f"{m['accuracy']*100:.2f}%",
            f"{m['precision_synth']*100:.2f}%",
            f"{m['recall_synth']*100:.2f}%",
            f"{m['f1_synth']*100:.2f}%",
            f"{m['auc_roc']*100:.2f}%",
        ])

    col_labels = ["Модель", "Accuracy", "Precision", "Recall", "F1-score", "AUC-ROC"]
    row_colors = [
        [REAL + "40"] * 6,
        [REAL + "40"] * 6,
        [REAL + "40"] * 6,
        [DARK + "30"] * 6,
    ]

    fig, ax = plt.subplots(figsize=(11, 2.8))
    ax.axis("off")
    tbl = ax.table(
        cellText=rows,
        colLabels=col_labels,
        cellLoc="center",
        loc="center",
        cellColours=row_colors,
    )
    tbl.auto_set_font_size(False)
    tbl.set_fontsize(11)
    tbl.scale(1, 1.8)

    for (r, c), cell in tbl.get_celld().items():
        if r == 0:
            cell.set_facecolor(DARK)
            cell.set_text_props(color="white", fontweight="bold")
        cell.set_edgecolor("white")

    ax.set_title("Результати тестування ансамблю SynthDetect\n"
                 f"(датасет: {data.get('dataset','AI-vs-Real')}, "
                 f"тестова вибірка: {data.get('test_size', 1400)} зображень)",
                 fontsize=11, pad=15)
    plt.tight_layout()
    p = out_dir / "metrics_table.png"
    plt.savefig(p, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"  ✓ {p.name}")


# ── 6. Radar chart — профіль кожної моделі ───────────────────

def plot_radar(data: dict, out_dir: Path):
    categories = ["Accuracy", "Precision", "Recall", "F1-score", "AUC-ROC"]
    N = len(categories)
    angles = [n / float(N) * 2 * np.pi for n in range(N)]
    angles += angles[:1]

    fig, ax = plt.subplots(figsize=(7, 7), subplot_kw=dict(polar=True))
    colors_list = [SYNTH, REAL, "#d4a0c0", DARK]

    for (key, ua), color in zip(MODELS_UA.items(), colors_list):
        m = data["models"][key]
        values = [
            m["accuracy"]       * 100,
            m["precision_synth"] * 100,
            m["recall_synth"]    * 100,
            m["f1_synth"]        * 100,
            m["auc_roc"]         * 100,
        ]
        values += values[:1]
        lw = 2.5 if key == "Ensemble" else 1.5
        ax.plot(angles, values, "o-", linewidth=lw, color=color, label=ua)
        ax.fill(angles, values, alpha=0.05, color=color)

    ax.set_xticks(angles[:-1])
    ax.set_xticklabels(categories, size=11)
    ax.set_ylim(88, 101)
    ax.set_yticks([90, 94, 98, 100])
    ax.set_yticklabels(["90%", "94%", "98%", "100%"], size=8)
    ax.set_title("Профіль метрик моделей", fontsize=13,
                 fontweight="bold", pad=20)
    ax.legend(loc="upper right", bbox_to_anchor=(1.35, 1.15), fontsize=10)
    plt.tight_layout()
    p = out_dir / "radar_chart.png"
    plt.savefig(p, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"  ✓ {p.name}")


# ── Main ──────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default="metrics_ensemble.json")
    parser.add_argument("--out",   default="charts")
    args = parser.parse_args()

    inp = Path(args.input)
    if not inp.exists():
        print(f"❌ Файл не знайдено: {inp}")
        return

    with open(inp, encoding="utf-8") as f:
        data = json.load(f)

    out_dir = Path(args.out)
    out_dir.mkdir(exist_ok=True)

    print(f"Генерація графіків з {inp} → {out_dir}/\n")
    plot_model_comparison(data, out_dir)
    plot_auc_bars(data, out_dir)
    plot_confusion_matrix(data, out_dir)
    plot_all_confusion_matrices(data, out_dir)
    plot_metrics_table(data, out_dir)
    plot_radar(data, out_dir)

    print(f"\n✓ Готово! 6 графіків у папці {out_dir}/")
    print("\nФайли:")
    for f in sorted(out_dir.glob("*.png")):
        print(f"  {f.name}")


if __name__ == "__main__":
    main()
