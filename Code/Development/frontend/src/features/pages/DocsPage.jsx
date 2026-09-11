import React, { useState } from 'react';
import {
  BookOpen,
  Code2,
  Calculator,
  Layers,
  ArrowRight,
  Play,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Database
} from 'lucide-react';
import apiClient from '../../api/axios';
import styles from './DocsPage.module.css';

export default function DocsPage() {
  const [activeTab, setActiveTab] = useState('pipeline');

  // Calculator states
  const [calcTr1, setCalcTr1] = useState(4.2);
  const [calcTr2, setCalcTr2] = useState(4.85);
  const [calcW1, setCalcW1] = useState(0.25);
  const [calcW2, setCalcW2] = useState(0.28);

  const [calcTr, setCalcTr] = useState(4.85);
  const [calcW, setCalcW] = useState(0.22);

  const [calcW005, setCalcW005] = useState(0.36);
  const [calcF, setCalcF] = useState(0.18);

  // API Explorer states
  const [apiEndpoint, setApiEndpoint] = useState('/health');
  const [apiMethod, setApiMethod] = useState('GET');
  const [apiResponse, setApiResponse] = useState(null);
  const [apiLoading, setApiLoading] = useState(false);

  // Formula Calculations
  const calculatedRs = ((2 * (calcTr2 - calcTr1)) / (calcW1 + calcW2)).toFixed(2);
  const calculatedN = Math.round(16 * Math.pow(calcTr / calcW, 2));
  const calculatedT = (calcW005 / (2 * calcF)).toFixed(2);

  const handleTestApi = async () => {
    setApiLoading(true);
    setApiResponse(null);
    try {
      let res;
      if (apiMethod === 'GET') {
        res = await apiClient.get(apiEndpoint);
      } else {
        res = await apiClient.post(apiEndpoint, {});
      }
      setApiResponse({ status: 200, data: res });
    } catch (err) {
      setApiResponse({
        status: err.response?.status || 500,
        error: err.response?.data || err.message,
      });
    } finally {
      setApiLoading(false);
    }
  };

  const steps = [
    { num: '01', title: 'Encoding & Delimiter Detection', desc: 'Auto-detects UTF-8 / ASCII / Latin-1 encodings and comma, semicolon, tab, or whitespace delimited files.' },
    { num: '02', title: 'Column Mapping & Normalization', desc: 'Standardizes retention time (tR), absorbance (mAU), peak area, and peak height schema variants.' },
    { num: '03', title: 'Baseline Correction & Spline Fitting', desc: 'Applies asymmetric least squares (ALS) baseline correction to eliminate detector drift.' },
    { num: '04', title: 'Adaptive Peak Integration', desc: 'Calculates start, apex, end retention times, peak areas, and heights with Savitzky-Golay smoothing.' },
    { num: '05', title: 'Chromatographic Metrics Calculation', desc: 'Computes USP resolution (Rs), theoretical plates (N), and tailing factor (T) for every peak.' },
    { num: '06', title: 'Isolation Forest Anomaly Flagging', desc: 'Multi-feature outlier detection flagging asymmetric tailing, split peaks, or co-eluting impurities.' },
    { num: '07', title: 'Knowledge Graph & LLM Synthesis', desc: 'Writes entity ontology to Neo4j and synthesizes expert analytical QC conclusions via Groq LLaMA 3.3 70B.' },
  ];

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerIconWrapper}>
          <BookOpen size={24} />
        </div>
        <div>
          <h2 className={styles.headerTitle}>NexusMind Technical & API Documentation</h2>
          <p className={styles.headerSubtitle}>
            Architectural reference, chromatographic USP formulas, and interactive REST API endpoint explorer.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabNav}>
        <button
          onClick={() => setActiveTab('pipeline')}
          className={`${styles.tabBtn} ${activeTab === 'pipeline' ? styles.tabBtnActive : ''}`}
        >
          <Layers size={16} /> 7-Step Preprocessor Pipeline
        </button>
        <button
          onClick={() => setActiveTab('formulas')}
          className={`${styles.tabBtn} ${activeTab === 'formulas' ? styles.tabBtnActive : ''}`}
        >
          <Calculator size={16} /> USP & EP Formula Calculators
        </button>
        <button
          onClick={() => setActiveTab('api')}
          className={`${styles.tabBtn} ${activeTab === 'api' ? styles.tabBtnActive : ''}`}
        >
          <Code2 size={16} /> Interactive REST API Console
        </button>
      </div>

      {/* Tab 1: Pipeline */}
      {activeTab === 'pipeline' && (
        <div className={styles.pipelineContent}>
          <div className={styles.stepsGrid}>
            {steps.map((step) => (
              <div key={step.num} className={styles.stepCard}>
                <div className={styles.stepNumBadge}>{step.num}</div>
                <div className={styles.stepDetails}>
                  <h3 className={styles.stepTitle}>{step.title}</h3>
                  <p className={styles.stepDesc}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Formula Calculators */}
      {activeTab === 'formulas' && (
        <div className={styles.formulasGrid}>
          {/* Resolution Rs */}
          <div className={styles.formulaCard}>
            <div className={styles.formulaHeader}>
              <h3>USP Peak Resolution (R<sub>s</sub>)</h3>
              <span className={styles.formulaBadge}>USP &lt;621&gt;</span>
            </div>
            <div className={styles.equation}>
              R<sub>s</sub> = 2(t<sub>R2</sub> - t<sub>R1</sub>) / (W<sub>1</sub> + W<sub>2</sub>)
            </div>
            <div className={styles.calcInputs}>
              <div className={styles.calcRow}>
                <label>t<sub>R1</sub> (min):</label>
                <input type="number" step="0.05" value={calcTr1} onChange={(e) => setCalcTr1(parseFloat(e.target.value) || 0)} className={styles.calcInput} />
              </div>
              <div className={styles.calcRow}>
                <label>t<sub>R2</sub> (min):</label>
                <input type="number" step="0.05" value={calcTr2} onChange={(e) => setCalcTr2(parseFloat(e.target.value) || 0)} className={styles.calcInput} />
              </div>
              <div className={styles.calcRow}>
                <label>W<sub>1</sub> (min):</label>
                <input type="number" step="0.01" value={calcW1} onChange={(e) => setCalcW1(parseFloat(e.target.value) || 0)} className={styles.calcInput} />
              </div>
              <div className={styles.calcRow}>
                <label>W<sub>2</sub> (min):</label>
                <input type="number" step="0.01" value={calcW2} onChange={(e) => setCalcW2(parseFloat(e.target.value) || 0)} className={styles.calcInput} />
              </div>
            </div>
            <div className={styles.calcResultBox}>
              <span>Calculated R<sub>s</sub>:</span>
              <span className={calculatedRs >= 1.5 ? styles.resultPass : styles.resultFail}>
                {calculatedRs} {calculatedRs >= 1.5 ? '(&ge; 1.50 PASS)' : '(&lt; 1.50 FAIL)'}
              </span>
            </div>
          </div>

          {/* Theoretical Plates N */}
          <div className={styles.formulaCard}>
            <div className={styles.formulaHeader}>
              <h3>Theoretical Column Plates (N)</h3>
              <span className={styles.formulaBadge}>Efficiency</span>
            </div>
            <div className={styles.equation}>
              N = 16 &times; (t<sub>R</sub> / W)<sup>2</sup>
            </div>
            <div className={styles.calcInputs}>
              <div className={styles.calcRow}>
                <label>t<sub>R</sub> (min):</label>
                <input type="number" step="0.05" value={calcTr} onChange={(e) => setCalcTr(parseFloat(e.target.value) || 0)} className={styles.calcInput} />
              </div>
              <div className={styles.calcRow}>
                <label>Baseline Width W (min):</label>
                <input type="number" step="0.01" value={calcW} onChange={(e) => setCalcW(parseFloat(e.target.value) || 0)} className={styles.calcInput} />
              </div>
            </div>
            <div className={styles.calcResultBox}>
              <span>Calculated Plates (N):</span>
              <span className={calculatedN >= 2000 ? styles.resultPass : styles.resultFail}>
                {calculatedN.toLocaleString()} plates {calculatedN >= 2000 ? '(&ge; 2,000 PASS)' : '(&lt; 2,000 FAIL)'}
              </span>
            </div>
          </div>

          {/* Tailing Factor T */}
          <div className={styles.formulaCard}>
            <div className={styles.formulaHeader}>
              <h3>USP Peak Tailing Factor (T)</h3>
              <span className={styles.formulaBadge}>Symmetry</span>
            </div>
            <div className={styles.equation}>
              T = W<sub>0.05</sub> / (2 &times; f)
            </div>
            <div className={styles.calcInputs}>
              <div className={styles.calcRow}>
                <label>Width @ 5% Height (W<sub>0.05</sub>):</label>
                <input type="number" step="0.01" value={calcW005} onChange={(e) => setCalcW005(parseFloat(e.target.value) || 0)} className={styles.calcInput} />
              </div>
              <div className={styles.calcRow}>
                <label>Front half-width (f):</label>
                <input type="number" step="0.01" value={calcF} onChange={(e) => setCalcF(parseFloat(e.target.value) || 0)} className={styles.calcInput} />
              </div>
            </div>
            <div className={styles.calcResultBox}>
              <span>Calculated T:</span>
              <span className={calculatedT <= 1.5 ? styles.resultPass : styles.resultFail}>
                {calculatedT} {calculatedT <= 1.5 ? '(&le; 1.50 PASS)' : '(&gt; 1.50 ASYMMETRIC)'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: API Explorer */}
      {activeTab === 'api' && (
        <div className={styles.apiExplorerCard}>
          <div className={styles.apiHeader}>
            <h3>Direct REST API Console</h3>
            <p>Execute live HTTP requests against the FastAPI backend container.</p>
          </div>

          <div className={styles.apiInputBar}>
            <select
              value={apiMethod}
              onChange={(e) => setApiMethod(e.target.value)}
              className={styles.methodSelect}
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
            </select>

            <select
              value={apiEndpoint}
              onChange={(e) => setApiEndpoint(e.target.value)}
              className={styles.endpointSelect}
            >
              <option value="/health">GET /health</option>
              <option value="/history?page=1&limit=5">GET /history</option>
              <option value="/kpi/demo">GET /kpi/:id</option>
              <option value="/anomaly/demo">GET /anomaly/:id</option>
              <option value="/graph/demo">GET /graph/:id</option>
            </select>

            <button
              onClick={handleTestApi}
              disabled={apiLoading}
              className={styles.sendApiBtn}
            >
              <Play size={15} /> {apiLoading ? 'Sending...' : 'Execute Request'}
            </button>
          </div>

          <div className={styles.responseConsole}>
            <div className={styles.consoleBar}>
              <span>Response Status:</span>
              {apiResponse && (
                <span
                  className={apiResponse.status === 200 ? styles.resOk : styles.resErr}
                >
                  HTTP {apiResponse.status}
                </span>
              )}
            </div>
            <pre className={styles.consoleBody}>
              {apiLoading
                ? 'Connecting to backend endpoint...'
                : apiResponse
                ? JSON.stringify(apiResponse.data || apiResponse.error, null, 2)
                : '// Click "Execute Request" to test endpoint response in real-time'}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
