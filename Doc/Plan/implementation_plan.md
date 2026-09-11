# NexusMind — AI-Based Automated Analytical Report Generation & Summarization System
## Complete Implementation Plan

> **Root context:** `Master_prompt.md` defines *what* to build. `workflow.md` defines *in what order*. This plan defines *exactly how* to execute each phase — file by file, module by module.

---

## Project Overview

NexusMind is an **end-to-end analytical intelligence platform** that transforms raw Chromatography/Mass Spectrometry data (CSV/Excel) into structured analytical insights and automated professional PDF reports. The pipeline is:

```
Upload → Validate → Preprocess → Analytical Engine → ML Anomaly Detection
→ KPI Generation → Knowledge Graph → AI Reasoning (Groq/OpenRouter) → PDF Report
```

> [!IMPORTANT]
> The LLM is the **last** stage — it only interprets already-computed, deterministic numbers. It never computes KPIs, peaks, or anomaly scores. This is a hard architectural rule enforced everywhere.

---

## Target Directory

All code lives under:
```
Code/Development/
├── frontend/        ← React + Vite + Tailwind
├── backend/         ← Python + FastAPI
└── docker/          ← Docker Compose + config
```

---

## Technology Stack (Locked)

| Layer | Technology |
|---|---|
| Frontend | React.js + Vite, Tailwind CSS, Recharts/Plotly.js, Axios, React Router, Lucide React |
| Backend | Python + FastAPI + Uvicorn, Pydantic, Pandas, NumPy, SciPy, Scikit-learn, ReportLab |
| Database | MongoDB (`motor` async driver) + `beanie` ODM |
| Knowledge Graph | Neo4j + Cypher (`neo4j` Python driver) |
| AI / LLM | Groq API (primary) → OpenRouter (fallback) |
| File Storage | Local filesystem (`/uploads`, `/reports`) — interface-driven for later S3 swap |
| Containers | Docker + Docker Compose |

---

## Monorepo File Structure (Complete)

```
Code/Development/
├── docker-compose.yml
├── .env.example
├── .gitignore
├── README.md
│
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── main.py                          # FastAPI app factory + router registration
│   ├── config.py                        # pydantic-settings config (all env vars)
│   │
│   ├── api/
│   │   ├── __init__.py
│   │   ├── routes/
│   │   │   ├── health.py                # GET /health
│   │   │   ├── upload.py                # POST /upload
│   │   │   ├── analysis.py              # POST /analyze/{upload_id}, GET /analysis/{id}
│   │   │   ├── kpi.py                   # GET /kpi/{analysis_id}
│   │   │   ├── anomaly.py               # GET /anomaly/{analysis_id}
│   │   │   ├── graph.py                 # GET /graph/{analysis_id}
│   │   │   ├── summary.py               # POST /summary/{analysis_id}
│   │   │   ├── report.py                # POST /report/{analysis_id}, GET /report/{id}/download
│   │   │   └── history.py               # GET /history (paginated)
│   │   └── dependencies.py              # FastAPI dependency injection (DB, providers)
│   │
│   ├── core/
│   │   ├── __init__.py
│   │   ├── exceptions.py                # Custom exception classes + handlers
│   │   └── responses.py                 # Standardized JSON response models
│   │
│   ├── db/
│   │   ├── __init__.py
│   │   ├── mongodb.py                   # motor client + beanie init
│   │   ├── neo4j_client.py              # Neo4j driver singleton
│   │   └── models/
│   │       ├── user.py                  # User document model
│   │       ├── upload.py                # Upload document model
│   │       ├── sample.py                # Sample document model
│   │       ├── analysis.py              # Analysis document model
│   │       └── report.py                # Report document model
│   │
│   ├── services/
│   │   ├── storage/
│   │   │   ├── base.py                  # StorageBackend abstract interface
│   │   │   └── local.py                 # LocalStorageBackend implementation
│   │   ├── validation/
│   │   │   └── validator.py             # Column/schema validation
│   │   ├── preprocessing/
│   │   │   └── preprocessor.py          # Missing values, dedup, normalize, features
│   │   ├── analytical/
│   │   │   └── engine.py                # Peak count, area, height, RT, conc, S/N
│   │   ├── ml/
│   │   │   ├── base.py                  # AnomalyDetector abstract interface
│   │   │   └── isolation_forest.py      # IsolationForestDetector implementation
│   │   ├── graph/
│   │   │   ├── schema.py                # Neo4j constraints/indexes setup
│   │   │   ├── writer.py                # Write nodes/relationships
│   │   │   └── queries.py               # Cypher query functions
│   │   ├── llm/
│   │   │   ├── base.py                  # LLMProvider abstract interface
│   │   │   ├── groq_provider.py         # GroqProvider implementation
│   │   │   ├── openrouter_provider.py   # OpenRouterProvider implementation
│   │   │   ├── router.py                # LLMRouter (Groq→OpenRouter failover)
│   │   │   └── prompt_builder.py        # Assembles structured JSON → system prompt
│   │   └── report/
│   │       ├── context_builder.py       # Assembles ReportContext
│   │       ├── chart_renderer.py        # Chart → PNG for embedding
│   │       └── pdf_generator.py         # ReportLab template → PDF
│   │
│   └── tests/
│       ├── fixtures/
│       │   └── sample_analytical.csv    # Fixed test fixture CSV
│       ├── test_validation.py
│       ├── test_preprocessing.py
│       ├── test_analytical_engine.py
│       ├── test_anomaly_detection.py
│       └── test_llm_payload.py
│
└── frontend/
    ├── Dockerfile
    ├── vite.config.js
    ├── tailwind.config.js
    ├── package.json
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── api/
        │   ├── axios.js
        │   ├── upload.js
        │   ├── analysis.js
        │   ├── graph.js
        │   ├── summary.js
        │   ├── report.js
        │   └── history.js
        ├── components/
        │   ├── layout/
        │   │   ├── Sidebar.jsx
        │   │   ├── Navbar.jsx
        │   │   └── Layout.jsx
        │   ├── upload/
        │   │   ├── FileUploader.jsx
        │   │   └── ValidationReport.jsx
        │   ├── dashboard/
        │   │   ├── KPICards.jsx
        │   │   ├── Chromatogram.jsx
        │   │   ├── AnomalyPanel.jsx
        │   │   └── PeakTable.jsx
        │   ├── graph/
        │   │   └── GraphVisualization.jsx
        │   ├── ai/
        │   │   └── AISummaryPanel.jsx
        │   ├── report/
        │   │   └── ReportActions.jsx
        │   └── history/
        │       └── HistoryList.jsx
        ├── pages/
        │   ├── HomePage.jsx
        │   ├── DashboardPage.jsx
        │   ├── HistoryPage.jsx
        │   └── ReportPage.jsx
        └── styles/
            └── index.css
```

---

## Phase-by-Phase Execution Plan

---

### PHASE 0 — Project Scaffolding

**Goal:** Full monorepo skeleton, all four Docker services running, `/health` green.

#### Files to Create

**`docker-compose.yml`**
- Services: `backend` (FastAPI port 8000), `frontend` (Vite port 5173), `mongodb` (port 27017), `neo4j` (ports 7474/7687)
- Volume mounts for persistent MongoDB + Neo4j data
- Shared environment variable injection from `.env`

**`.env.example`**
```env
MONGO_URI=mongodb://mongodb:27017
MONGO_DB_NAME=nexusmind
NEO4J_URI=bolt://neo4j:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=changeme
GROQ_API_KEY=
OPENROUTER_API_KEY=
LLM_PROVIDER=groq
UPLOADS_DIR=/app/uploads
REPORTS_DIR=/app/reports
```

**`backend/config.py`** — `pydantic-settings` `Settings` class reading all env vars; `get_settings()` dependency

**`backend/main.py`** — FastAPI app factory; lifespan: init MongoDB (beanie), init Neo4j driver, create directories; register all routers at `/api/v1`; register exception handlers

**`backend/api/routes/health.py`** — `GET /health` → pings MongoDB + Neo4j → `{"mongo": "ok", "neo4j": "ok"}`

**`backend/db/mongodb.py`** — `motor` async client; `beanie` init; `get_db()` dependency

**`backend/db/neo4j_client.py`** — Neo4j `AsyncDriver` singleton; `get_neo4j()` dependency

**Frontend scaffold:**
- `npm create vite@latest frontend -- --template react`
- Install: `tailwindcss`, `axios`, `react-router-dom`, `plotly.js`, `recharts`, `lucide-react`
- React Router routes: `/`, `/dashboard/:analysisId`, `/history`, `/report/:reportId`
- `HomePage.jsx` calls `/health` on mount → shows service status

**Exit Criteria:** `docker-compose up --build` → 4 services healthy; frontend shows "MongoDB: OK, Neo4j: OK".

---

### PHASE 1 — Upload, Validation & Storage

**Goal:** User uploads CSV/Excel; valid files stored; invalid files return structured errors.

#### Files to Create

**`backend/services/storage/base.py`**
```python
class StorageBackend(ABC):
    async def save(self, file_bytes: bytes, filename: str) -> str: ...
    async def load(self, path: str) -> bytes: ...
```

**`backend/services/storage/local.py`** — `LocalStorageBackend` saves to `UPLOADS_DIR/{uuid}_{filename}`; returns relative path

**`backend/db/models/upload.py`**
```python
class Upload(Document):
    filename: str
    storage_path: str
    status: str  # "uploaded" | "validated" | "processed" | "failed"
    upload_time: datetime
    validation_report: Optional[dict]
```

**`backend/services/validation/validator.py`**
- Required columns: `Sample ID, Retention Time, Peak Area, Peak Height, Intensity, Concentration, Compound Name, Analysis Type`
- Returns `ValidationResult(valid: bool, errors: List[ValidationError], warnings: List[str])`
- `ValidationError` → `{row, column, message}` — never raw exception

**`backend/api/routes/upload.py`** — `POST /upload` (multipart/form-data); calls storage → validator → saves Upload doc; returns `{upload_id, filename, status, validation_report}`

**Frontend:** `FileUploader.jsx` (drag-and-drop + progress); `ValidationReport.jsx` (row/column/message cards); `HomePage.jsx` wires them together → navigates to dashboard on success

**Exit Criteria:** Valid CSV → `upload_id` + MongoDB doc created. Invalid CSV → structured error list in UI.

---

### PHASE 2 — Preprocessing & Analytical Engine

**Goal:** Data flows through preprocessing + analytical calculation; deterministic KPIs stored in MongoDB.

#### Files to Create

**`backend/services/preprocessing/preprocessor.py`** — Steps in order:
1. Missing value handling: numeric → median imputation; categorical → "Unknown"
2. Duplicate removal: on `(Sample ID, Retention Time, Compound Name)`
3. Normalization: min-max on `Peak Area`, `Peak Height`, `Intensity` (originals kept)
4. Noise reduction: Savitzky-Golay filter (SciPy) on intensity series
5. Feature extraction: `relative_abundance = (peak_area / total_area) * 100`, `snr = peak_height / baseline_noise`
6. Returns canonical `pd.DataFrame`

**`backend/services/analytical/engine.py`** — All deterministic NumPy/Pandas:
```python
class AnalyticalEngine:
    def analyze(df: pd.DataFrame) -> AnalyticalResult:
        total_peaks: int
        major_peaks: int           # relative_abundance > 5%
        peak_details: List[PeakDetail]
        quality_score: float       # data completeness × peak resolution proxy
        max_area: float
        avg_intensity: float
```

**`backend/db/models/analysis.py`**
```python
class Analysis(Document):
    upload_id: PydanticObjectId
    sample_id: Optional[str]
    status: str
    kpis: dict
    peak_details: list
    anomaly_results: list
    kg_context: dict
    ai_summary: Optional[str]
    ai_interpretation: Optional[str]
    created_at: datetime
```

**`backend/api/routes/analysis.py`** — `POST /analyze/{upload_id}` triggers full pipeline; `GET /analysis/{analysis_id}` returns doc

**`backend/tests/fixtures/sample_analytical.csv`** — Fixed CSV with known values

**`backend/tests/test_analytical_engine.py`** — Load fixture → run engine → assert exact KPI values (same every run)

**Exit Criteria:** Fixture CSV produces identical KPI values every run; unit tests pass.

---

### PHASE 3 — KPI Dashboard

**Goal:** Upload a file → see real KPI cards + interactive Plotly chromatogram.

#### Files to Create

**`backend/api/routes/kpi.py`** — `GET /kpi/{analysis_id}` → `{total_peaks, major_peaks, anomalies: 0, quality_score, max_area, avg_intensity}`

**`frontend/src/components/dashboard/KPICards.jsx`**
- 6 glassmorphism cards with Lucide icons + gradient accents
- Metrics: Total Peaks, Major Peaks, Anomalies, Quality Score (%), Max Area, Avg Intensity
- Animated count-up on load

**`frontend/src/components/dashboard/Chromatogram.jsx`**
- Plotly.js scatter: x = Retention Time, y = Intensity
- Vertical dashed lines for peak markers; major peaks highlighted
- Dark theme; hover tooltip: Peak ID, RT, Area, Height, Compound

**`frontend/src/components/dashboard/PeakTable.jsx`**
- Sortable, paginated table
- Columns: Rank, Compound Name, RT, Peak Area, Peak Height, Concentration, Relative Abundance, S/N

**`frontend/src/pages/DashboardPage.jsx`** — Orchestrates all dashboard components; polling/loading state

**Exit Criteria:** Upload → correct KPI dashboard + interactive chromatogram visible (no AI yet).

---

### PHASE 4 — ML Anomaly Detection

**Goal:** Isolation Forest flags real outliers; anomaly count in KPI cards; chromatogram highlights anomalies.

#### Files to Create

**`backend/services/ml/base.py`**
```python
class AnomalyDetector(ABC):
    def fit(self, df: pd.DataFrame) -> None: ...
    def predict(self, df: pd.DataFrame) -> List[AnomalyResult]: ...

class AnomalyResult(BaseModel):
    peak_id: str
    retention_time: float
    anomaly_score: float          # 0-1
    is_anomaly: bool
    confidence: float
    contributing_features: dict   # feature values that drove the score
    classification: str           # "Normal" | "Potential Anomaly" | "Confirmed Anomaly"
```

**`backend/services/ml/isolation_forest.py`**
- `IsolationForestDetector(AnomalyDetector)`
- Features: `retention_time, peak_area, peak_height, intensity, concentration`
- `sklearn IsolationForest(contamination='auto', random_state=42)`
- Maps `decision_function` to `[0,1]` anomaly score
- `contributing_features` from feature importance proxy

**Wiring:** Integrate after analytical engine in `POST /analyze/{upload_id}`; store in `anomaly_results` list

**`backend/api/routes/anomaly.py`** — `GET /anomaly/{analysis_id}` → returns full anomaly results

**`frontend/src/components/dashboard/AnomalyPanel.jsx`**
- Cards: RT, Score, Confidence, Classification, contributing features
- Color-coded: green → yellow → red
- Chromatogram: anomalous peaks highlighted red

**`backend/tests/test_anomaly_detection.py`** — Synthetic DataFrame with planted outlier → assert flagged at score > 0.7

**Exit Criteria:** Obvious outlier → flagged in KPI cards + highlighted on chromatogram; unit test passes.

---

### PHASE 5 — Knowledge Graph

**Goal:** Every analysis writes entity/relationship data to Neo4j; query functions return LLM context.

#### Files to Create

**`backend/services/graph/schema.py`** — Neo4j constraints:
```cypher
CREATE CONSTRAINT sample_id IF NOT EXISTS FOR (s:Sample) REQUIRE s.sample_id IS UNIQUE;
CREATE CONSTRAINT compound_name IF NOT EXISTS FOR (c:Compound) REQUIRE c.name IS UNIQUE;
CREATE CONSTRAINT peak_id IF NOT EXISTS FOR (p:Peak) REQUIRE p.peak_id IS UNIQUE;
```
Entities: `Sample, Compound, Peak, RetentionTime, Concentration, Instrument, AnalysisType, Finding, Anomaly, Interpretation`

**`backend/services/graph/writer.py`** — Write/MERGE on each analysis:
```
(:Sample) -[:CONTAINS]-> (:Compound)
(:Compound) -[:PRODUCES]-> (:Peak)
(:Peak) -[:HAS]-> (:RetentionTime)
(:RetentionTime) -[:ASSOCIATED_WITH]-> (:Finding)
(:Peak) -[:HAS_ANOMALY]-> (:Anomaly)
```

**`backend/services/graph/queries.py`**
```python
async def get_analysis_context(analysis_id: str) -> dict:
    # Returns samples, compounds, peaks, anomalies, findings as structured dict
    # Feeds directly into LLM prompt
```

**`backend/api/routes/graph.py`** — `GET /graph/{analysis_id}` → graph context JSON + optional node/edge list

**`frontend/src/components/graph/GraphVisualization.jsx`** *(optional demo panel)*
- Force-directed graph (D3 or `react-force-graph`)
- Sample → Compound → Peak relationships; anomaly nodes in red

**Exit Criteria:** After analysis, correct Neo4j nodes/relationships queryable independently of any LLM call.

---

### PHASE 6 — LLM Provider Layer & AI Reasoning/Summary

**Goal:** AI summary on dashboard, numbers match KPIs exactly; Groq → OpenRouter failover works.

#### Files to Create

**`backend/services/llm/base.py`**
```python
class LLMProvider(ABC):
    async def complete(self, system_prompt: str, user_message: str) -> str: ...
```

**`backend/services/llm/groq_provider.py`** — `GroqProvider` using `groq` SDK; raises `LLMProviderError` on rate-limit/timeout

**`backend/services/llm/openrouter_provider.py`** — `OpenRouterProvider` using `httpx` to `https://openrouter.ai/api/v1/chat/completions`; model from config

**`backend/services/llm/router.py`**
```python
class LLMRouter:
    providers: List[LLMProvider]  # [GroqProvider, OpenRouterProvider]
    async def complete(...) -> str:
        # Try providers in order; on error → next; raise if all fail
```

**`backend/services/llm/prompt_builder.py`** — System prompt always includes:
> "Do NOT invent, adjust, or recompute any numeric value. Only interpret the values given to you."

User message = structured JSON: `{kpis, peaks, anomalies, knowledge_graph_context}`

Output requested: interpretation paragraph + structured summary (overall result, important peaks, findings, anomalies, possible interpretation, recommended review points)

**`backend/api/routes/summary.py`** — `POST /summary/{analysis_id}` → builds prompt → LLMRouter → persists `ai_interpretation` + `ai_summary`; returns `{interpretation, summary}`

**`frontend/src/components/ai/AISummaryPanel.jsx`**
- Two sections: "AI Interpretation" (paragraph) + "AI Summary" (structured findings)
- Clearly labeled: "AI-Generated — verify against raw data above"
- Loading spinner during LLM call; side-by-side with KPI/anomaly data

**`backend/tests/test_llm_payload.py`** — Mock provider; assert payload contains correct KPI numbers; assert system prompt contains "do not invent"

**Exit Criteria:** Coherent AI summary visible; every number matches KPI card; OpenRouter activates when Groq key disabled.

---

### PHASE 7 — Automated Report Generation & PDF Export

**Goal:** "Generate Report" → downloadable PDF with all sections matching dashboard.

#### Files to Create

**`backend/services/report/context_builder.py`**
```python
class ReportContextBuilder:
    def build(self, analysis_id: str) -> ReportContext:
        # Collects: Upload metadata, Analysis doc, KG context, chart images
        # Returns flat ReportContext dataclass
```

**`backend/services/report/chart_renderer.py`** — Renders chromatogram + anomaly overlay → PNG bytes for ReportLab

**`backend/services/report/pdf_generator.py`** — ReportLab template, 10 sections:
1. Cover Page (NexusMind logo, sample info, date)
2. Sample Information
3. Analytical KPIs table
4. Chromatogram (embedded PNG)
5. Peak Analysis table
6. Anomaly Detection Results
7. Knowledge-Based Findings
8. AI-Based Analytical Summary
9. Recommendations
10. Conclusion

**`backend/db/models/report.py`**
```python
class Report(Document):
    analysis_id: PydanticObjectId
    storage_path: str
    generated_at: datetime
    page_count: int
```

**`backend/api/routes/report.py`**
- `POST /report/{analysis_id}` → build context → render PDF → store → save Report doc
- `GET /report/{report_id}/download` → stream PDF as `application/pdf`

**`frontend/src/components/report/ReportActions.jsx`** — "Generate Report" button (disabled until analysis complete); progress indicator; "Download PDF" button; timestamp

**Exit Criteria:** PDF downloaded with all 10 sections; numbers match dashboard exactly.

---

### PHASE 8 — Analysis History

**Goal:** User browses past analyses; can re-download reports.

#### Files to Create

**`backend/api/routes/history.py`**
- `GET /history?page=1&limit=20` → paginated `{analysis_id, filename, status, created_at, has_report}`
- `GET /history/{analysis_id}` → full analysis detail

**`frontend/src/components/history/HistoryList.jsx`** — Table: Filename, Date, Status badge, KPI summary, View link, Download button; pagination

**`frontend/src/pages/HistoryPage.jsx`** — Fetches paginated history; search/filter by filename or date

**Exit Criteria:** All past analyses browseable; "View" restores full dashboard; "Download" re-downloads PDF.

---

### PHASE 9 — Hardening Pass

**Goal:** Production-quality error handling, config hygiene, Docker end-to-end, README.

#### Checklist

**Error Handling**
- `backend/core/exceptions.py`: `ValidationError, StorageError, AnalysisError, MLError, GraphError, LLMError, ReportError`
- FastAPI handlers: all → structured `{error_code, message, details}` — no raw tracebacks to frontend

**Config Audit**
- Every secret/URL/path in `.env.example` with comments
- `config.py` validates required fields at startup; missing → startup failure with clear message
- Verify: no hardcoded API keys, paths, or connection strings anywhere in source

**Docker End-to-End**
- `docker-compose up --build` from clean checkout
- Confirm full flow: upload → analyze → dashboard → AI summary → PDF

**`README.md`** sections:
- What is NexusMind
- Architecture diagram (ASCII)
- Prerequisites
- Quickstart (clone → `.env` → `docker-compose up --build`)
- API endpoint reference table
- Tech stack table
- Future scope

**Exit Criteria:** Clone + 4 env vars + `docker-compose up --build` → full working flow for a stranger.

---

## Open Questions for Your Review

> [!IMPORTANT]
> Please confirm these before execution begins:

1. **Neo4j version** — Plan uses Community Edition 5.x (free, Docker). Any constraint?
2. **LLM models** — Groq: `llama3-8b-8192`; OpenRouter fallback: `mistralai/mistral-7b-instruct`. Acceptable?
3. **Authentication** — `Master_prompt.md` scope excludes auth. Skip auth entirely for v1, or add placeholder JWT auth in Phase 0?
4. **Quality Score formula** — Use purely data-relative computation, or incorporate domain reference limits (e.g. expected RT ranges)?
5. **API keys** — Groq + OpenRouter keys needed before Phase 6. Do you have both ready?

---

## Verification Plan

### Automated Tests
```bash
cd Code/Development/backend
pytest tests/ -v --tb=short
```
| Test File | What It Verifies |
|---|---|
| `test_validation.py` | Valid/invalid CSV schema checking |
| `test_preprocessing.py` | Transformations are idempotent and correct |
| `test_analytical_engine.py` | KPI determinism — fixture CSV → exact values every run |
| `test_anomaly_detection.py` | Planted outlier flagged at score > 0.7 |
| `test_llm_payload.py` | Mock provider receives correct structured payload |

### Manual Verification Steps
- Upload fixture CSV → KPI dashboard matches expected values
- Upload CSV with obvious outlier → anomaly highlighted on chromatogram
- Trigger AI summary → every number in summary matches dashboard
- Disable Groq key → OpenRouter fallback activates
- Click "Generate Report" → PDF with all 10 sections downloaded
- Browse History → past analyses accessible + re-downloadable

### Docker Smoke Test
```bash
docker-compose down -v
docker-compose up --build
# Open http://localhost:5173 — complete flow
```
