import React, { useEffect, useRef, useState, useMemo } from 'react';
import Plotly from 'plotly.js-dist-min';
import { Activity, Sparkles, Filter, Layers, ZoomIn, Info } from 'lucide-react';
import styles from './Chromatogram.module.css';

export default function Chromatogram({ peaks = [], anomalies = [] }) {
  const plotRef = useRef(null);
  const [filterMode, setFilterMode] = useState('all'); // 'all', 'anomalies', 'major'
  const [showTopLabels, setShowTopLabels] = useState(true);

  const anomalyMap = useMemo(() => {
    const map = new Map();
    anomalies.forEach((a) => {
      if (a.is_anomaly) {
        map.set(a.peak_id, a);
      }
    });
    return map;
  }, [anomalies]);

  // Compute filtered peaks based on active mode
  const displayedPeaks = useMemo(() => {
    if (!peaks || peaks.length === 0) return [];
    if (filterMode === 'anomalies') {
      return peaks.filter((p) => anomalyMap.has(p.peak_id));
    }
    if (filterMode === 'major') {
      const sorted = [...peaks].sort((a, b) => (b.intensity || 0) - (a.intensity || 0));
      return sorted.slice(0, Math.min(25, sorted.length));
    }
    return peaks;
  }, [peaks, anomalyMap, filterMode]);

  // Identify top 3 highest peaks for clean non-cluttered callout badges
  const topPeakIds = useMemo(() => {
    if (!peaks || peaks.length === 0) return new Set();
    const sorted = [...peaks].sort((a, b) => (b.intensity || 0) - (a.intensity || 0));
    return new Set(sorted.slice(0, 3).map((p) => p.peak_id));
  }, [peaks]);

  useEffect(() => {
    if (!plotRef.current || displayedPeaks.length === 0) return;

    const normalPeaks = displayedPeaks.filter((p) => !anomalyMap.has(p.peak_id));
    const anomalyPeaks = displayedPeaks.filter((p) => anomalyMap.has(p.peak_id));

    const traces = [];

    // 1. Standard Chromatographic Peaks trace
    if (normalPeaks.length > 0) {
      traces.push({
        x: normalPeaks.map((p) => p.retention_time),
        y: normalPeaks.map((p) => p.intensity),
        text: normalPeaks.map(
          (p) =>
            `<b style="color:#d4af37;">${p.peak_id}</b>: <b>${p.compound_name || 'Standard Compound'}</b><br>` +
            `Retention Time: <b>${Number(p.retention_time).toFixed(2)} min</b><br>` +
            `Peak Intensity: <b>${Number(p.intensity).toLocaleString()} mAU</b><br>` +
            `Integrated Area: <b>${Number(p.peak_area || 0).toLocaleString()}</b>`
        ),
        hoverinfo: 'text',
        mode: 'markers',
        type: 'scatter',
        name: 'Standard Peak',
        marker: {
          color: '#eedbbb',
          size: displayedPeaks.length > 300 ? 6 : 8,
          symbol: 'diamond',
          opacity: 0.85,
          line: { color: '#c5a059', width: 1.2 },
        },
      });
    }

    // 2. Anomaly Peaks trace (Ruby Outliers)
    if (anomalyPeaks.length > 0) {
      traces.push({
        x: anomalyPeaks.map((p) => p.retention_time),
        y: anomalyPeaks.map((p) => p.intensity),
        text: anomalyPeaks.map((p) => {
          const anom = anomalyMap.get(p.peak_id);
          return (
            `<b style="color:#ef4444;">⚠️ [ANOMALY] ${p.peak_id}</b>: <b>${p.compound_name || 'Degradant / Unknown'}</b><br>` +
            `Anomaly Score: <b style="color:#ef4444;">${anom?.anomaly_score ? Number(anom.anomaly_score).toFixed(4) : 'High'}</b><br>` +
            `Confidence: <b>${anom?.confidence ? Number(anom.confidence).toFixed(1) : 95}%</b><br>` +
            `Retention Time: <b>${Number(p.retention_time).toFixed(2)} min</b><br>` +
            `Intensity: <b>${Number(p.intensity).toLocaleString()} mAU</b>`
          );
        }),
        hoverinfo: 'text',
        mode: 'markers',
        type: 'scatter',
        name: 'Anomaly Flagged',
        marker: {
          color: '#ef4444',
          size: displayedPeaks.length > 300 ? 9 : 12,
          symbol: 'diamond',
          opacity: 0.95,
          line: { color: '#fca5a5', width: 1.8 },
        },
      });
    }

    // 3. Clean annotations only for top 3 major peaks to avoid cluttering 1000 points
    const annotations = [];
    if (showTopLabels && displayedPeaks.length > 0) {
      const topMajor = displayedPeaks.filter((p) => topPeakIds.has(p.peak_id));
      topMajor.forEach((p) => {
        const isAnom = anomalyMap.has(p.peak_id);
        annotations.push({
          x: p.retention_time,
          y: p.intensity,
          text: `<b>${p.compound_name || p.peak_id}</b><br>${Number(p.retention_time).toFixed(2)} min`,
          showarrow: true,
          arrowhead: 2,
          arrowsize: 1,
          arrowwidth: 1.2,
          arrowcolor: isAnom ? '#ef4444' : '#d4af37',
          ax: 0,
          ay: -32,
          font: {
            family: 'Inter, sans-serif',
            size: 10,
            color: isAnom ? '#fca5a5' : '#f3ebdc',
          },
          bgcolor: isAnom ? 'rgba(127, 29, 29, 0.85)' : 'rgba(28, 24, 17, 0.85)',
          bordercolor: isAnom ? '#ef4444' : '#d4af37',
          borderwidth: 1,
          borderpad: 4,
          opacity: 0.95,
        });
      });
    }

    // 4. Subtle baseline stem lines (rendered selectively if < 250 peaks, or only for top/anomalies for high density)
    const shapes = [];
    const stemTargetPeaks =
      displayedPeaks.length <= 200
        ? displayedPeaks
        : displayedPeaks.filter((p) => anomalyMap.has(p.peak_id) || topPeakIds.has(p.peak_id));

    stemTargetPeaks.forEach((p) => {
      const isAnom = anomalyMap.has(p.peak_id);
      shapes.push({
        type: 'line',
        x0: p.retention_time,
        y0: 0,
        x1: p.retention_time,
        y1: p.intensity,
        line: {
          color: isAnom ? 'rgba(239, 68, 68, 0.45)' : 'rgba(238, 219, 187, 0.2)',
          width: isAnom ? 1.5 : 1,
          dash: 'dot',
        },
      });
    });

    const layout = {
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'rgba(15, 12, 8, 0.65)',
      margin: { t: 30, r: 25, b: 50, l: 60 },
      showlegend: false,
      annotations,
      shapes,
      autosize: true,
      xaxis: {
        title: {
          text: 'Retention Time (min)',
          font: { family: 'Inter, sans-serif', size: 11, color: '#c9bda8' },
        },
        gridcolor: 'rgba(238, 219, 187, 0.07)',
        zerolinecolor: 'rgba(238, 219, 187, 0.18)',
        tickfont: { family: 'JetBrains Mono, monospace', size: 10, color: '#c9bda8' },
      },
      yaxis: {
        title: {
          text: 'Intensity (mAU)',
          font: { family: 'Inter, sans-serif', size: 11, color: '#c9bda8' },
        },
        gridcolor: 'rgba(238, 219, 187, 0.07)',
        zerolinecolor: 'rgba(238, 219, 187, 0.18)',
        tickfont: { family: 'JetBrains Mono, monospace', size: 10, color: '#c9bda8' },
      },
      hoverlabel: {
        bgcolor: 'rgba(18, 14, 10, 0.95)',
        bordercolor: '#d4af37',
        font: { family: 'Inter, sans-serif', size: 11, color: '#fcfaf1' },
        align: 'left',
      },
    };

    const config = {
      responsive: true,
      displayModeBar: true,
      displaylogo: false,
      modeBarButtonsToRemove: ['lasso2d', 'select2d'],
    };

    Plotly.newPlot(plotRef.current, traces, layout, config);

    const handleResize = () => {
      if (plotRef.current) {
        Plotly.Plots.resize(plotRef.current);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (plotRef.current) {
        Plotly.purge(plotRef.current);
      }
    };
  }, [displayedPeaks, anomalyMap, topPeakIds, showTopLabels]);

  const anomalyCount = useMemo(
    () => peaks.filter((p) => anomalyMap.has(p.peak_id)).length,
    [peaks, anomalyMap]
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <div className={styles.iconCircle}>
            <Activity size={18} className={styles.goldIcon} />
          </div>
          <div>
            <div className={styles.title}>Interactive Chromatogram</div>
            <div className={styles.subtitle}>
              High-Precision Signal Map &bull; {displayedPeaks.length.toLocaleString()} Peak Vectors
            </div>
          </div>
        </div>

        {/* View & Filter Controls */}
        <div className={styles.controls}>
          <div className={styles.filterPills}>
            <button
              className={`${styles.filterBtn} ${filterMode === 'all' ? styles.activeFilter : ''}`}
              onClick={() => setFilterMode('all')}
            >
              All Peaks ({peaks.length})
            </button>
            <button
              className={`${styles.filterBtn} ${filterMode === 'anomalies' ? styles.activeFilter : ''}`}
              onClick={() => setFilterMode('anomalies')}
            >
              <span className={styles.redDot} />
              Anomalies Only ({anomalyCount})
            </button>
            <button
              className={`${styles.filterBtn} ${filterMode === 'major' ? styles.activeFilter : ''}`}
              onClick={() => setFilterMode('major')}
            >
              Top Signals
            </button>
          </div>

          <button
            className={`${styles.toggleBtn} ${showTopLabels ? styles.activeToggle : ''}`}
            onClick={() => setShowTopLabels(!showTopLabels)}
            title="Toggle prominent callouts for top chromatographic signals"
          >
            <Sparkles size={13} />
            {showTopLabels ? 'Key Labels' : 'Clean View'}
          </button>
        </div>
      </div>

      <div className={styles.plotWrapper}>
        <div ref={plotRef} className={styles.plotCanvas} />
      </div>

      <div className={styles.footerNote}>
        <div className={styles.legend}>
          <div className={styles.legendItem}>
            <span className={styles.dotNormal} />
            <span>Standard Chromatographic Peak</span>
          </div>
          <div className={styles.legendItem}>
            <span className={styles.dotAnomaly} />
            <span>ML Anomaly Flagged Peak ({anomalyCount})</span>
          </div>
        </div>
        <div className={styles.hintText}>
          <Info size={12} />
          <span>Hover over any diamond peak vector for integrated area, confidence score & retention metrics.</span>
        </div>
      </div>
    </div>
  );
}
