# NexusMind — AI-Based Automated Analytical Report Generation & Summarization System

NexusMind is an enterprise-grade analytical intelligence platform that ingests raw chromatography (HPLC, GC) and mass spectrometry datasets (CSV/Excel), runs them through a deterministic data-science and ML pipeline, connects all entities to a Neo4j Knowledge Graph, and generates comprehensive AI-interpreted 10-section PDF analytical reports.

---

## 🏗️ Architecture Overview

```
[ Raw CSV / Excel (.xlsx) ]
            │
            ▼
┌────────────────────────────────────────────────────────┐
│ 1. Ingestion & Validation Layer (FastAPI)              │
│    • Extension & magic byte verification               │
│    • Spec column schema validation                     │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ 2. Preprocessing Pipeline                              │
│    • Step 1: COLUMN_MAP canonical rename to snake_case │
│    • Step 2: Missing value median/categorical impute   │
│    • Step 3: Duplicate removal & contiguous re-index   │
│    • Step 4: Min-Max feature normalization             │
│    • Step 5: Savitzky-Golay noise filtering (guarded)  │
│    • Step 6: Relative abundance & SNR extraction       │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ 3. Deterministic Analytical Engine & ML Anomaly        │
│    • Total/Major peaks, max area, avg intensity        │
│    • Data completeness & resolution quality score      │
│    • Isolation Forest ML anomaly detector (per-dataset)│
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ 4. Knowledge Graph Layer (Neo4j)                       │
│    • 10 Entity Types: Sample, Compound, Peak, RT,      │
│      Concentration, Instrument, AnalysisType, Finding, │
│      Anomaly, Interpretation                           │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ 5. AI Reasoning & LLM Provider Layer                   │
│    • Strict prompt: "Do NOT invent numeric values"     │
│    • Groq (llama-3.1-8b-instant) → OpenRouter failover │
│    • Synthesis of chromatogram findings & action items │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ 6. Automated 10-Section PDF Report (ReportLab)         │
│    • Cover, Sample Info, KPIs, Embedded Chromatogram,  │
│      Peak Table, ML Anomalies, KG Findings, AI Summary,│
│      Recommendations, and QA Sign-Off Block            │
└────────────────────────────────────────────────────────┘
```

> ⚠️ **Strict Pipeline Integrity Mandate:** The LLM is strictly the **last** stage. It only explains and summarizes computed numbers. It **never** computes KPIs or peak values.

---

## 🚀 Quickstart Guide

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) & Docker Compose
- API Key for [Groq](https://console.groq.com) (or [OpenRouter](https://openrouter.ai))

### 1. Environment Setup
Copy `.env.example` to `.env` and supply your API keys:
```bash
cp .env.example .env
```
Edit `.env`:
```env
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.1-8b-instant
OPENROUTER_API_KEY=your_openrouter_key_here
```

### 2. Launch with Docker Compose
```bash
docker-compose down -v
docker-compose up --build
```

> ⏱️ **Cold-Start Timing Note:**
> - MongoDB initialization: ~15–30s
> - Neo4j JVM + Bolt initialization: ~30–60s
> - Backend healthcheck verification: ~15s after DBs are ready
> - Frontend will automatically start once backend is healthy.
> - Access the Web Application at: **`http://localhost:8080`**
> - Access Backend API docs at: **`http://localhost:8000/docs`**

---

## 🛠️ Technology Stack

| Layer | Component | Technology |
|---|---|---|
| **Frontend** | Framework | React 18, Vite 5, React Router 6 |
| | Styling | **Plain CSS / CSS Modules + `:root` Design Tokens** *(No Tailwind/Bootstrap)* |
| | Visuals | Plotly.js (Chromatograms), Lucide React (Icons) |
| | HTTP Client | Axios (Centralized interceptors) |
| **Backend** | Framework | Python 3.11, FastAPI, Uvicorn |
| | Computation | Pandas, NumPy, SciPy, Scikit-learn (Isolation Forest) |
| | PDF Engine | ReportLab 4.x, Matplotlib (Headless chart rendering) |
| **Databases**| Document DB | MongoDB 7.0 + Motor + Beanie ODM |
| | Graph DB | Neo4j 5.x Community + Cypher AsyncDriver |
| **AI / LLM** | Providers | Groq Cloud (`llama-3.1-8b-instant`) with OpenRouter fallback |
| **Containers**| Orchestration | Docker, Docker Compose (Multi-stage builds) |

---

## 📡 API Endpoint Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/health` | Service healthcheck (MongoDB & Neo4j ping status) |
| `POST` | `/api/v1/upload` | Multipart upload for `.csv` and `.xlsx` datasets |
| `POST` | `/api/v1/analyze/{upload_id}` | Runs preprocessing, analytical engine, ML anomaly detector, & KG sync |
| `GET` | `/api/v1/analysis/{analysis_id}` | Retrieves full analytical record & KPI data |
| `GET` | `/api/v1/kpi/{analysis_id}` | Retrieves calculated chromatographic KPIs |
| `GET` | `/api/v1/anomaly/{analysis_id}` | Retrieves Isolation Forest anomaly detection results |
| `GET` | `/api/v1/graph/{analysis_id}` | Retrieves Knowledge Graph context & visualization network |
| `POST` | `/api/v1/summary/{analysis_id}` | Generates AI interpretation via Groq/OpenRouter router |
| `POST` | `/api/v1/report/{analysis_id}` | Builds 10-section ReportLab PDF report |
| `GET` | `/api/v1/report/{report_id}/download`| Streams generated PDF report |
| `GET` | `/api/v1/history` | Paginated list of historical analytical runs |

---

## 🧪 Running Automated Tests

```bash
cd backend
python -m pytest tests/ -v
```
All unit and integration tests run in under 2 seconds without requiring live database connections.
