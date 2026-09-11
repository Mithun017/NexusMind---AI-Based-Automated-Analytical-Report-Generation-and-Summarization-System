import React, { useState } from 'react';
import { Sparkles, Loader2, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { generateSummary } from '../../api/summary';
import styles from './AISummaryPanel.module.css';

export default function AISummaryPanel({ analysisId, aiSummary, aiInterpretation, onSummaryGenerated }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(true);

  const hasSummary = Boolean(aiInterpretation || aiSummary);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await generateSummary(analysisId);
      onSummaryGenerated?.(res);
    } catch (err) {
      setError(err.message || 'Failed to generate AI summary from provider.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.title}>
          <Sparkles size={20} color="#a5b4fc" />
          <span>AI Analytical Reasoning & Interpretation</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span className={styles.aiBadge}>LLM Engine (Groq / OpenRouter)</span>
          {hasSummary && (
            <button
              onClick={() => setExpanded(!expanded)}
              style={{ color: '#94a3b8', padding: '4px' }}
              aria-label="Toggle section"
            >
              {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          )}
        </div>
      </div>

      <div className={styles.disclaimer}>
        AI-Generated Content — strictly evaluated deterministically against computed KPIs.
      </div>

      {!hasSummary && !loading && (
        <button className={styles.btnGenerate} onClick={handleGenerate}>
          <Sparkles size={18} />
          <span>Generate AI Reasoning & Summary</span>
        </button>
      )}

      {loading && (
        <button className={styles.btnGenerate} disabled>
          <Loader2 className={styles.spinner} size={18} />
          <span>Synthesizing Chromatographic Context...</span>
        </button>
      )}

      {error && (
        <div style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '8px' }}>
          {error}
        </div>
      )}

      {hasSummary && expanded && (
        <div className={styles.contentWrapper}>
          {aiInterpretation && (
            <div className={styles.interpretationCard}>
              {aiInterpretation}
            </div>
          )}

          {aiSummary?.important_peaks && aiSummary.important_peaks.length > 0 && (
            <div className={styles.sectionBlock}>
              <span className={styles.sectionTitle}>Key Chromatographic Observations:</span>
              <ul className={styles.bulletList}>
                {aiSummary.important_peaks.map((p, idx) => (
                  <li key={idx} className={styles.bulletItem}>
                    <span className={styles.bulletDot}>•</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {aiSummary?.recommendations && aiSummary.recommendations.length > 0 && (
            <div className={styles.sectionBlock}>
              <span className={styles.sectionTitle}>Actionable Recommendations:</span>
              <ul className={styles.bulletList}>
                {aiSummary.recommendations.map((r, idx) => (
                  <li key={idx} className={styles.bulletItem}>
                    <span className={styles.bulletDot}>→</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {aiSummary?.conclusion && (
            <div className={styles.sectionBlock}>
              <span className={styles.sectionTitle}>Conclusion:</span>
              <div style={{ fontSize: '0.9rem', color: '#cbd5e1' }}>
                {aiSummary.conclusion}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
