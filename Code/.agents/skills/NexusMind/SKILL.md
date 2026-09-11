# SKILL — Building NexusMind (AI-Based Automated Analytical Report Generation and Summarization System)

> Read `Master_prompt.md` first for *what* to build. This file is *how* to build it — conventions, patterns, and guardrails the agent (Antigravity) should follow at every stage. Read `workflow.md` for *in what order*.

---

## 1. GLOBAL CONVENTIONS

- **Repo layout (monorepo):**
```
/frontend        → React + Vite app
/backend         → FastAPI app
  /app
    /api          → route handlers only, no business logic
    /core         → config, security, provider interfaces (LLM, storage)
    /db           → MongoDB connection + models/schemas
    /graph        → Neo4j connection + queries
    /services     → business logic per module (preprocessing, ml, kpi, kg, ai, report)
    /schemas      → Pydantic request/response models
    /utils
  /tests
/docker           → Dockerfiles + docker-compose.yml
```
- **Never mix concerns:** a FastAPI route handler should call one service function and return its result — no pandas/sklearn/LLM calls inline in `api/`.
- **Every stage in the pipeline (Section 4 of Master_prompt.md) is its own service module** with a clear function signature in and structured JSON out. This makes the pipeline testable stage-by-stage and keeps the LLM boundary enforceable.
- **Config via environment variables** (`.env` + `pydantic-settings`), never hardcoded secrets, connection strings, or API keys. Provide a `.env.example` with every required key documented.
- **Never let the LLM compute a number.** Any service that calls the LLM must pass it a fully-computed JSON payload and must not accept free numeric input from the model back into KPIs/state.

---

## 2. BACKEND (FastAPI) PATTERNS

### 2.1 Project bootstrap
- Use `FastAPI()` app factory pattern (`create_app()` in `app/main.py`) so tests can spin up isolated instances.
- CORS configured explicitly for the Vite dev origin and the production frontend origin — never `allow_origins=["*"]` in anything meant to ship.
- Health check endpoint (`/health`) that checks MongoDB and Neo4j connectivity — this is the first thing to verify after any infra change.

### 2.2 MongoDB layer
- Use `motor` (async) as the driver so it matches FastAPI's async request handlers; if the agent's environment makes async painful, `pymongo` (sync) is an acceptable fallback but should be isolated behind a repository-pattern interface so it can be swapped later without touching services.
- One "repository" module per collection (`uploads_repo.py`, `analyses_repo.py`, `reports_repo.py`, `samples_repo.py`, `users_repo.py`). Services call repositories; repositories are the only code that touches `pymongo`/`motor` directly.
- Store MongoDB `_id` (as string) alongside every Neo4j node that represents the same real-world entity, so the two databases stay linkable without duplicating data.
- Index at minimum: `uploads.upload_id`, `analyses.sample_id`, `analyses.created_at`, `reports.analysis_id`.

### 2.3 Knowledge Graph layer (Neo4j)
- One `graph/connection.py` managing the driver/session lifecycle (use the official `neo4j` Python driver).
- One `graph/queries.py` (or split per entity) holding parametrized Cypher — never string-format raw values into Cypher; always use query parameters to avoid injection and stay debuggable.
- Write a small `graph/schema.py` that defines constraints/indexes (e.g. uniqueness on `Sample.id`, `Compound.name`) and is run once at startup or via a setup script — don't rely on Neo4j auto-creating consistent structure.
- Keep the entity/relationship model exactly as defined in Master_prompt.md §5.8 — don't invent new relationship types ad hoc; if a new relationship is genuinely needed, add it there first.

### 2.4 ML layer (Anomaly Detection)
- Define an abstract interface, e.g.:
```python
class AnomalyDetector(Protocol):
    def fit(self, features: pd.DataFrame) -> None: ...
    def score(self, features: pd.DataFrame) -> list[AnomalyResult]: ...
```
- `IsolationForestDetector` is the shipped implementation (scikit-learn `IsolationForest`), fully wired and running on every analysis. Keep hyperparameters (contamination rate, n_estimators) in config, not hardcoded magic numbers buried in the class.
- `AnomalyResult` should carry: peak/row identifier, anomaly score, boolean/confidence classification, and the **feature values that produced the score** (for explainability — Master_prompt.md §13).
- Never retrain silently on every request unless that's an explicit design choice; document whether the model is fit per-upload (likely, given small datasets) or persisted/reused.

### 2.5 LLM provider layer (Groq / OpenRouter)
- Define:
```python
class LLMProvider(Protocol):
    async def complete(self, system_prompt: str, user_payload: dict) -> str: ...
```
- Implement `GroqProvider` and `OpenRouterProvider` against this interface.
- A small `LLMRouter`/`LLMOrchestrator` tries the primary provider (Groq) first; on timeout, 429, or 5xx, it fails over to the secondary (OpenRouter). Log which provider actually served each request (needed for debugging/cost tracking later).
- The system prompt sent to whichever provider must always include an explicit instruction along the lines of: *"You will be given structured analytical results, ML output, and knowledge-graph context as JSON. Do not invent, recompute, or alter any numeric value. Only interpret and explain what is given."*
- Never pass raw uploaded file contents to the LLM — only the already-processed structured summary. This keeps prompts small, cheap, and prevents the model from "helpfully" recalculating numbers itself.

### 2.6 Report generation (ReportLab)
- Keep report layout as a template function that accepts a fully-assembled `ReportContext` (Pydantic model) containing every section's data — the generator should not query MongoDB/Neo4j/LLM itself; it only renders.
- Charts embedded in the PDF should be pre-rendered to PNG (e.g., via `matplotlib` or `kaleido`/Plotly static export) and inserted as images — don't try to make ReportLab draw the chromatogram natively.
- Store the generated PDF to the local `/reports` directory (behind a storage interface, per Master_prompt.md §6) and record its path + metadata in the `reports` collection.

### 2.7 Error handling
- All service-layer exceptions should be typed (`ValidationError`, `ProcessingError`, `LLMProviderError`, `GraphError`, etc.) and mapped to structured JSON error responses in a single FastAPI exception handler — never let a raw traceback reach the client.

---

## 3. FRONTEND (React + Vite) PATTERNS

- **No CSS framework — plain CSS / CSS Modules only.** Do not install or use Tailwind, Bootstrap, Material UI, Chakra, or any utility-class/component library. Every component gets its own `ComponentName.module.css` file, imported and applied via `className={styles.foo}`. Global design tokens (colors, spacing scale, radii, shadows, glass-effect blur/opacity values, typography scale, **and breakpoints** — `--bp-sm`, `--bp-md`, `--bp-lg`) live in one `styles/tokens.css` using `:root` CSS custom properties, imported once in `main.jsx`. Every component-level CSS file reads from these variables (`var(--color-accent)`, `var(--space-md)`) rather than hardcoding values, so the whole app stays visually consistent without a framework enforcing it.
- **Responsive by default, mobile included (Master_prompt.md §14):** every component's `.module.css` must include media queries at the shared breakpoints, not just a single desktop layout. Use CSS Grid/Flexbox with relative units (`%`, `fr`, `rem`, `clamp()`) — never fixed pixel widths on containers or cards. Build and check each component at phone width first, then verify it still holds up at tablet/desktop, rather than designing desktop-first and hoping it degrades gracefully.
- **Data-heavy components need an explicit mobile layout, not just shrinking:** `PeakTable.jsx`/`HistoryList.jsx` switch to stacked cards (or horizontal scroll with a sticky first column) below the tablet breakpoint. `Chromatogram.jsx`/`GraphVisualization.jsx` must resize to a fluid-width container and keep Plotly's touch pan/zoom working on mobile. `KPICards.jsx`'s grid reflows from multi-column to 1–2 columns on narrow screens.
- **Touch targets ≥44×44px** on every interactive element — buttons, dropzone, row actions, nav links.
- Feature-folder structure (`/features/upload`, `/features/dashboard`, `/features/report`, `/features/history`) rather than one giant `components/` dump. Each feature folder holds its `.jsx` files alongside their `.module.css` files.
- API calls centralized in an `api/` layer using Axios with a single configured instance (base URL, interceptors for error toasts) — components never call `fetch`/`axios` directly.
- Use Recharts for standard KPI/trend charts; use Plotly.js specifically for the interactive chromatogram (peak markers, zoom/pan, anomaly highlighting) since it's better suited to that kind of scientific plot.
- Keep upload → processing → results as a explicit multi-step UI state machine (e.g. `idle → uploading → validating → processing → ready → error`) so the dashboard can show meaningful progress instead of a single spinner — this is also the visible "guided flow" the person follows end to end (Master_prompt.md §14).
- KPI cards, peak table, anomaly panel, AI summary panel, and "Generate Report" action should be visually and structurally separate components, even though they render from the same `analysis` object — this mirrors the backend's stage separation and keeps the UI debuggable. Place them on the page in reading order — KPIs first, chromatogram + peak table next, anomaly panel adjacent to the data it flags, AI summary clearly labeled and separated, report action anchored last — not in whatever order they happened to get built.
- Transitions and loading states use CSS transitions/`@keyframes`, 150–300ms, `ease`/`ease-in-out` — no abrupt layout pop-in once async data arrives.

---

## 4. TESTING GUARDRAILS

- Unit test each service module in isolation (preprocessing, KPI calc, anomaly detector, KG query builder, LLM prompt builder) with small synthetic CSVs — don't require a live Neo4j/Mongo/LLM connection for these.
- Integration test the full pipeline against one canonical sample CSV fixture checked into `/backend/tests/fixtures/`, asserting KPI values are exact and deterministic.
- Mock the LLM provider in tests — never call a real Groq/OpenRouter endpoint from automated tests (cost + flakiness). Assert on the *payload sent to* the LLM, not on generated prose.

---

## 5. THINGS THE AGENT SHOULD NEVER DO

- Never let the LLM output a number that gets displayed as a KPI, peak value, or anomaly score — those always come from the analytical/ML engine.
- Never hardcode Groq or OpenRouter as the *only* provider with no fallback path.
- Never swap MongoDB for PostgreSQL/SQLite "for convenience" — MongoDB is a locked requirement.
- Never bypass the repository layer and call `pymongo`/`motor` directly from a route handler or service.
- Never write raw string-interpolated Cypher queries.
- Never put API keys, DB URIs, or secrets directly in source files — always via environment variables.
- Never collapse the pipeline stages into one giant function "to move faster" — the stage separation is what makes this project's KG/ML/AI story demonstrable and maintainable.
- Never install or import Tailwind, Bootstrap, or any other CSS framework — plain CSS / CSS Modules is a locked requirement (Master_prompt.md §6).
- Never ship a feature listed in Master_prompt.md §11 as a stub, a mock, hardcoded demo data, or a disabled UI element — this is the complete application, not a v1/prototype. If something is genuinely infeasible, say so explicitly rather than faking it.
- Never build a component with only a desktop layout — every `.module.css` needs the responsive treatment in §3, checked at phone/tablet/desktop widths, not just assumed to "probably reflow fine."