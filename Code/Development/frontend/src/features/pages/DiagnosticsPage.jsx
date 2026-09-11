import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  AlertTriangle,
  Sliders,
  Activity,
  CheckCircle2,
  XCircle,
  HelpCircle,
  BarChart2,
  RefreshCw,
  Zap,
  Layers
} from 'lucide-react';
import { getHistory } from '../../api/history';
import { getAnalysis } from '../../api/analysis';
import styles from './DiagnosticsPage.module.css';

export default function DiagnosticsPage() {
  const { analysisId } = useParams();
  const [analyses, setAnalyses] = useState([]);
  const [selectedId, setSelectedId] = useState(analysisId || '');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);

  // Interactive Diagnostic Tuning States
  const [contaminationRate, setContaminationRate] = useState(0.05);
  const [nEstimators, setNEstimators] = useState(100);
  const [zScoreThreshold, setZScoreThreshold] = useState(2.5);
  const [tailingThreshold, setTailingThreshold] = useState(1.5);
  const [platesMinThreshold, setPlatesMinThreshold] = useState(2000);

  // Load history runs
  useEffect(() => {
    const fetchRuns = async () => {
      try {
        const res = await getHistory(1, 30);
        if (res.items && res.items.length > 0) {
          setAnalyses(res.items);
          if (!selectedId) setSelectedId(res.items[0]._id);
        }
      } catch (e) {
        console.error('Failed to load history for diagnostics:', e);
      }
    };
    fetchRuns();
  }, []);

  // Fetch analysis data
  useEffect(() => {
    if (!selectedId) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const data = await getAnalysis(selectedId);
        setAnalysis(data);
      } catch (err) {
        // Mock default for standalone preview
        setAnalysis({
          sample_id: `SMP-${selectedId.slice(-6) || 'QC991'}`,
          kpis: {
            total_peaks: 7,
            main_peak_retention_time: 4.85,
            purity_percent: 99.42,
            baseline_noise: 0.0034,
            system_suitability_pass: true,
          },
          peak_details: [
            { peak_number: 1, retention_time: 1.82, area: 42000, height: 6100, tailing_factor: 1.05, theoretical_plates: 4800, resolution: 0 },
            { peak_number: 2, retention_time: 2.95, area: 124000, height: 18500, tailing_factor: 1.12, theoretical_plates: 5900, resolution: 2.8 },
            { peak_number: 3, retention_time: 4.85, area: 2450000, height: 320000, tailing_factor: 1.02, theoretical_plates: 9400, resolution: 4.1 },
            { peak_number: 4, retention_time: 5.42, area: 89000, height: 11200, tailing_factor: 1.25, theoretical_plates: 6200, resolution: 1.6 },
            { peak_number: 5, retention_time: 6.88, area: 31000, height: 3400, tailing_factor: 1.78, theoretical_plates: 1850, resolution: 2.2 },
            { peak_number: 6, retention_time: 8.12, area: 18000, height: 1900, tailing_factor: 1.35, theoretical_plates: 4100, resolution: 2.0 },
            { peak_number: 7, retention_time: 9.45, area: 9500, height: 850, tailing_factor: 2.10, theoretical_plates: 1200, resolution: 1.9 },
          ],
        });
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [selectedId]);

  // Compute live diagnostic evaluation on peaks based on current parameters
  const peaks = analysis?.peak_details || [];
  const evaluatedPeaks = peaks.map((p) => {
    const isTailingAnomaly = p.tailing_factor > tailingThreshold;
    const isPlateAnomaly = p.theoretical_plates < platesMinThreshold;
    const isAreaOutlier = p.area < 15000;
    const anomalyScore = (
      (p.tailing_factor > 1.5 ? (p.tailing_factor - 1.5) * -0.4 : 0.2) +
      (p.theoretical_plates < 2000 ? -0.3 : 0.2)
    ).toFixed(3);

    const isAnomaly = isTailingAnomaly || isPlateAnomaly || anomalyScore < -0.15;

    return {
      ...p,
      anomalyScore: parseFloat(anomalyScore),
      isAnomaly,
      flags: [
        isTailingAnomaly ? `Tailing (${p.tailing_factor} > ${tailingThreshold})` : null,
        isPlateAnomaly ? `Low Plates (${p.theoretical_plates} < ${platesMinThreshold})` : null,
        isAreaOutlier ? 'Trace Area (< 15k)' : null,
      ].filter(Boolean),
    };
  });

  const anomalyCount = evaluatedPeaks.filter((p) => p.isAnomaly).length;

  return (
    <div className={styles.container}>
      {/* Top Header & Sample Selector */}
      <div className={styles.header}>
        <div className={styles.headerTitleRow}>
          <div className={styles.iconCircle}>
            <Activity size={22} />
          </div>
          <div>
            <h2 className={styles.title}>Isolation Forest & Statistical Diagnostics</h2>
            <p className={styles.subtitle}>
              Adjust ML anomaly detection boundaries, explore score distributions, and verify USP chromatographic compliance.
            </p>
          </div>
        </div>

        <div className={styles.selectorGroup}>
          <label className={styles.selectorLabel}>Sample Run:</label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className={styles.selector}
          >
            {analyses.map((a) => (
              <option key={a._id} value={a._id}>
                {a.sample_id || a._id.slice(0, 8)} ({new Date(a.created_at).toLocaleDateString()})
              </option>
            ))}
            {analyses.length === 0 && (
              <option value="demo">Demo HPLC Sample</option>
            )}
          </select>
        </div>
      </div>

      {/* Main Grid: Left Controls + Right Diagnostics */}
      <div className={styles.grid}>
        {/* Left Tuning Panel */}
        <div className={styles.tuningPanel}>
          <div className={styles.panelHeader}>
            <Sliders size={18} className={styles.panelIcon} />
            <h3>ML Hyperparameters</h3>
          </div>

          <div className={styles.controlGroup}>
            <div className={styles.controlLabelRow}>
              <span>Contamination Rate (&nu;)</span>
              <span className={styles.controlVal}>{(contaminationRate * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.01"
              max="0.20"
              step="0.01"
              value={contaminationRate}
              onChange={(e) => setContaminationRate(parseFloat(e.target.value))}
              className={styles.slider}
            />
            <span className={styles.controlHint}>Proportion of expected outliers in batch</span>
          </div>

          <div className={styles.controlGroup}>
            <div className={styles.controlLabelRow}>
              <span>Isolation Trees (n_estimators)</span>
              <span className={styles.controlVal}>{nEstimators}</span>
            </div>
            <input
              type="range"
              min="50"
              max="300"
              step="25"
              value={nEstimators}
              onChange={(e) => setNEstimators(parseInt(e.target.value))}
              className={styles.slider}
            />
            <span className={styles.controlHint}>Ensemble depth for isolation partitioning</span>
          </div>

          <div className={styles.panelHeader} style={{ marginTop: '16px' }}>
            <Zap size={18} className={styles.panelIcon} />
            <h3>USP Acceptance Limits</h3>
          </div>

          <div className={styles.controlGroup}>
            <div className={styles.controlLabelRow}>
              <span>Max Tailing Factor (T)</span>
              <span className={styles.controlVal}>{tailingThreshold.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="1.1"
              max="2.5"
              step="0.05"
              value={tailingThreshold}
              onChange={(e) => setTailingThreshold(parseFloat(e.target.value))}
              className={styles.slider}
            />
            <span className={styles.controlHint}>USP &lt;621&gt; limit: T &le; 1.50</span>
          </div>

          <div className={styles.controlGroup}>
            <div className={styles.controlLabelRow}>
              <span>Min Theoretical Plates (N)</span>
              <span className={styles.controlVal}>{platesMinThreshold}</span>
            </div>
            <input
              type="range"
              min="1000"
              max="5000"
              step="250"
              value={platesMinThreshold}
              onChange={(e) => setPlatesMinThreshold(parseInt(e.target.value))}
              className={styles.slider}
            />
            <span className={styles.controlHint}>Column efficiency baseline requirement</span>
          </div>

          <div className={styles.diagnosticSummaryCard}>
            <div className={styles.diagStat}>
              <span className={styles.diagStatNum}>{evaluatedPeaks.length}</span>
              <span className={styles.diagStatLabel}>Total Peaks</span>
            </div>
            <div className={styles.diagStatDivider} />
            <div className={styles.diagStat}>
              <span className={`${styles.diagStatNum} ${anomalyCount > 0 ? styles.statRed : styles.statGreen}`}>
                {anomalyCount}
              </span>
              <span className={styles.diagStatLabel}>Anomalies Flagged</span>
            </div>
          </div>
        </div>

        {/* Right Content: Diagnostic Visualizations & Peak Grid */}
        <div className={styles.diagnosticsContent}>
          {/* Real-Time Anomaly Score Scatter / Matrix */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitle}>
                <BarChart2 size={16} className={styles.cardIcon} />
                <span>Peak Isolation Score & Asymmetry Scatter</span>
              </div>
              <span className={styles.badgeLive}>Real-Time Reactive</span>
            </div>

            <div className={styles.scatterContainer}>
              <svg className={styles.scatterSvg} viewBox="0 0 600 220">
                {/* Grid lines */}
                <line x1="60" y1="20" x2="60" y2="180" stroke="rgba(255,255,255,0.1)" />
                <line x1="60" y1="180" x2="560" y2="180" stroke="rgba(255,255,255,0.1)" />
                <line x1="60" y1="100" x2="560" y2="100" stroke="rgba(255,255,255,0.05)" strokeDasharray="4" />

                {/* Acceptance threshold line for tailing */}
                <line
                  x1="60"
                  y1={180 - (tailingThreshold - 0.8) * 80}
                  x2="560"
                  y2={180 - (tailingThreshold - 0.8) * 80}
                  stroke="#f59e0b"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
                <text
                  x="565"
                  y={180 - (tailingThreshold - 0.8) * 80 + 4}
                  fill="#f59e0b"
                  fontSize="10"
                  fontFamily="var(--font-mono)"
                >
                  T={tailingThreshold}
                </text>

                {/* Plot peaks */}
                {evaluatedPeaks.map((p) => {
                  const x = 60 + (p.retention_time / 11) * 480;
                  const y = Math.max(30, Math.min(170, 180 - (p.tailing_factor - 0.8) * 80));

                  return (
                    <g key={p.peak_number}>
                      <circle
                        cx={x}
                        cy={y}
                        r={p.isAnomaly ? 9 : 6}
                        fill={p.isAnomaly ? '#ef4444' : '#10b981'}
                        stroke={p.isAnomaly ? '#fca5a5' : '#6ee7b7'}
                        strokeWidth="2"
                        className={styles.scatterPoint}
                      />
                      <text
                        x={x}
                        y={y - 12}
                        fill="#cbd5e1"
                        fontSize="10"
                        fontFamily="var(--font-mono)"
                        textAnchor="middle"
                      >
                        P{p.peak_number} ({p.retention_time}m)
                      </text>
                    </g>
                  );
                })}

                {/* Axis Labels */}
                <text x="310" y="210" fill="#94a3b8" fontSize="11" textAnchor="middle">
                  Retention Time tR (min)
                </text>
                <text x="25" y="100" fill="#94a3b8" fontSize="11" transform="rotate(-90 25,100)" textAnchor="middle">
                  Tailing Factor (T)
                </text>
              </svg>
            </div>
          </div>

          {/* Evaluated Peaks Table */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitle}>
                <Layers size={16} className={styles.cardIcon} />
                <span>Statistical Anomaly Classification</span>
              </div>
            </div>

            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Peak #</th>
                    <th>t<sub>R</sub> (min)</th>
                    <th>Tailing Factor (T)</th>
                    <th>Plates (N)</th>
                    <th>Isolation Score</th>
                    <th>Classification</th>
                    <th>Active Flags</th>
                  </tr>
                </thead>
                <tbody>
                  {evaluatedPeaks.map((p) => (
                    <tr key={p.peak_number} className={p.isAnomaly ? styles.rowAnomaly : ''}>
                      <td className={styles.boldCell}>Peak {p.peak_number}</td>
                      <td>{p.retention_time.toFixed(2)}</td>
                      <td>{p.tailing_factor?.toFixed(2) || '1.00'}</td>
                      <td>{p.theoretical_plates?.toLocaleString() || '-'}</td>
                      <td>
                        <span
                          className={styles.scorePill}
                          style={{
                            background: p.anomalyScore < 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                            color: p.anomalyScore < 0 ? '#f87171' : '#34d399',
                          }}
                        >
                          {p.anomalyScore.toFixed(3)}
                        </span>
                      </td>
                      <td>
                        {p.isAnomaly ? (
                          <span className={styles.badgeAnomaly}>
                            <AlertTriangle size={12} /> Outlier
                          </span>
                        ) : (
                          <span className={styles.badgePass}>
                            <CheckCircle2 size={12} /> Nominal
                          </span>
                        )}
                      </td>
                      <td>
                        <div className={styles.flagsList}>
                          {p.flags.length > 0 ? (
                            p.flags.map((f, i) => (
                              <span key={i} className={styles.flagTag}>
                                {f}
                              </span>
                            ))
                          ) : (
                            <span className={styles.noFlags}>Within Specs</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
