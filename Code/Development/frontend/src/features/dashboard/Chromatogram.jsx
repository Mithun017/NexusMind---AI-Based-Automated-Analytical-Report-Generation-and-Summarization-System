import React, { useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist-min';
import { Activity } from 'lucide-react';
import styles from './Chromatogram.module.css';

export default function Chromatogram({ peaks = [], anomalies = [] }) {
  const plotRef = useRef(null);

  useEffect(() => {
    if (!plotRef.current || !peaks || peaks.length === 0) return;

    const anomalyMap = new Map();
    anomalies.forEach((a) => {
      if (a.is_anomaly) {
        anomalyMap.set(a.peak_id, a);
      }
    });

    const normalPeaks = peaks.filter((p) => !anomalyMap.has(p.peak_id));
    const anomalyPeaks = peaks.filter((p) => anomalyMap.has(p.peak_id));

    const traces = [];

    // Normal Peaks trace (Champagne / Gold)
    if (normalPeaks.length > 0) {
      traces.push({
        x: normalPeaks.map((p) => p.retention_time),
        y: normalPeaks.map((p) => p.intensity),
        text: normalPeaks.map(
          (p) =>
            `<b>${p.peak_id}</b>: ${p.compound_name}<br>RT: ${p.retention_time} min<br>Intensity: ${p.intensity}<br>Area: ${p.peak_area}`
        ),
        hoverinfo: 'text',
        mode: 'markers+text',
        type: 'scatter',
        name: 'Standard Peak',
        textposition: 'top center',
        textfont: {
          family: 'Inter, sans-serif',
          size: 10,
          color: '#f3ebdc',
        },
        marker: {
          color: '#eedbbb',
          size: 10,
          line: { color: '#c5a059', width: 1.5 },
        },
      });
    }

    // Anomaly Peaks trace (Ruby with Gold Rim)
    if (anomalyPeaks.length > 0) {
      traces.push({
        x: anomalyPeaks.map((p) => p.retention_time),
        y: anomalyPeaks.map((p) => p.intensity),
        text: anomalyPeaks.map((p) => {
          const anom = anomalyMap.get(p.peak_id);
          return `<b>[ANOMALY] ${p.peak_id}</b>: ${p.compound_name}<br>Score: ${anom?.anomaly_score}<br>Confidence: ${anom?.confidence}%<br>RT: ${p.retention_time} min`;
        }),
        hoverinfo: 'text',
        mode: 'markers+text',
        type: 'scatter',
        name: 'Anomaly Flagged',
        textposition: 'top center',
        textfont: {
          family: 'Inter, sans-serif',
          size: 11,
          color: '#f87171',
        },
        marker: {
          color: '#ef4444',
          size: 13,
          symbol: 'diamond',
          line: { color: '#eedbbb', width: 2 },
        },
      });
    }

    // Baseline connectors (stem lines)
    const shapes = peaks.map((p) => {
      const isAnom = anomalyMap.has(p.peak_id);
      return {
        type: 'line',
        x0: p.retention_time,
        y0: 0,
        x1: p.retention_time,
        y1: p.intensity,
        line: {
          color: isAnom ? 'rgba(239, 68, 68, 0.7)' : 'rgba(238, 219, 187, 0.45)',
          width: isAnom ? 2 : 1.5,
          dash: 'dot',
        },
      };
    });

    const layout = {
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'rgba(20, 17, 12, 0.45)',
      margin: { t: 25, r: 25, b: 45, l: 55 },
      showlegend: false,
      xaxis: {
        title: {
          text: 'Retention Time (min)',
          font: { family: 'Inter, sans-serif', size: 11, color: '#c9bda8' },
        },
        gridcolor: 'rgba(238, 219, 187, 0.08)',
        zerolinecolor: 'rgba(238, 219, 187, 0.15)',
        tickfont: { family: 'JetBrains Mono, monospace', size: 10, color: '#c9bda8' },
      },
      yaxis: {
        title: {
          text: 'Intensity (mAU)',
          font: { family: 'Inter, sans-serif', size: 11, color: '#c9bda8' },
        },
        gridcolor: 'rgba(238, 219, 187, 0.08)',
        zerolinecolor: 'rgba(238, 219, 187, 0.15)',
        tickfont: { family: 'JetBrains Mono, monospace', size: 10, color: '#c9bda8' },
      },
      shapes,
      autosize: true,
      hoverlabel: {
        bgcolor: '#1c1811',
        bordercolor: '#eedbbb',
        font: { family: 'Inter, sans-serif', size: 11, color: '#fcfaf1' },
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
  }, [peaks, anomalies]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.title}>
          <Activity size={18} color="#eedbbb" />
          <span>Interactive Chromatogram</span>
        </div>
        <div className={styles.legend}>
          <div className={styles.legendItem}>
            <div className={styles.dotNormal} />
            <span>Standard Peaks</span>
          </div>
          <div className={styles.legendItem}>
            <div className={styles.dotAnomaly} />
            <span>Anomalous Outliers</span>
          </div>
        </div>
      </div>
      <div ref={plotRef} className={styles.plotWrapper} />
    </div>
  );
}
