# WORKFLOW — Build Order for NexusMind (AI-Based Automated Analytical Report Generation and Summarization System)

> Follow this order. Each phase should be functionally complete before moving to the next — don't build the LLM/report layer before the analytical engine underneath it exists and produces real numbers. Refer to `Master_prompt.md` for spec details and `skill.md` for implementation conventions at each step.
>
> **This build is the complete, final application (see Master_prompt.md §0) — not a v1/prototype.** Every phase below must reach genuinely finished, working functionality before moving on, not a "good enough for now" stand-in.

---

## PHASE 0 — Project Scaffolding
1. Create monorepo structure (`/frontend`, `/backend`, `/docker`) as defined in `skill.md` §1.
2. Set up `docker-compose.yml` with services: `backend`, `frontend`, `mongodb`, `neo4j`.
3. Backend: FastAPI app factory, `.env.example`, config loading via `pydantic-settings`, `/health` endpoint checking MongoDB + Neo4j connectivity.
4. Frontend: Vite + React scaffold (no CSS framework — see `skill.md` §3), global `styles/tokens.css` design-token stylesheet including breakpoint variables (Master_prompt.md §14), base routing (React Router), Axios instance configured.
5. Git repo initialized, `.gitignore` covers env files, `node_modules`, `__pycache__`, local upload/report directories.

**Exit criteria:** `docker-compose up` brings up all four services; `/health` returns green for Mongo and Neo4j; frontend loads a placeholder page hitting `/health` successfully.

---

## PHASE 1 — Upload, Validation & Storage
1. Backend: file upload endpoint (CSV/Excel), stored to local `/uploads` dir, metadata written to MongoDB `uploads` collection.
2. Data validation service: checks required columns/fields (Sample ID, Retention Time, Peak Area, Peak Height, Intensity, Concentration, Compound Name, Analysis Type); returns structured validation report.
3. Frontend: upload UI + validation feedback display (clear errors, not raw JSON dumps).

**Exit criteria:** uploading a valid CSV stores it and returns a success response with a generated `upload_id`; uploading a malformed CSV returns a clear, structured error list.

---

## PHASE 2 — Preprocessing & Analytical Engine
1. Preprocessing service: missing-value handling, duplicate removal, normalization, noise reduction, feature extraction, transform into canonical internal schema.
2. Analytical engine: compute peak count, major peaks, peak area/height, retention time, concentration, relative abundance, signal-to-noise ratio.
3. Persist the processed/analyzed result to MongoDB `analyses` collection, linked to the originating `upload_id` and a `sample_id`.
4. Unit tests against a fixed sample CSV fixture — KPI values must be exact and reproducible.

**Exit criteria:** given the fixture CSV, the analytical engine produces the same, verifiably-correct KPI numbers every run — before any ML/KG/AI code exists.

---

## PHASE 3 — KPI Dashboard (frontend surfaces real numbers)
1. Backend: endpoint returning the KPI summary for a given `analysis_id`.
2. Frontend: KPI cards (Total Peaks, Major Peaks, Quality Score, Max Area, Average Intensity, etc.), wired to real backend data — no anomalies yet, "Anomalies" can show 0/placeholder until Phase 4.
3. Frontend: interactive chromatogram chart (Plotly.js) rendering retention time vs. intensity with peak markers, using real processed data.

**Exit criteria:** a user can upload a file and immediately see a real, correct KPI dashboard and chart, laid out properly at both desktop and mobile widths (Master_prompt.md §14) — this is the "core loop" before any AI is added.

---

## PHASE 4 — ML Anomaly Detection
1. Implement `AnomalyDetector` interface + `IsolationForestDetector` (skill.md §2.4).
2. Wire anomaly scoring into the analysis pipeline, store results in the `analyses` document (score, classification, confidence, contributing feature values).
3. Frontend: anomaly panel/highlighting on the chromatogram chart and in the KPI cards ("Anomalies" now reflects real detections).
4. Unit tests with synthetic data containing a known planted outlier — assert it's flagged.

**Exit criteria:** uploading data with an obvious outlier peak visibly flags it with a score/confidence, backed by a passing unit test.

---

## PHASE 5 — Knowledge Graph
1. Set up Neo4j schema/constraints (`graph/schema.py`) for entities in Master_prompt.md §5.8.
2. On each analysis, write/update the relevant Sample → Compound → Peak → RetentionTime → Finding (and Anomaly, where applicable) relationships.
3. Implement query functions to pull the relevant subgraph/context for a given `analysis_id` (this is what will feed the AI reasoning stage next).
4. (Optional but recommended) simple graph visualization endpoint/panel on the frontend for demo value.

**Exit criteria:** after running an analysis, the corresponding nodes/relationships exist in Neo4j and can be queried back out as structured context, independent of any LLM call.

---

## PHASE 6 — LLM Provider Layer & AI Reasoning/Summary
1. Implement `LLMProvider` interface, `GroqProvider`, `OpenRouterProvider`, and the `LLMRouter` failover logic (skill.md §2.5).
2. Build the prompt-construction service that assembles: KPI values + peak/anomaly results + Knowledge Graph context → the fixed "do not invent numbers" system prompt → provider call.
3. Wire AI reasoning (interpretation paragraph) and AI summary (structured findings + recommendations) into the analysis pipeline; persist the generated text alongside the rest of the `analyses` document.
4. Frontend: AI summary panel displaying the generated interpretation/summary next to (not instead of) the raw KPI/peak/anomaly data.
5. Tests: mock the provider, assert on the payload sent (correct numbers, correct structure) rather than on generated prose.

**Exit criteria:** the dashboard shows a coherent AI-written summary whose every number matches the KPI/anomaly/graph data already computed and visible elsewhere on the page — and failover to OpenRouter can be demonstrated by disabling the Groq key.

---

## PHASE 7 — Automated Report Generation & PDF Export
1. Build `ReportContext` assembly service pulling together sample info, KPIs, chart images, peak/anomaly tables, Knowledge-Graph findings, and the AI summary.
2. Pre-render charts to static images (matplotlib/Plotly static export) for embedding.
3. Implement ReportLab template producing the canonical report structure (Master_prompt.md §5.12).
4. Store generated PDF + metadata in MongoDB `reports` collection; expose a download endpoint.
5. Frontend: "Generate Report" action + download button.

**Exit criteria:** clicking "Generate Report" on a completed analysis produces a downloadable PDF containing every section, with numbers matching the dashboard exactly.

---

## PHASE 8 — Analysis History
1. Backend: list/detail endpoints over the `analyses` and `reports` collections (paginated).
2. Frontend: history view listing past analyses with quick access to their dashboard view and report download.

**Exit criteria:** a user can revisit any past upload's full analysis and re-download its report without re-running the pipeline.

---

## PHASE 9 — Hardening Pass (before calling the application "done")
1. Structured error handling end-to-end (skill.md §2.7) — no raw tracebacks reach the frontend anywhere in the flow.
2. Config/secrets audit — confirm nothing is hardcoded; `.env.example` is complete and accurate.
3. **Responsive QA pass (Master_prompt.md §14):** check every page (Home/Upload, Dashboard, History, Report) at ~375px and ~414px (phone), ~768px (tablet), and ~1440px (desktop). Confirm: no horizontal scroll except where intentional (data tables), sidebar collapses to mobile nav, KPI cards/peak table/chromatogram all reflow properly, touch targets are large enough, no clipped or overlapping content.
4. Docker Compose full run-through from a clean checkout (`docker-compose up --build`) — confirm Phases 1–8 all still work end-to-end.
5. README covering setup, environment variables, and how to run the whole stack locally.

**Exit criteria:** a fresh clone + `docker-compose up --build` + a few environment variables gets a stranger from zero to a working upload → dashboard → AI summary → PDF report flow, on both a desktop browser and a phone-width viewport.

---

## OUT OF SCOPE FOR THIS BUILD (do not start these — see Master_prompt.md §12)
GC-MS/HPLC-specific analysis, advanced anomaly models, compound identification, historical cross-sample comparison, multi-user/RBAC, LIMS integration, direct instrument integration, cloud deployment automation, model monitoring/retraining.