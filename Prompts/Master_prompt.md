# MASTER PROMPT
## NexusMind - AI-Based Automated Analytical Report Generation and Summarization System
### (Machine Learning + Knowledge Graph + Generative AI)

> This file is the single source of truth for the project. Feed this to the Antigravity agent as the root context before any code is generated. `skill.md` tells the agent *how* to build each part; `workflow.md` tells it *in what order*. This file tells it *what the system is and must become*.

---

## 0. PROJECT COMPLETION MANDATE — READ THIS FIRST

**This is NOT a v1, MVP, prototype, or proof-of-concept.** Every reference elsewhere in this document to "prototype scope" describes the *complete, final feature set* — not a cut-down starter version to be expanded later. Build the entire, fully-functional, production-ready application described in this document, end to end, in one continuous build.

Concretely, this means:
- **No stubs, mocks, or placeholder logic** anywhere in the shipped code. If a module is listed in Section 11, it must be fully implemented and working, not scaffolded and left for "later."
- **No "TODO," "coming soon," or disabled buttons** in the UI for anything listed in Section 11 — every listed feature must be clickable and functional.
- **No partial pipelines.** The full chain in Section 4 (Upload → Validate → Preprocess → Analytical Engine → ML Anomaly Detection → KPI Generation → Knowledge Graph → AI Reasoning → PDF Report) must run end-to-end for a real uploaded file, producing a real downloadable PDF, before the build is considered done.
- **Section 12 ("Future Enhancements") remains genuinely out of scope** — those are legitimate post-launch roadmap items, not things being deferred out of laziness. Everything else in this document is mandatory, not optional.
- Do not silently downgrade a requirement (e.g., a "demo-only" chart, a hardcoded sample report, a UI that only works for one specific uploaded file) to save time. If a genuine blocker makes something infeasible, flag it explicitly rather than shipping a fake version of it.

---

## 1. PROJECT IDENTITY

**Name:** NexusMind (Analytical Intelligence Platform)
**One-line pitch:** An intelligent analytical decision-support platform that combines Machine Learning, Knowledge Graph reasoning, analytical data processing, and Generative AI to transform raw laboratory results (Chromatography / Mass Spectrometry) into structured analytical insights and automated technical reports.

**Do not describe this project as "an AI that generates reports."** It is an end-to-end analytical intelligence system where the LLM is the *last* stage, not the engine — analytical calculations, anomaly detection, and relationship modeling all happen in deterministic/ML code first; the LLM only turns already-computed structured results into language.

---

## 2. PROBLEM STATEMENT

Analytical laboratories generate large volumes of complex Chromatography/Mass Spectrometry data. Manually inspecting this data, identifying peaks/parameters, spotting abnormal results, understanding relationships between samples/compounds/parameters, and preparing structured technical reports is time-consuming, repetitive, and inconsistent between analysts.

## 3. WHAT THE SYSTEM MUST SOLVE

- Eliminate manual peak/parameter inspection
- Eliminate manual, repetitive report writing
- Surface abnormal analytical patterns automatically (ML, not just thresholds)
- Convert raw numeric/analytical data into human-understandable information
- Model and query relationships between analytical entities (not just isolated rows)
- Auto-generate an analytical summary in plain language
- Auto-generate a structured, professional technical report (PDF)
- Present key analytical information on a live dashboard
- Improve consistency and speed of reporting across analysts

---

## 4. END-TO-END WORKFLOW (CANONICAL — do not deviate)

```
User
 ↓
Upload Analytical Data (CSV / Excel, JSON & PDF optional later)
 ↓
Data Validation & Preprocessing
 ↓
Analytical Data Processing (peak/parameter extraction)
 ↓
ML-Based Anomaly Detection
 ↓
KPI Generation
 ↓
Knowledge Graph Construction / Query
 ↓
AI-Based Reasoning (LLM, given structured facts only)
 ↓
AI-Generated Analytical Summary
 ↓
Automated Report Generation
 ↓
PDF Report (downloadable)
```

**Hard rule:** the LLM never computes KPIs, peak stats, or anomaly scores itself. It only receives already-computed structured JSON (analytical results + ML output + Knowledge Graph context) and produces natural-language interpretation/summary/report text. This must be enforced in the prompt sent to the LLM and in code review — if a number in the final report doesn't trace back to the analytical/ML engine, it's a bug.

---

## 5. FUNCTIONAL REQUIREMENTS BY STAGE

### 5.1 Data Upload
- Supported formats: **CSV, Excel (.xlsx)**, fully implemented and working. JSON and PDF ingestion are genuinely future scope (Section 12).
- Multi-file / batch upload should be architected for even though the shipped UI exposes single-file upload only.

### 5.2 Data Validation
Required fields to check for (not all mandatory per row, but schema-aware validation):
`Sample ID, Retention Time, Peak Area, Peak Height, Intensity, Concentration, Compound Name, Analysis Type`
- Reject / flag rows with missing required identifiers.
- Return a clear, structured validation error report to the frontend (never a raw stack trace).

### 5.3 Data Preprocessing
- Missing-value handling (documented strategy per column type)
- Duplicate removal
- Normalization
- Noise reduction
- Feature extraction (derived columns: relative abundance, S/N ratio, etc.)
- Data transformation into the internal canonical schema used by every downstream stage

### 5.4 Analytical Data Analysis
Compute (deterministically, in Python — never guessed by an LLM):
- Total peaks, major peaks
- Peak area, peak height, retention time, concentration
- Relative abundance
- Signal-to-noise ratio
- Any other domain-relevant analytical metric that can be derived from the input columns

### 5.5 KPI Dashboard
Example KPI set (values MUST come from the analytical engine, never from the LLM):
```
Total Peaks       → 12
Major Peaks       → 5
Anomalies         → 1
Quality Score     → 94%
Maximum Area      → 24,583
Average Intensity → 8,420
```

### 5.6 Machine Learning — Anomaly Detection
- Shipped model: **Isolation Forest** (scikit-learn), fully wired into the pipeline and running on real uploaded data
- Features: retention time, peak area, peak height, intensity, concentration, peak-to-peak relationships
- Output: anomaly score (0–1) + classification + confidence, e.g.:
```
Peak 8.41 min
Anomaly Score: 0.91
Status: Potential Anomaly
Confidence: 91%
```
- Architecture must allow swapping in One-Class SVM, Autoencoder, or clustering later without touching the API contract (strategy pattern around a common `AnomalyDetector` interface).

### 5.7 Analytical Visualization
- Interactive chromatogram-style charts: retention time vs. intensity, peak markers, highlighted anomalies.
- Charting library: Plotly.js and/or Recharts on the frontend.

### 5.8 Knowledge Graph
- Represent relationships between analytical entities, not flat rows.
- Entities: `Sample, Compound, Peak, RetentionTime, Concentration, Instrument, AnalysisType, Finding, Anomaly, Interpretation`
- Canonical relationship chain:
```
Sample --contains--> Compound --produces--> Peak --has--> RetentionTime --associated_with--> Finding
```
- Also model: `Sample --has_peak--> Peak --has--> RetentionTime --associated_with--> Compound`
- Purpose: let the AI reasoning stage query *relationships*, not just isolated numbers — e.g. "has this compound produced anomalies in other samples from this instrument?"

### 5.9 AI-Based Reasoning
- Input to the LLM is always structured JSON: analytical results + ML results + KPI values + relevant Knowledge Graph subgraph/context.
- Output: a human-readable interpretation paragraph, e.g.:
> "The analysis identified twelve peaks, with five major peaks contributing significantly to the overall response. A potential abnormal pattern was detected around 8.41 minutes. The observed deviation should be reviewed against the relevant reference or standard sample before final interpretation."
- The reasoning prompt must explicitly instruct the model: "Do not invent, adjust, or recompute any numeric value. Only interpret the values given to you."

### 5.10 AI-Based Summary
Must synthesize:
- Overall result
- Important peaks
- Major analytical findings
- Detected anomalies
- Possible interpretation
- Recommended review points

### 5.11 Automated Report Generation
Report sections:
- Sample information
- Analysis information
- KPI summary
- Analytical graph(s)
- Peak analysis
- Anomaly detection results
- Knowledge-Graph-based findings
- AI-generated interpretation
- Recommendations
- Conclusion

### 5.12 PDF Export
Canonical report structure:
```
ANALYTICAL ANALYSIS REPORT
 Sample Information
 Analytical KPIs
 Chromatogram
 Peak Analysis
 Anomaly Detection
 AI-Based Analytical Summary
 Knowledge-Based Findings
 Recommendations
 Conclusion
```
Generated with ReportLab, embedding rendered charts as images.

---

## 6. TECHNOLOGY STACK (LOCKED — do not substitute without explicit instruction)

### Frontend
- React.js + Vite
- **Plain CSS / CSS Modules only — NO CSS framework.** Do not use Tailwind, Bootstrap, Material UI, Chakra, or any utility-class/component framework. Build a hand-crafted design system using plain `.module.css` files per component plus a global `:root` stylesheet of CSS custom properties (design tokens: colors, spacing, radii, typography, glass-effect variables) that every component's CSS reads from. This is a locked substitution — do not reintroduce Tailwind even if it would be faster to scaffold.
- Recharts and/or Plotly.js
- Axios
- React Router
- Lucide React (icons)

### Backend
- Python + FastAPI + Uvicorn
- Pydantic (schemas/validation)
- Pandas, NumPy, SciPy (data processing)
- Scikit-learn (Isolation Forest, extensible to other models)
- ReportLab (PDF generation)

### Database — **MongoDB** (locked substitution — do NOT use PostgreSQL)
- Use MongoDB (via `motor` for async access from FastAPI — preferred for this build; `pymongo` sync access is acceptable only as an isolated fallback behind the repository interface).
- Collections (minimum):
  - `users`
  - `uploads` (raw file metadata + storage path)
  - `samples`
  - `analyses` (one document per analysis run: KPIs, peak list, anomaly results, timestamps, links to sample/upload)
  - `reports` (generated report metadata + PDF storage path)
- Store the Knowledge-Graph-relevant entity IDs inside `analyses` documents so Neo4j nodes can reference back to MongoDB `_id`s (MongoDB = system of record for raw/structured data; Neo4j = system of record for relationships only — never duplicate reasoning logic between the two).
- Use a small ODM layer (e.g. `pydantic` models mapped manually, or `beanie` on top of `motor`) — do not scatter raw dict access across the codebase.

### AI / LLM — **Groq and/or OpenRouter** (locked substitution — do NOT use Gemini/OpenAI as primary)
- Primary: **Groq API** (fast inference — good for interactive dashboard summaries).
- Secondary/fallback: **OpenRouter** (model-agnostic routing — use when Groq is rate-limited, down, or when a task benefits from a different underlying model).
- Architect an `LLMProvider` interface with at least two concrete implementations (`GroqProvider`, `OpenRouterProvider`) selected via config/env var, with automatic failover from Groq → OpenRouter on error/timeout/rate-limit.
- Never hardcode a single provider call inline in business logic — always go through the interface.
- The LLM must only ever be called with structured, already-computed JSON — see the hard rule in Section 4.

### Knowledge Graph
- Neo4j + Cypher — this is the shipped, real implementation, not a placeholder. NetworkX may only ever be used as an in-memory fallback for local unit tests, never as the actual runtime Knowledge Graph.

### File Storage
- Local filesystem for this build (`/uploads`, `/reports` style directories referenced from MongoDB documents) — fully functional, not a stub.
- Design storage access behind an interface so S3/Cloudinary/Supabase Storage can be swapped in later without touching business logic.

### Deployment / Tooling
- Docker (containerize frontend, backend, MongoDB, Neo4j)
- Git/GitHub for version control
- Target hosting: Render / Railway / VPS / AWS (any works; don't hardcode assumptions that block portability)

---

## 7. SYSTEM ARCHITECTURE

```
                    USER
                      |
                      ↓
              ┌───────────────┐
              │ React.js UI   │
              └───────┬───────┘
                      |
                      ↓
              ┌───────────────┐
              │ FastAPI       │
              │ Backend       │
              └───────┬───────┘
                      |
          ┌───────────┼──────────────┐
          ↓           ↓              ↓
     Data Engine   ML Engine     MongoDB
          |           |          (users, uploads,
          |           ↓           samples, analyses,
          |     Anomaly Detection reports)
          |
          ↓
     Analytical Results
          |
          ↓
     Knowledge Graph (Neo4j)
          |
          ↓
      AI Reasoning (Groq → OpenRouter fallback)
          |
          ↓
     AI Summary
          |
          ↓
    Report Generator (ReportLab)
          |
          ↓
       PDF Report
```

---

## 8. MAIN MODULES

1. User & File Management
2. Analytical Data Processing
3. Peak Detection & Analysis
4. KPI Generation
5. ML-Based Anomaly Detection
6. Analytical Visualization
7. Knowledge Graph
8. AI-Based Reasoning
9. AI-Based Summarization
10. Automated Report Generation
11. PDF Export
12. Analysis History

---

## 9. EXAMPLE USER JOURNEY

1. User logs into the application.
2. User uploads an analytical CSV file.
3. System validates the data.
4. Backend preprocesses the data.
5. Analytical engine detects peaks and calculates parameters.
6. ML model checks for abnormal patterns.
7. KPIs are generated.
8. Relevant entities and relationships are stored/queried through the Knowledge Graph.
9. AI receives the structured analytical results and graph context.
10. AI generates an analytical summary.
11. Dashboard displays the complete analysis.
12. User clicks "Generate Report."
13. System creates a professional PDF.
14. User downloads the report.

---

## 10. KEY DIFFERENTIATORS (keep front-of-mind while building — don't cut these for shortcuts)

- Real analytical data processing (not just a CSV table viewer)
- Real ML-based anomaly detection (not hardcoded thresholds)
- KPI-driven dashboard
- Knowledge Graph-based relationship modeling (not flat document RAG)
- AI-powered interpretation that never fabricates numbers
- Automated summarization and technical reporting
- Interactive analytical visualization
- End-to-end, software-only, extendable architecture

---

## 11. COMPLETE APPLICATION SCOPE (MANDATORY — every item below must be fully built, tested, and working; this is the entire application, not a starting point)

- [ ] React.js dashboard — fully functional, all views wired to real backend data
- [ ] FastAPI backend — every route implemented and working
- [ ] CSV/Excel upload — both formats fully working
- [ ] Data preprocessing — complete pipeline, no shortcuts
- [ ] Peak analysis — real computed values, not sample/demo data
- [ ] KPI dashboard — live, real KPI values on every analysis
- [ ] Interactive chromatogram — fully interactive, real data
- [ ] ML anomaly detection (Isolation Forest) — real detection running on every analysis
- [ ] Neo4j Knowledge Graph — fully wired, all entities and relationships written and queryable
- [ ] MongoDB persistence — complete, all collections functional
- [ ] Groq/OpenRouter-backed AI summary — real LLM calls with working failover
- [ ] PDF report generation — real, complete, downloadable reports with every section populated

This is the complete, mandatory feature set for the finished application — not a reduced starting scope. Every checkbox must be a genuinely working feature before the build is considered complete.

---

## 12. FUTURE ENHANCEMENTS (genuinely out of scope for this build — do not build these now, but don't architect anything that blocks them later)

- GC-MS spectrum analysis, HPLC analysis
- More advanced anomaly detection (Autoencoder, One-Class SVM, clustering)
- Compound identification
- Historical sample comparison
- Instrument-specific models
- Automated reference/standard comparison
- Voice-based analytical assistant
- Multi-user laboratory management & RBAC
- Advanced Knowledge Graph reasoning (multi-hop queries, graph embeddings)
- LIMS (Laboratory Information Management System) integration
- Direct instrument-data integration
- Cloud-based deployment
- Model monitoring and retraining pipeline

---

## 13. NON-FUNCTIONAL REQUIREMENTS

- **Traceability:** every number in a report must be traceable to a specific stage's output (log/store intermediate results, not just the final text).
- **Determinism where it matters:** analytical calculations and KPI values must be reproducible given the same input file.
- **Resilience:** LLM provider failure (Groq down/rate-limited) must fail over to OpenRouter, not break the pipeline.
- **Explainability:** anomaly detection output should include the feature values that drove the score, not just a bare number.
- **Config-driven:** DB connection strings, LLM API keys, model choice, and provider priority all come from environment variables / a config file — never hardcoded.
- **Structured errors:** validation and processing failures return structured JSON errors the frontend can render, never raw exceptions.

---

## 14. UI/UX & RESPONSIVENESS REQUIREMENTS (MANDATORY — applies to every screen)

**This is not optional polish — it is part of the complete application mandate in Section 0.** The UI must work properly on desktop, tablet, and mobile, not just on a wide desktop viewport during development.

- **Fully responsive, mobile included:** every page (Home/Upload, Dashboard, History, Report) must be usable on a phone-width screen (~360–430px), a tablet (~768px), and desktop (1280px+) — not just "not broken," but genuinely well laid out at each size. Use CSS Grid/Flexbox with media queries in each component's `.module.css`; define breakpoints once as CSS custom properties (e.g. `--bp-sm`, `--bp-md`, `--bp-lg`) in `styles/tokens.css` and reuse them everywhere, so breakpoints stay consistent across every component instead of each file inventing its own.
- **No fixed pixel-width layouts.** Containers, cards, and grids must use relative units (`%`, `fr`, `rem`, `clamp()`) and flex/grid wrapping so content reflows instead of overflowing or getting clipped on small screens.
- **Mobile navigation:** the sidebar (`Sidebar.jsx`) must collapse into a hamburger menu or bottom navigation bar below the tablet breakpoint — it cannot simply shrink or get cut off.
- **Data-heavy components adapt, not just shrink:**
  - `PeakTable.jsx` and `HistoryList.jsx`: on narrow screens, switch from a multi-column table to a stacked card-per-row layout (or horizontal scroll with sticky first column) — a table squeezed into 360px of unreadable columns is not acceptable.
  - `Chromatogram.jsx` and `GraphVisualization.jsx`: must remain interactive and legible on mobile (touch-based pan/zoom via Plotly's built-in touch support; full-width container that resizes with the viewport, not a fixed pixel canvas).
  - `KPICards.jsx`: grid reflows from a multi-column row on desktop to 2-column or single-column stacking on mobile.
- **Touch targets:** every interactive element (buttons, upload dropzone, table row actions, nav links) must have a minimum touch target of ~44×44px on mobile — no tiny icon-only buttons that are hard to tap accurately.
- **Smooth, not janky:** transitions (page navigation, loading states, the multi-step upload progress indicator, collapsible AI summary sections) use CSS transitions/`@keyframes` with reasonable duration (150–300ms) and `ease`/`ease-in-out` timing — avoid abrupt layout shifts, especially content popping in above the fold after an async load completes.
- **Logical component placement and visual hierarchy on every screen:** this isn't just "does it fit" — related information must be grouped so the eye follows the pipeline naturally. On the dashboard specifically: KPI summary at the top (most glanceable info first) → chromatogram + peak table below it (the detailed data) → anomaly panel next to or below the chromatogram (directly associated with the data it flags) → AI summary panel clearly separated and labeled as AI-generated → report/download action anchored at the bottom or in a persistent action bar. Don't scatter these based on implementation order — place them based on how an analyst would actually want to read the page.
- **Proper end-to-end flow, not just individual working pages:** the visual flow from Upload → Validation feedback → Processing status → Dashboard → AI Summary → Report download must feel like one guided journey (clear "what happens next" cues, obvious current step, no dead ends) — not four independently-built pages stitched together by routes alone.
- **Test at real breakpoints, not just "resize the browser a bit":** Phase 9's hardening pass must include an explicit responsive QA pass — verify every page at common phone widths (~375px, ~414px), a tablet width (~768px), and desktop (~1440px), not just eyeballing at whatever width the dev's monitor happens to be.