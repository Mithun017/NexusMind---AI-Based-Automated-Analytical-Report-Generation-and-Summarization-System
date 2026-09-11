# 🔬 NexusMind — Deep Technical Specification: Machine Learning, AI Reasoning & Workflow Guide

This document provides a comprehensive technical breakdown of the **Machine Learning (ML)** models, **Large Language Models (LLMs)**, **Knowledge Graph (Symbolic AI)** architecture, **Frontend/Backend Tech Stacks**, and an end-to-end **Mermaid Workflow Chart** implemented in NexusMind.

---

## 📑 Table of Contents
1. [Core Architectural Philosophy](#1-core-architectural-philosophy)
2. [End-to-End Mermaid Technical Workflow](#2-end-to-end-mermaid-technical-workflow)
3. [Technology Stack Matrix (Frontend, Backend & DB)](#3-technology-stack-matrix)
4. [Machine Learning Models & Parameters](#4-machine-learning-models--parameters)
5. [Large Language Models (LLMs) & Provider Orchestration](#5-large-language-models-llms--provider-orchestration)
6. [Mathematical Preprocessing & Feature Engineering](#6-mathematical-preprocessing--feature-engineering)
7. [Deterministic Analytical Engine & Quality Metrics](#7-deterministic-analytical-engine--quality-metrics)
8. [Knowledge Graph (Symbolic AI): Neo4j 10-Entity Engine](#8-knowledge-graph-symbolic-ai-neo4j-10-entity-engine)
9. [Automated PDF Compilation Architecture](#9-automated-pdf-compilation-architecture)
10. [Comprehensive Parameter & Hyperparameter Guide](#10-comprehensive-parameter--hyperparameter-guide)

---

## 1. Core Architectural Philosophy

A critical engineering principle of NexusMind is the strict separation between **deterministic computation** and **generative interpretation**:

```
Tier 1: Deterministic Engine   --->  Zero LLM. Exact NumPy / Pandas / SciPy math.
                                      ↓
Tier 2: ML Anomaly & Graph KG  --->  Scikit-Learn Isolation Forest + Neo4j Graph DB.
                                      ↓
Tier 3: Generative AI (LLM)    --->  Groq / OpenRouter strictly interprets Tier 1 & 2 numbers.
```

> 🛡️ **Zero-Hallucination Mandate**: The LLM is strictly the **last** stage. It receives pre-computed deterministic JSON data and is prompted under strict constraints: *"Do NOT invent, recalculate, or modify any numeric value."*

---

## 2. End-to-End Mermaid Technical Workflow

```mermaid
flowchart TD
    subgraph INGESTION["1. INGESTION & VALIDATION LAYER"]
        A[Client Uploads .CSV or .XLSX] --> B[FastAPI /api/v1/upload]
        B --> C{FileValidator}
        C -- Legacy .xls / Corrupt --> D[Return 422 Unprocessable Entity]
        C -- File > 50MB --> E[Return 413 Payload Too Large]
        C -- Valid Format --> F[LocalStorageBackend: /app/uploads]
        F --> G[Insert Upload Document in MongoDB]
    end

    subgraph PREPROCESSING["2. CANONICAL PREPROCESSING PIPELINE (7 STEPS)"]
        G --> H[POST /api/v1/analyze/{upload_id}]
        H --> I[Step 1: Canonical COLUMN_MAP Rename to snake_case]
        I --> J[Step 2: Median & Categorical Imputation]
        J --> K[Step 3: Deduplication + reset_index drop=True]
        K --> L[Step 4: Min-Max Feature Normalization]
        L --> M[Step 5: Guarded Savitzky-Golay Noise Reduction]
        M --> N[Step 6: SNR & Relative Abundance Extraction]
        N --> O[Step 7: Canonical DataFrame Generated]
    end

    subgraph ANALYTICS_ML["3. DETERMINISTIC ENGINE & ML ANOMALY DETECTION"]
        O --> P[AnalyticalEngine]
        P --> Q[Calculate Total/Major Peaks, Max Area, Quality Score]
        
        O --> R[IsolationForestDetector]
        R --> S[Fit Model on 5D Feature Space]
        S --> T[Predict Decision Function -> Invert to Anomaly Score 0-1]
        T --> U[Classify: Normal / Potential / Confirmed Anomaly]
    end

    subgraph STORAGE_GRAPH["4. PERSISTENCE & KNOWLEDGE GRAPH (NEO4J)"]
        Q & U --> V[Insert Analysis Document in MongoDB]
        V --> W[write_analysis_entities]
        W --> X[(Neo4j Graph Database)]
        X --> Y[Structure 10 Entity Types: Sample, Compound, Peak, RT, Anomaly...]
    end

    subgraph LLM_REASONING["5. AI REASONING & MULTI-PROVIDER LLM LAYER"]
        V --> Z[POST /api/v1/summary/{analysis_id}]
        Z --> AA[get_analysis_context from Neo4j]
        AA --> AB[PromptBuilder: JSON Payload + Strict System Prompt]
        AB --> AC{LLMRouter}
        AC -- Primary --> AD[Groq API: llama-3.1-8b-instant]
        AC -- 429 / Failover --> AE[OpenRouter API: mistralai/mixtral-8x7b-instruct]
        AD & AE --> AF[Parse JSON Response: Interpretation + Recommendations]
        AF --> AG[Update Analysis Document in MongoDB]
        AG --> AH[write_interpretation -> Link Node in Neo4j]
    end

    subgraph REPORT_UI["6. REPORT GENERATION & REACT DASHBOARD"]
        AG --> AI[POST /api/v1/report/{analysis_id}]
        AI --> AJ[ChartRenderer: Headless Matplotlib PNGs]
        AJ --> AK[PDFReportGenerator: ReportLab 10-Section Document]
        AK --> AL[Save PDF in /app/reports & Stream /download]
        
        AG --> AM[React 18 Frontend UI]
        AM --> AN[KPICards: Count-up Animation]
        AM --> AO[Chromatogram: Interactive Plotly.js]
        AM --> AP[PeakTable: Responsive Stacked Cards]
        AM --> AQ[AnomalyPanel: Severity Cards]
        AM --> AR[GraphVisualization: Entity Network]
        AM --> AS[AISummaryPanel: Collapsible AI Insights]
        AM --> AT[ReportActions: PDF Preview & Download]
    end
```

---

## 3. Technology Stack Matrix

### 🖥️ Frontend Stack
| Component / Library | Exact Version | Purpose & Technical Role |
|---|---|---|
| **React** | `^18.2.0` | Core UI component framework and state management. |
| **Vite** | `^5.1.5` | Next-generation frontend build tool and hot-module replacement (HMR) server. |
| **Styling Architecture** | **Plain CSS / CSS Modules** | Zero-framework styling. Custom properties design system in [`tokens.css`](file:///c:/Users/MITHUN/Desktop/STUDIES/Business/3.NexusMind/NexusMind%20-%20AI-Based%20Automated%20Analytical%20Report%20Generation%20and%20Summarization%20System/Code/Development/frontend/src/styles/tokens.css) with glassmorphism and media query breakpoints (`--bp-sm: 480px`, `--bp-md: 768px`, `--bp-lg: 1280px`). *Tailwind & Bootstrap strictly prohibited.* |
| **Plotly.js (Dist-Min)** | `^2.30.0` | Scientific, interactive chromatography visualization (zoom, pan, stem markers, anomaly highlights, hovercards). |
| **Recharts** | `^2.12.2` | Secondary analytical charts and metric trends. |
| **Lucide React** | `^0.354.0` | Modern SVG iconography across navigation, badges, and dashboard headers. |
| **Axios** | `^1.6.7` | Centralized HTTP client with global interceptors for `/api/v1` endpoints. |
| **React Router DOM** | `^6.22.3` | Client-side routing (`/`, `/dashboard/:analysisId`, `/history`, `/report/:reportId`). |
| **Nginx (Production)** | `alpine` | Multi-stage Docker production web server with SPA deep-link fallback routing (`try_files $uri $uri/ /index.html`). |

---

### ⚙️ Backend Stack
| Component / Library | Exact Version | Purpose & Technical Role |
|---|---|---|
| **Python** | `3.11-slim` | Core backend runtime environment. |
| **FastAPI** | `0.110.0` | High-performance asynchronous REST API framework with automatic OpenAPI documentation. |
| **Uvicorn (Standard)** | `0.28.0` | Lightning-fast ASGI web server implementation. |
| **Pydantic** | `2.6.4` | Data validation, schema definition, and serialization. |
| **Pydantic Settings** | `2.2.1` | Environment variable management (`.env`) with typed `Settings` model. |
| **Pandas** | `2.2.1` | Data manipulation, column restructuring, deduplication, and tabular analytics. |
| **NumPy** | `1.26.4` | High-performance vector arrays and statistical operations. |
| **SciPy** | `1.12.0` | Advanced scientific signal processing (Savitzky-Golay noise filtering). |
| **Scikit-Learn** | `1.4.1.post1` | Machine Learning algorithms (**Isolation Forest** anomaly detector). |
| **OpenPyXL** | `3.1.2` | Modern Excel (`.xlsx`) parsing and byte streaming. |
| **ReportLab** | `4.1.0` | Low-level server-side PDF document generation and flowable layouts. |
| **Matplotlib** | `3.8.3` | Non-interactive headless chart rendering (`Agg` backend) to PNG byte buffers. |
| **Groq SDK** | `0.4.2` | Asynchronous client for ultra-low latency Groq Cloud LLM inference. |
| **HTTPX** | `0.27.0` | Asynchronous HTTP client for OpenRouter fallback completions and model catalog verification. |
| **Python-Multipart** | `0.0.9` | Multipart form-data handling for file uploads. |
| **Pytest & Pytest-Asyncio**| `8.1.1` / `0.23.5` | Automated test runner for unit and asynchronous integration test suites. |

---

### 🗄️ Database & Container Stack
| Database / Infrastructure | Version | Purpose & Technical Role |
|---|---|---|
| **MongoDB** | `7.0` | Primary document database storing uploads, samples, analyses, and report metadata. |
| **Motor** | `3.3.2` | Asynchronous Python driver for MongoDB. |
| **Beanie ODM** | `1.25.0` | Asynchronous Object-Document Mapper built on top of Pydantic and Motor. |
| **Neo4j** | `5.x Community` | Native Graph Database modeling 10 chemical and operational entity types. |
| **Neo4j Python Driver** | `5.18.0` | Official asynchronous Bolt protocol driver for executing parameterized Cypher queries. |
| **Docker & Docker Compose**| Multi-stage | Containerization of all 4 services with 4 persistent named volumes (`mongo_data`, `neo4j_data`, `uploads_data`, `reports_data`). |

---

## 4. Machine Learning Models & Parameters

### 🌲 Model Name: **Isolation Forest (`IsolationForest`)**
* **Library:** `scikit-learn.ensemble.IsolationForest`
* **File Location:** [`backend/services/ml/isolation_forest.py`](file:///c:/Users/MITHUN/Desktop/STUDIES/Business/3.NexusMind/NexusMind%20-%20AI-Based%20Automated%20Analytical%20Report%20Generation%20and%20Summarization%20System/Code/Development/backend/services/ml/isolation_forest.py)
* **Model Nature:** Unsupervised Multi-Dimensional Tree-Based Ensemble.

### 🎯 Objective
To identify anomalous chromatographic peaks (contaminants, unexpected solvent spikes, severe tailing/fronting, degradation byproducts) without requiring labeled training datasets.

### 📐 Mathematical Formulation
The algorithm isolates anomalies by randomly selecting a feature and randomly selecting a split value between the maximum and minimum values of that feature. 

The anomaly score $s(x, n)$ for an instance $x$ across $n$ samples is given by:
$$s(x, n) = 2^{-\frac{E(h(x))}{c(n)}}$$
where:
- $h(x)$ is the path length (edges traversed from root to terminating leaf).
- $E(h(x))$ is the average path length across an ensemble of 100 Isolation Trees ($iTrees$).
- $c(n)$ is the average path length of unsuccessful searches in a Binary Search Tree:
  $$c(n) = 2 \left( \ln(n - 1) + 0.5772156649 \right) - \frac{2(n - 1)}{n}$$

### 🎛️ Hyperparameters & Input Features

#### 1. Input Features ($5\text{D}$ Space):
1. `retention_time` (RT in minutes)
2. `peak_area` (Integrated peak area)
3. `peak_height` (Max peak height in mAU)
4. `intensity` (Detector intensity)
5. `concentration` (Calculated compound concentration)

#### 2. Model Hyperparameters:
| Hyperparameter | Value in NexusMind | Config Source | Technical Justification |
|---|---|---|---|
| `n_estimators` | `100` | Code constant | 100 Isolation Trees provide optimal ensemble stability and score convergence. |
| `contamination` | `0.1` (10%) | `Settings.ml_contamination` (`.env`) | Small chromatographic peak sets (<50 rows) suffer from instability under `contamination="auto"`. A configurable float default of `0.1` provides robust outlier detection. |
| `random_state` | `42` | `Settings.ml_random_state` (`.env`) | Ensures 100% deterministic, reproducible anomaly scores across identical datasets. |

#### 3. Positional Alignment & Score Normalization:
Because deduplication in preprocessing can leave gaps in DataFrame index labels (`[0, 1, 3, 5, 8]`), `predict()` enforces `df = df.reset_index(drop=True)` and iterates positionally:
```python
normalized = 1.0 - (scores - min_s) / (max_s - min_s + 1e-9)
for pos, (_, row) in enumerate(df_aligned.iterrows()):
    score = float(normalized[pos])
    is_anomaly = bool(labels[pos] == -1)
```

#### 4. Severity Classification:
- **`Confirmed Anomaly`**: Anomaly Score $> 0.80$ or model prediction label $-1$.
- **`Potential Anomaly`**: $0.50 < \text{Anomaly Score} \le 0.80$.
- **`Normal`**: Anomaly Score $\le 0.50$.

---

## 5. Large Language Models (LLMs) & Provider Orchestration

Located in: [`backend/services/llm/`](file:///c:/Users/MITHUN/Desktop/STUDIES/Business/3.NexusMind/NexusMind%20-%20AI-Based%20Automated%20Analytical%20Report%20Generation%20and%20Summarization%20System/Code/Development/backend/services/llm/)

### 🤖 LLM Models Employed

| Provider | Model Identifier | Role | Characteristics |
|---|---|---|---|
| **Groq Cloud API** *(Primary)* | **`llama-3.1-8b-instant`** | Primary Real-time Inference | Extremely fast (~500 tokens/sec), cost-effective, high precision for structured JSON extraction and interpretation. |
| **Groq Cloud API** *(Heavy Option)* | **`llama-3.3-70b-versatile`** | Advanced Chemical Reasoning | Stronger reasoning depth; activated via `.env` without code modifications. |
| **OpenRouter API** *(Fallback)* | **`mistralai/mixtral-8x7b-instruct`** | Automated Secondary Failover | High-capacity Mixture-of-Experts fallback triggered on Groq rate-limits (HTTP 429) or service outages. |

### 🔀 Failover Architecture (`LLMRouter`)
```python
class LLMRouter:
    def __init__(self, providers: List[LLMProvider]):
        self.providers = providers  # [GroqProvider, OpenRouterProvider]

    async def complete(self, system_prompt: str, user_message: str) -> str:
        for provider in self.providers:
            try:
                return await provider.complete(system_prompt, user_message)
            except LLMProviderError as e:
                logger.warning(f"Provider {type(provider).__name__} failed: {e}; trying next fallback...")
        raise LLMProviderError("All LLM providers failed.")
```

### 🌡️ Inference Parameters
- **`temperature`**: `0.2` (Low temperature guarantees consistent, factual scientific prose without creative drifting).
- **`timeout`**: `60.0` seconds.

### 🛡️ Strict Prompt Guardrails
The system prompt injects absolute boundaries:
```text
You are NexusMind Analytical Intelligence Engine, an expert analytical chemist and chromatographer.
You will be provided with structured analytical results, ML anomaly detection results, and knowledge-graph context as JSON.

CRITICAL INSTRUCTIONS:
1. Do NOT invent, adjust, or recompute any numeric value. Only interpret the values given to you.
2. Every retention time, peak area, concentration, anomaly score, and KPI mentioned in your summary MUST match the exact numbers provided in the input payload.
3. Provide a clear, professional, scientific interpretation and actionable recommendations.
4. You must output a valid JSON object matching the requested schema exactly.
```

---

## 6. Mathematical Preprocessing & Feature Engineering

Located in: [`backend/services/preprocessing/preprocessor.py`](file:///c:/Users/MITHUN/Desktop/STUDIES/Business/3.NexusMind/NexusMind%20-%20AI-Based%20Automated%20Analytical%20Report%20Generation%20and%20Summarization%20System/Code/Development/backend/services/preprocessing/preprocessor.py)

### Mathematical Formulas:

#### 1. Min-Max Normalization:
$$x_{\text{norm}} = \frac{x - x_{\min}}{(x_{\max} - x_{\min}) + \epsilon}, \quad \text{where } \epsilon = 10^{-9}$$

#### 2. Savitzky-Golay Smoothing Filter:
$$Y_j = \sum_{i=-\frac{m-1}{2}}^{\frac{m-1}{2}} C_i \, y_{j+i}$$
- **Parameters**: `window_length = 5`, `polyorder = 2`.
- **Small-Dataset Guard**: If $n < 4$, filter is bypassed; if $n \ge 4$, window is dynamically clamped to $w = \min(w, n-1 \text{ if odd else } n-2)$ to avoid SciPy dimensional errors.

#### 3. Relative Abundance ($RA_i$):
$$RA_i = \left( \frac{\text{Peak Area}_i}{\sum_{k=1}^N \text{Peak Area}_k} \right) \times 100\%$$

#### 4. Signal-to-Noise Ratio ($SNR_i$):
$$\sigma_{\text{baseline}} = \text{std}(\text{intensity}) + 10^{-9}$$
$$SNR_i = \frac{\text{Peak Height}_i}{\sigma_{\text{baseline}}}$$

---

## 7. Deterministic Analytical Engine & Quality Metrics

Located in: [`backend/services/analytical/engine.py`](file:///c:/Users/MITHUN/Desktop/STUDIES/Business/3.NexusMind/NexusMind%20-%20AI-Based%20Automated%20Analytical%20Report%20Generation%20and%20Summarization%20System/Code/Development/backend/services/analytical/engine.py)

### Quality Score Calculation:
$$\text{Completeness Ratio } (C) = 1.0 - \left( \frac{\text{Missing/Null Essential Values}}{N \times 4} \right)$$

$$\text{Peak Separation Proxy } (R) = \min\left(1.0, \, \max\left(0.4, \, \frac{\min(\Delta RT)}{0.20 \text{ min}}\right)\right)$$

$$\text{Quality Score} = \min\left(100.0, \, \max\left(0.0, \, \text{round}(C \times R \times 100.0, 1)\right)\right)$$

---

## 8. Knowledge Graph (Symbolic AI): Neo4j 10-Entity Engine

Located in: [`backend/services/graph/`](file:///c:/Users/MITHUN/Desktop/STUDIES/Business/3.NexusMind/NexusMind%20-%20AI-Based%20Automated%20Analytical%20Report%20Generation%20and%20Summarization%20System/Code/Development/backend/services/graph/)

### 10 Connected Entity Types:
1. `(:Sample {sample_id, mongo_id})`
2. `(:Instrument {instrument_id, name, type})`
3. `(:AnalysisType {name})`
4. `(:Compound {name, analysis_type_name})`
5. `(:Peak {peak_id, area, height, snr, relative_abundance, is_anomaly})`
6. `(:RetentionTime {value, unit: "min"})`
7. `(:Concentration {value, unit: "mg/L"})`
8. `(:Finding {finding_id, description, severity})`
9. `(:Anomaly {anomaly_id, score, confidence, classification})`
10. `(:Interpretation {interpretation_id, text, llm_model, generated_at})`

---

## 9. Automated PDF Compilation Architecture

Located in: [`backend/services/report/`](file:///c:/Users/MITHUN/Desktop/STUDIES/Business/3.NexusMind/NexusMind%20-%20AI-Based%20Automated%20Analytical%20Report%20Generation%20and%20Summarization%20System/Code/Development/backend/services/report/)

* **Chart Engine**: Matplotlib with headless `Agg` backend rendering 200 DPI PNG buffers.
* **Document Engine**: ReportLab `SimpleDocTemplate` rendering a **10-Section Document**:
  1. Cover Page & Header
  2. Sample & Run Information
  3. Analytical KPIs Table
  4. Embedded Chromatogram Plot
  5. Detailed Peak Analysis Table
  6. Machine Learning Anomaly Detection Results
  7. Knowledge Graph Relationships & Findings
  8. AI-Based Analytical Summary & Interpretation
  9. Actionable Recommendations
  10. Final Conclusion & QA Sign-Off Block

---

## 10. Comprehensive Parameter & Hyperparameter Guide

All parameters are configured via `.env` and loaded through `backend/config.py`:

```env
# ── Database ──────────────────────────────────────────────
MONGO_URI=mongodb://mongodb:27017
MONGO_DB_NAME=nexusmind
NEO4J_URI=bolt://neo4j:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=changeme

# ── LLM Configuration ─────────────────────────────────────
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.1-8b-instant
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_MODEL=mistralai/mixtral-8x7b-instruct
LLM_PROVIDER=groq

# ── ML Hyperparameters ────────────────────────────────────
ML_CONTAMINATION=0.1
ML_RANDOM_STATE=42

# ── Preprocessing Parameters ──────────────────────────────
SG_WINDOW_LENGTH=5
SG_POLYORDER=2
UPLOAD_MAX_SIZE_MB=50

# ── Networking & CORS ─────────────────────────────────────
CORS_ALLOWED_ORIGINS=http://localhost:8080,http://localhost:5173
VITE_API_URL=http://localhost:8000/api/v1
```
