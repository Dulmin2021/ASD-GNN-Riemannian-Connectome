# ASD GNN Riemannian Connectome

<div align="center">
  <h3>Explainable Graph Attention Networks & Riemannian Geometric Harmonization<br/>for Multi-Site Autism Spectrum Disorder Classification</h3>
  <p>
    <img src="https://img.shields.io/badge/Python-3.10-blue?logo=python" />
    <img src="https://img.shields.io/badge/PyTorch_Geometric-2.x-orange?logo=pytorch" />
    <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react" />
    <img src="https://img.shields.io/badge/FastAPI-0.110-009688?logo=fastapi" />
    <img src="https://img.shields.io/badge/ABIDE_I-N=871-navy" />
    <img src="https://img.shields.io/badge/Accuracy-82.3%25-green" />
  </p>
</div>

---

## Overview

This repository contains the complete research codebase, thesis draft, and clinical web application for **ASD Connectome** — a dual-paradigm neuroimaging AI system that combines:

- **Explainable Graph Attention Networks (GAT)** with DropEdge regularisation and dual global readout pooling
- **Riemannian Geometric Harmonization** via tangent space projection on the SPD manifold S++¹¹⁶
- **GNNExplainer** for 15-node salient biomarker subgraph extraction
- **Integrated Gradients (IG)** for node-level temporal feature attribution

Evaluated on the **ABIDE I consortium** (N = 871 subjects, 17 imaging sites), achieving **82.3% accuracy** and **AUC = 0.871**.

---

## Repository Structure

```
├── webapp/                  # React + Vite clinical web application
│   ├── src/
│   │   ├── api/client.js    # FastAPI client + demo mode
│   │   ├── components/      # RiskGauge, BiomarkerGraph, SiteTable, Charts
│   │   └── pages/           # Upload, Results, Explainability, Dashboard
│   └── package.json
├── notebooks/               # Jupyter analysis notebooks
│   ├── 02_functional_connectivity.ipynb
│   ├── 03_graph_construction.ipynb
│   ├── 04_gnn_training.ipynb
│   └── 05_model_evaluation.ipynb
├── research_papers/         # 22 verified reference papers
├── Thesis_Complete_Draft_Submission_v02.pdf   # 92-page thesis draft
└── requirements.txt
```

---

## Web Application

### Features

| Page | Description |
|------|-------------|
| **Upload** | Drag-and-drop `.nii` / `.nii.gz` fMRI scan + site selector |
| **Results** | ASD risk gauge, 95% CI, ensemble model breakdown |
| **Explainability** | Interactive D3 15-node biomarker network + IG feature attribution |
| **Dashboard** | 17-site benchmark table + 6-model comparison chart |

### Quick Start (Demo Mode — no backend needed)

```bash
cd webapp
npm install
npm run dev
# Open http://localhost:3000
```

### Full Stack (with FastAPI backend)

```bash
# Backend (from repo root)
pip install -r requirements.txt
uvicorn src.api:app --port 8000

# Frontend
cd webapp
npm run dev
```

### Docker

```bash
docker build -t asd-connectome .
docker run -p 8000:8000 asd-connectome
```

---

## Pipeline

```
4D fMRI NIfTI
     │
     ▼ AAL-116 Atlas Parcellation
     │
     ▼ BOLD Temporal Moment Engineering (μ, σ, γ₁, γ₂, P, σ²)
     │
     ├──▶ Sparse Graph (80th percentile) ──▶ GAT (3-layer, K=4 heads, DropEdge)
     │
     └──▶ Ledoit-Wolf Covariance ──▶ Riemannian Tangent Space ──▶ ComBat ──▶ SVM
     │
     ▼ Calibrated Ensemble (0.60 × GAT + 0.40 × Riemannian)
     │
     ▼ GNNExplainer → 15-node Biomarker Subgraph
```

---

## Results

| Model | Accuracy | AUC | F1 |
|-------|----------|-----|-----|
| GCN | 70.3% | 0.748 | 0.698 |
| GAT (basic) | 74.1% | 0.783 | 0.736 |
| ASD-DiagNet | 74.8% | 0.790 | 0.743 |
| Riemannian + SVM | 76.9% | 0.812 | 0.764 |
| **GAT + Riemannian (Ours)** | **82.3%** | **0.871** | **0.819** |

---

## Citation

```
Dulmin et al. (2026). Explainable Graph Attention Networks and Riemannian Geometric
Harmonization for Multi-Site Autism Spectrum Disorder Classification and Functional
Biomarker Discovery. Master's Thesis, Department of Computer Science & Engineering.
```

---

## License

MIT License — see [LICENSE](LICENSE)
