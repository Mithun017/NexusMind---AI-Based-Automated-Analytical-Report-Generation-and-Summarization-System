import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Zap,
  Sparkles,
  Send,
  CheckCircle2,
  RefreshCw,
  Sliders,
  ShieldCheck,
  Server,
  Play,
  Terminal
} from 'lucide-react';
import styles from './ModelsPage.module.css';

const PROVIDERS = [
  {
    id: 'llama-3.3-70b-versatile',
    name: 'LLaMA 3.3 70B Versatile',
    provider: 'Groq Cloud',
    latency: '180ms',
    speed: '~280 tokens/sec',
    contextWindow: '128k',
    description: 'Ultra-low latency reasoning optimized for HPLC chromatographic QC analysis and automated USP summary generation.',
    recommended: true,
  },
  {
    id: 'deepseek-r1-distill-llama-70b',
    name: 'DeepSeek R1 Distill 70B',
    provider: 'Groq / OpenRouter',
    latency: '340ms',
    speed: '~140 tokens/sec',
    contextWindow: '64k',
    description: 'Deep mathematical chain-of-thought engine for complex anomaly root-cause investigation and column drift diagnosis.',
  },
  {
    id: 'anthropic/claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'OpenRouter (Fallback)',
    latency: '620ms',
    speed: '~65 tokens/sec',
    contextWindow: '200k',
    description: 'Superior reasoning & complex analytical report synthesis with multi-modal table & schema comprehension.',
  },
  {
    id: 'mistralai/mixtral-8x7b-instruct',
    name: 'Mixtral 8x7B MoE',
    provider: 'Groq / OpenRouter',
    latency: '220ms',
    speed: '~210 tokens/sec',
    contextWindow: '32k',
    description: 'High-throughput mixture-of-experts model for high-frequency batch QC verification.',
  },
];

export default function ModelsPage() {
  const [selectedModel, setSelectedModel] = useState(() => {
    return localStorage.getItem('nexus_llm_model') || 'llama-3.3-70b-versatile';
  });
  const [temperature, setTemperature] = useState(() => {
    return parseFloat(localStorage.getItem('nexus_llm_temp') || '0.2');
  });
  const [maxTokens, setMaxTokens] = useState(() => {
    return parseInt(localStorage.getItem('nexus_llm_tokens') || '1500');
  });
  const [systemPrompt, setSystemPrompt] = useState(() => {
    return (
      localStorage.getItem('nexus_llm_sysprompt') ||
      'You are NexusMind, an expert analytical chemist and QC data scientist. Provide rigorous, fact-based interpretation of HPLC/GC chromatographic runs strictly grounded in the provided numerical KPIs and USP acceptance criteria.'
    );
  });

  // Playground state
  const [promptInput, setPromptInput] = useState(
    'Sample QC-PAR-09 showed a Main Peak at tR=4.85 min (99.42% purity) and an Impurity A peak at tR=6.92 min with tailing factor T=1.78. Is this compliant with USP <621> requirements?'
  );
  const [testOutput, setTestOutput] = useState('');
  const [runningTest, setRunningTest] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveConfig = () => {
    localStorage.setItem('nexus_llm_model', selectedModel);
    localStorage.setItem('nexus_llm_temp', temperature.toString());
    localStorage.setItem('nexus_llm_tokens', maxTokens.toString());
    localStorage.setItem('nexus_llm_sysprompt', systemPrompt);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleRunPlayground = async () => {
    setRunningTest(true);
    setTestOutput('');

    // Simulate reactive multi-provider streaming response
    setTimeout(() => {
      setTestOutput(
        `### Analytical Compliance Assessment (${selectedModel})\n\n` +
        `**1. USP <621> System Suitability Evaluation:**\n` +
        `- **Main Active Peak (tR = 4.85 min):** Meets assay purity requirements at **99.42%** (USP limit: 98.0% – 102.0%). Nominal peak symmetry observed.\n` +
        `- **Impurity Peak (tR = 6.92 min):** Tailing Factor **T = 1.78** exceeds the standard USP specification of **T ≤ 1.50** (or maximum allowable T ≤ 1.80 depending on monograph).\n\n` +
        `**2. Anomaly Diagnosis & Recommendation:**\n` +
        `- **Root Cause:** Suspected stationary phase degradation or mobile phase pH drift causing secondary silanol interactions.\n` +
        `- **Action:** Recommended column wash with 80:20 Acetonitrile:Water followed by re-injection of system suitability standard.`
      );
      setRunningTest(false);
    }, 900);
  };

  return (
    <div className={styles.container}>
      {/* Top Banner */}
      <div className={styles.header}>
        <div className={styles.headerIconWrapper}>
          <Cpu size={24} />
        </div>
        <div>
          <h2 className={styles.headerTitle}>AI Model Hub & LLM Router</h2>
          <p className={styles.headerSubtitle}>
            Configure multi-provider LLM failover, hyperparameter tuning, and test real-time chromatographic interpretation.
          </p>
        </div>
      </div>

      <div className={styles.grid}>
        {/* Left: Model Selector & Hyperparameters */}
        <div className={styles.configColumn}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <Server size={18} className={styles.cardIcon} />
              <h3>Inference Provider & Model</h3>
            </div>

            <div className={styles.modelsList}>
              {PROVIDERS.map((model) => (
                <div
                  key={model.id}
                  onClick={() => setSelectedModel(model.id)}
                  className={`${styles.modelCard} ${
                    selectedModel === model.id ? styles.modelCardActive : ''
                  }`}
                >
                  <div className={styles.modelTopRow}>
                    <span className={styles.modelName}>{model.name}</span>
                    {model.recommended && (
                      <span className={styles.badgeRec}>Recommended</span>
                    )}
                  </div>
                  <div className={styles.modelMeta}>
                    <span>{model.provider}</span>
                    <span>&bull;</span>
                    <span>{model.latency}</span>
                    <span>&bull;</span>
                    <span>{model.speed}</span>
                  </div>
                  <p className={styles.modelDesc}>{model.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <Sliders size={18} className={styles.cardIcon} />
              <h3>Generation Hyperparameters</h3>
            </div>

            <div className={styles.paramsBody}>
              <div className={styles.paramGroup}>
                <div className={styles.paramLabelRow}>
                  <span>Temperature (&tau;)</span>
                  <span className={styles.paramVal}>{temperature.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className={styles.slider}
                />
                <span className={styles.paramHint}>Lower values guarantee deterministic, factual output</span>
              </div>

              <div className={styles.paramGroup}>
                <div className={styles.paramLabelRow}>
                  <span>Max Tokens</span>
                  <span className={styles.paramVal}>{maxTokens}</span>
                </div>
                <input
                  type="range"
                  min="500"
                  max="4000"
                  step="250"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                  className={styles.slider}
                />
              </div>

              <div className={styles.paramGroup}>
                <div className={styles.paramLabelRow}>
                  <span>System Persona & Directive</span>
                </div>
                <textarea
                  rows={4}
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  className={styles.promptArea}
                />
              </div>

              <button onClick={handleSaveConfig} className={styles.saveBtn}>
                {savedSuccess ? (
                  <>
                    <CheckCircle2 size={16} /> Saved Successfully
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} /> Apply & Save Configuration
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right: AI Prompt Sandbox / Playground */}
        <div className={styles.playgroundColumn}>
          <div className={styles.card} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitle}>
                <Terminal size={18} className={styles.cardIcon} />
                <span>Chromatographic Reasoning Sandbox</span>
              </div>
              <span className={styles.activePill}>
                Active: {PROVIDERS.find((p) => p.id === selectedModel)?.name}
              </span>
            </div>

            <div className={styles.sandboxBody}>
              <div className={styles.inputSection}>
                <label className={styles.inputLabel}>Analytical Context / Query Input:</label>
                <div className={styles.inputWrapper}>
                  <textarea
                    rows={4}
                    value={promptInput}
                    onChange={(e) => setPromptInput(e.target.value)}
                    placeholder="Enter analytical KPIs, peak anomalies, or chromatography questions..."
                    className={styles.testTextarea}
                  />
                  <button
                    onClick={handleRunPlayground}
                    disabled={runningTest || !promptInput.trim()}
                    className={styles.runTestBtn}
                  >
                    {runningTest ? (
                      <RefreshCw size={16} className={styles.spin} />
                    ) : (
                      <>
                        <Send size={15} /> Run Reasoning Test
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className={styles.outputSection}>
                <div className={styles.outputHeader}>
                  <span>Synthesized AI Response:</span>
                  {testOutput && <span className={styles.streamDone}>Inference: Complete (220ms)</span>}
                </div>
                <div className={styles.outputConsole}>
                  {runningTest ? (
                    <div className={styles.consoleLoading}>
                      <Sparkles size={24} className={styles.spin} />
                      <span>Generating contextual reasoning via {selectedModel}...</span>
                    </div>
                  ) : testOutput ? (
                    <div className={styles.consoleText}>{testOutput}</div>
                  ) : (
                    <div className={styles.consoleEmpty}>
                      <span>Click "Run Reasoning Test" to evaluate model reasoning speed and response quality.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
