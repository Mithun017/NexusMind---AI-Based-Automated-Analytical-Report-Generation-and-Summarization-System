# 🔬 NexusMind — Deep Technical Specification: Machine Learning, AI Reasoning & Parameter Guide

This document provides a comprehensive technical breakdown of the **Machine Learning (ML)** models, **Knowledge Graph (Symbolic AI)** architecture, **Generative AI (LLM)** reasoning engine, and mathematical algorithms implemented in NexusMind.

---

## 📑 Table of Contents
1. [Core Architectural Philosophy: Deterministic Core + Symbolic KG + Interpretive LLM](#1-core-architectural-philosophy)
2. [Mathematical Preprocessing & Feature Engineering](#2-mathematical-preprocessing--feature-engineering)
3. [Deterministic Analytical Engine & Quality Metrics](#3-deterministic-analytical-engine--quality-metrics)
4. [Machine Learning Anomaly Detection: Isolation Forest](#4-machine-learning-anomaly-detection-isolation-forest)
5. [Knowledge Graph (Symbolic AI): Neo4j 10-Entity Engine](#5-knowledge-graph-symbolic-ai-neo4j-10-entity-engine)
6. [Generative AI & LLM Reasoning Layer](#6-generative-ai--llm-reasoning-layer)
7. [Comprehensive Parameter & Hyperparameter Guide](#7-comprehensive-parameter--hyperparameter-guide)
8. [Automated PDF Compilation Architecture](#8-automated-pdf-compilation-architecture)

---

## 1. Core Architectural Philosophy

A fundamental flaw in naive AI analytical systems is allowing generative LLMs to calculate numerical metrics (such as peak areas, retention times, and resolution scores) directly from raw text. This introduces non-determinism, floating-point hallucinations, and regulatory non-compliance.

NexusMind enforces a **strict three-tier decoupled pipeline**:

```
Tier 1: Deterministic Math & Preprocessing  --->  Zero LLM. Exact NumPy / Pandas / SciPy computation.
                                                   ↓
Tier 2: ML Outlier Detection & Graph Context --->  Scikit-Learn Isolation Forest + Neo4j Graph DB.
                                                   ↓
Tier 3: Generative AI Reasoning & Synthesis  --->  Groq (Llama-3.1) / OpenRouter strictly interprets Tier 1 & 2.
```

> 🛡️ **Hard Pipeline Rule**: The LLM is strictly the **last** stage. It receives pre-computed deterministic JSON numbers and is prompted under a strict zero-hallucination constraint. It is strictly forbidden from computing or modifying numeric values.

---

## 2. Mathematical Preprocessing & Feature Engineering

Located in: [`backend/services/preprocessing/preprocessor.py`](file:///c:/Users/MITHUN/Desktop/STUDIES/Business/3.NexusMind/NexusMind%20-%20AI-Based%20Automated%20Analytical%20Report%20Generation%20and%20Summarization%20System/Code/Development/backend/services/preprocessing/preprocessor.py)

Raw chromatography datasets undergo a canonical **7-step sequential transformation**:

### Step 1: Canonical Schema Renaming
Before any downstream module executes, specification column headers (Title-Case with spaces) are mapped to internal canonical `snake_case`:
```python
COLUMN_MAP = {
    "Sample ID":      "sample_id",
    "Retention Time": "retention_time",
    "Peak Area":      "peak_area",
    "Peak Height":    "peak_height",
    "Intensity":      "intensity",
    "Concentration":  "concentration",
    "Compound Name":  "compound_name",
    "Analysis Type":  "analysis_type",
}
```

### Step 2: Missing Value Imputation
- **Numeric Fields** (`peak_area`, `peak_height`, `intensity`, `concentration`, `retention_time`): Imputed using **Median Imputation** ($\tilde{x}$) to resist skew from extreme outliers:
  $$\tilde{x} = \text{median}(X_{\text{observed}})$$
- **Categorical Fields** (`compound_name`, `sample_id`, `analysis_type`): Imputed with `"Unknown"`.

### Step 3: Deduplication & Positional Index Reset
Deduplicates records on the identifying tuple `(sample_id, retention_time, compound_name)`.
Crucially, `df = df.reset_index(drop=True)` is called immediately to guarantee a contiguous $0 \dots N-1$ positional index, preventing index-alignment shift in ML arrays.

### Step 4: Min-Max Feature Normalization
Normalized versions of peak area, height, and intensity are generated for machine learning while preserving the original raw physical units for reporting:
$$x_{\text{norm}} = \frac{x - x_{\min}}{(x_{\max} - x_{\min}) + \epsilon}, \quad \text{where } \epsilon = 10^{-9}$$

### Step 5: Savitzky-Golay Noise Reduction Filtering
Smoothes normalized intensity profiles by fitting successive sub-sets of adjacent data points with a low-degree polynomial via linear least squares:
$$Y_j = \sum_{i=-\frac{m-1}{2}}^{\frac{m-1}{2}} C_i \, y_{j+i}$$

* **Guard Implementation**: If the dataset has fewer points than `sg_window_length` ($n < 4$), smoothing is automatically skipped or the window is dynamically shrunk to $w \le n-1$ (odd) to prevent SciPy filter crashes on small chromatographic peak sets.

### Step 6: Feature Extraction
1. **Relative Abundance ($RA_i$)**:
   $$RA_i = \left( \frac{\text{Peak Area}_i}{\sum_{k=1}^N \text{Peak Area}_k} \right) \times 100\%$$
2. **Signal-to-Noise Ratio ($SNR_i$)**:
   $$\sigma_{\text{baseline}} = \text{std}(\text{intensity}) + 10^{-9}$$
   $$SNR_i = \frac{\text{Peak Height}_i}{\sigma_{\text{baseline}}}$$
3. **Deterministic Peak Identifier**: Assigns format `PK-001`, `PK-002`, $\dots$, `PK-NNN`.

---

## 3. Deterministic Analytical Engine & Quality Metrics

Located in: [`backend/services/analytical/engine.py`](file:///c:/Users/MITHUN/Desktop/STUDIES/Business/3.NexusMind/NexusMind%20-%20AI-Based%20Automated%20Analytical%20Report%20Generation%20and%20Summarization%20System/Code/Development/backend/services/analytical/engine.py)

### Calculated Metrics
- **Total Peaks ($N$)**: Total count of cleaned chromatographic peaks.
- **Major Peaks**: Count of peaks where $RA_i > 5.0\%$.
- **Max Peak Area**: $\max(\text{peak\_area})$.
- **Average Intensity**: $\mu_{\text{intensity}} = \frac{1}{N} \sum_{i=1}^N \text{intensity}_i$.

### Analytical Quality Score Formula
The chromatographic run quality score is computed as the product of **Data Completeness** and **Peak Resolution Separation Proxy**:

$$\text{Completeness Ratio } (C) = 1.0 - \left( \frac{\text{Count of Missing/Null Essential Fields}}{N \times 4} \right)$$

$$\text{Peak Separation Proxy } (R) = \min\left(1.0, \, \max\left(0.4, \, \frac{\min(\Delta RT)}{0.20 \text{ min}}\right)\right)$$

$$\text{Quality Score} = \min\left(100.0, \, \max\left(0.0, \, \text{round}(C \times R \times 100.0, 1)\right)\right)$$

---

## 4. Machine Learning Anomaly Detection: Isolation Forest

Located in: [`backend/services/ml/isolation_forest.py`](file:///c:/Users/MITHUN/Desktop/STUDIES/Business/3.NexusMind/NexusMind%20-%20AI-Based%20Automated%20Analytical%20Report%20Generation%20and%20Summarization%20System/Code/Development/backend/services/ml/isolation_forest.py)

### Algorithm Mechanics
Isolation Forest is an unsupervised tree-based ensemble algorithm explicitly built to isolate anomalies rather than profile normal data points. 

Because anomalous chromatographic peaks (contaminants, severe peak tailing, unexpected degradation products, solvent spikes) have attribute values drastically different from standard calibrated peaks, they require fewer random recursive partitions to isolate in an Isolation Tree ($iTree$):

```
                     [All Peaks in Dataset]
                            /      \
                 (RT < 2.5 min)    (RT >= 2.5 min)
                     /                  \
             [Outlier PK-020]        [Sub-tree]
          (Isolated at Depth 1!)    (Isolated at Depth >= 8)
```

The anomaly score $s(x, n)$ for an instance $x$ across an ensemble of $n$ samples is defined as:
$$s(x, n) = 2^{-\frac{E(h(x))}{c(n)}}$$
where:
- $h(x)$ is the path length (number of edges traversed from root to termination leaf).
- $E(h(x))$ is the expected average path length over an ensemble of 100 Isolation Trees.
- $c(n)$ is the average path length of unsuccessful searches in a Binary Search Tree (BST):
  $$c(n) = 2 \left( \ln(n - 1) + 0.5772156649 \right) - \frac{2(n - 1)}{n}$$

### Input Feature Space
Every peak is scored in a 5-dimensional feature space:
$$\mathbf{x}_i = \begin{bmatrix} \text{retention\_time}_i \\ \text{peak\_area}_i \\ \text{peak\_height}_i \\ \text{intensity}_i \\ \text{concentration}_i \end{bmatrix}$$

### Decision Function & Severity Classification
Raw decision function output ($d(x) \in [-0.5, 0.5]$) where lower/negative values indicate higher anomalousness is inverted and mapped into a continuous probability $[0.0, 1.0]$:

$$\text{Anomaly Score } (S_i) = 1.0 - \left( \frac{d(x_i) - d_{\min}}{d_{\max} - d_{\min} + \epsilon} \right)$$
$$\text{Confidence Percentage } (C_i) = \text{round}(S_i \times 100.0, 1)$$

| Anomaly Score ($S_i$) | Prediction Label | Classification Category | UI Visual Indicator |
|---|---|---|---|
| **$S_i > 0.80$** or model label $-1$ | `is_anomaly: True` | **Confirmed Anomaly** | 🔴 Red Diamond Marker & Alert Badge |
| **$0.50 < S_i \le 0.80$** | `is_anomaly: False` | **Potential Anomaly** | 🟡 Amber Flag |
| **$S_i \le 0.50$** | `is_anomaly: False` | **Normal** | 🔵 Cyan Standard Peak |

---

## 5. Knowledge Graph (Symbolic AI): Neo4j 10-Entity Engine

Located in: [`backend/services/graph/`](file:///c:/Users/MITHUN/Desktop/STUDIES/Business/3.NexusMind/NexusMind%20-%20AI-Based%20Automated%20Analytical%20Report%20Generation%20and%20Summarization%20System/Code/Development/backend/services/graph/)

The Knowledge Graph captures multi-dimensional semantic relationships across the entire chemical sample lifecycle:

```
(:Sample {sample_id, mongo_id})
  ├── [:RUN_ON] ───────────────> (:Instrument {instrument_id, name, type})
  ├── [:CONTAINS] ─────────────> (:Compound {name, analysis_type_name})
  │                                ├── [:PRODUCED_BY] ──> (:AnalysisType {name})
  │                                └── [:PRODUCES] ─────> (:Peak {peak_id, area, height, snr, abundance})
  │                                                         ├── [:HAS] ─────────────> (:RetentionTime {value, unit})
  │                                                         │                           └── [:ASSOCIATED_WITH] ──> (:Finding {finding_id, desc, severity})
  │                                                         ├── [:HAS_CONCENTRATION] -> (:Concentration {value, unit})
  │                                                         └── [:HAS_ANOMALY] ──────> (:Anomaly {score, confidence, classification})
  └── [:HAS_INTERPRETATION] ───> (:Interpretation {interpretation_id, text, llm_model, generated_at})
```

### Schema Uniqueness Constraints
Executed idempotently at startup in `schema.py`:
- `Sample`: `s.sample_id IS UNIQUE`
- `Compound`: `c.name IS UNIQUE`
- `Peak`: `p.peak_id IS UNIQUE`
- `Instrument`: `i.instrument_id IS UNIQUE`
- `AnalysisType`: `at.name IS UNIQUE`
- `Finding`: `f.finding_id IS UNIQUE`
- `Anomaly`: `an.anomaly_id IS UNIQUE`
- `Interpretation`: `ip.interpretation_id IS UNIQUE`

### Decoupled 2-Phase Graph Writer
1. **`write_analysis_entities(analysis)`**: Executed upon analytical completion. Merges nodes and creates graph topologies with deterministic anomaly identifiers (`{scoped_peak_id}_anomaly`).
2. **`write_interpretation(analysis_id, text, model)`**: Executed only after LLM generation completes, attaching the interpretation node without touching or duplicating analytical entities.

---

## 6. Generative AI & LLM Reasoning Layer

Located in: [`backend/services/llm/`](file:///c:/Users/MITHUN/Desktop/STUDIES/Business/3.NexusMind/NexusMind%20-%20AI-Based%20Automated%20Analytical%20Report%20Generation%20and%20Summarization%20System/Code/Development/backend/services/llm/)

### Multi-Provider Failover Architecture (`LLMRouter`)
NexusMind implements a resilient provider router pattern:
```
                [PromptBuilder Request]
                          │
                          ▼
               +──────────────────────+
               |  Primary Provider    |
               |  (Groq Cloud API)    |
               +----------+-----------+
                          │
         Success? ───────┴──────── Fail? (429 RateLimit / 5xx / Timeout)
            │                         │
            ▼                         ▼
   [Return Response]       +──────────────────────+
                           |  Fallback Provider   |
                           |  (OpenRouter API)    |
                           +----------+-----------+
                                      │
                                      ▼
                             [Return Response]
```

### Zero-Hallucination Prompt Engineering
The system prompt injects immutable behavioral boundaries:
```text
You are NexusMind Analytical Intelligence Engine, an expert analytical chemist.
You will be provided with structured analytical results, ML anomaly detection results, and knowledge-graph context as JSON.

CRITICAL INSTRUCTIONS:
1. Do NOT invent, adjust, or recompute any numeric value. Only interpret the values given to you.
2. Every retention time, peak area, concentration, anomaly score, and KPI mentioned in your summary MUST match the exact numbers provided in the input payload.
3. Provide a clear, professional, scientific interpretation and actionable recommendations.
4. Output valid JSON adhering to the schema.
```

### Structured Output Schema
The model returns structured JSON containing 4 analytical sections:
- `interpretation`: Expert narrative summarizing chromatographic run purity and baseline resolution.
- `summary.important_peaks`: Highlighted observations for major peaks.
- `summary.recommendations`: Concrete laboratory action items (e.g. column re-equilibration, recalibration).
- `summary.conclusion`: Final analytical compliance sign-off.

---

## 7. Comprehensive Parameter & Hyperparameter Guide

All parameters are **fully configurable via `.env`** without requiring code modifications:

| Environment Variable | Default Value | Data Type | Purpose & Impact |
|---|---|---|---|
| `GROQ_MODEL` | `llama-3.1-8b-instant` | `str` | Primary LLM model on Groq Cloud. Switch to `llama-3.3-70b-versatile` for heavier chemical reasoning. |
| `OPENROUTER_MODEL` | `mistralai/mixtral-8x7b-instruct` | `str` | Secondary fallback model when Groq is unavailable. |
| `LLM_PROVIDER` | `groq` | `str` | Default provider routing (`groq` or `openrouter`). |
| `ML_CONTAMINATION` | `0.1` (10%) | `float` / `str` | Expected proportion of outliers in the dataset for Isolation Forest. Can be set to `"auto"` for automatic thresholding. |
| `ML_RANDOM_STATE` | `42` | `int` | Seed for Isolation Forest pseudo-random number generator ensuring 100% deterministic anomaly scoring across identical runs. |
| `SG_WINDOW_LENGTH` | `5` | `int` | Number of data points used in the Savitzky-Golay smoothing filter window (must be an odd integer). |
| `SG_POLYORDER` | `2` | `int` | Polynomial order fitted during Savitzky-Golay noise reduction (must be less than window length). |
| `UPLOAD_MAX_SIZE_MB` | `50` | `int` | Maximum allowed upload payload size in Megabytes (returns HTTP 413 if exceeded). |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:8080,http://localhost:5173` | `str` | Comma-separated list of allowed browser origins for CORS middleware. |
| `VITE_API_URL` | `http://localhost:8000/api/v1` | `str` | Base API URL baked into frontend client build. |

---

## 8. Automated PDF Compilation Architecture

Located in: [`backend/services/report/`](file:///c:/Users/MITHUN/Desktop/STUDIES/Business/3.NexusMind/NexusMind%20-%20AI-Based%20Automated%20Analytical%20Report%20Generation%20and%20Summarization%20System/Code/Development/backend/services/report/)

PDF reports are compiled server-side without a headless browser using **ReportLab 4.x** and **Matplotlib (Agg backend)**:

1. **`chart_renderer.py`**:
   - Generates high-resolution (200 DPI) stem/chromatogram plot and anomaly distribution bar chart as in-memory PNG bytes.
2. **`context_builder.py`**:
   - Assembles `ReportContext` containing sample metadata, computed KPIs, full peak records, anomaly results, KG findings, and charts.
3. **`pdf_generator.py`**:
   - Generates a **10-Section Document**:
     1. **Cover & Title Header** (NexusMind branding, Sample ID, Date, Analyst)
     2. **Sample & Run Information** (Format, Analysis Type, Cleaned Record Count)
     3. **Analytical KPIs Table** (Total Peaks, Major Peaks, Quality Score %, Max Area, Intensity)
     4. **Chromatogram Visual** (Embedded High-Resolution PNG)
     5. **Detailed Peak Analysis Table** (Per-peak RT, Area, Height, Conc, Abundance, S/N)
     6. **Machine Learning Anomaly Results** (Anomaly Score distribution chart & severity table)
     7. **Knowledge Graph Relationships & Findings** (Contextual findings and compound associations)
     8. **AI-Assisted Analytical Interpretation & Summary** (LLM interpretation and observations)
     9. **Actionable Recommendations** (Next-step bulleted lab recommendations)
     10. **Final Conclusion & QA Sign-Off** (Regulatory review block and signature lines)

---

## 📌 Technical Summary

NexusMind bridges the gap between **rigorous mathematical analytical chemistry** and **modern AI reasoning**:
- **Deterministic accuracy** where math is required.
- **Unsupervised statistical learning** where anomalies must be flagged.
- **Relational graph topologies** where chemical context is needed.
- **Generative AI** where human-readable synthesis and actionable advice add value.
