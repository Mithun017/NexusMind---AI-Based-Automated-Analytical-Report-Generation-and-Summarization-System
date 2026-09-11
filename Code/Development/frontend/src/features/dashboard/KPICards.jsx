import React from 'react';
import { Layers, Star, AlertTriangle, ShieldCheck, Maximize2, Activity } from 'lucide-react';
import styles from './KPICards.module.css';

export default function KPICards({ kpis = {}, anomalyCount = 0 }) {
  const totalPeaks = kpis.total_peaks ?? 0;
  const majorPeaks = kpis.major_peaks ?? 0;
  const qualityScore = kpis.quality_score ?? 0;
  const maxArea = kpis.max_area ?? 0;
  const avgIntensity = kpis.avg_intensity ?? 0;
  const anomalies = kpis.anomalies_count ?? anomalyCount;

  return (
    <div className={styles.grid}>
      <div className={styles.card}>
        <div className={styles.cardTop}>
          <span className={styles.label}>Total Peaks</span>
          <div className={styles.iconWrapper}>
            <Layers size={16} />
          </div>
        </div>
        <div className={styles.value}>{totalPeaks}</div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardTop}>
          <span className={styles.label}>Major Peaks</span>
          <div className={styles.iconWrapper}>
            <Star size={16} />
          </div>
        </div>
        <div className={styles.value}>{majorPeaks}</div>
      </div>

      <div className={`${styles.card} ${styles.qualityCard}`}>
        <div className={styles.cardTop}>
          <span className={styles.label}>Quality Score</span>
          <div className={styles.iconWrapper}>
            <ShieldCheck size={16} />
          </div>
        </div>
        <div className={styles.value}>
          {qualityScore}
          <span className={styles.unit}>%</span>
        </div>
      </div>

      <div className={`${styles.card} ${anomalies > 0 ? styles.anomalyCard : ''}`}>
        <div className={styles.cardTop}>
          <span className={styles.label}>Anomalies</span>
          <div className={styles.iconWrapper}>
            <AlertTriangle size={16} />
          </div>
        </div>
        <div className={styles.value}>{anomalies}</div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardTop}>
          <span className={styles.label}>Max Peak Area</span>
          <div className={styles.iconWrapper}>
            <Maximize2 size={16} />
          </div>
        </div>
        <div className={styles.value}>{maxArea.toLocaleString()}</div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardTop}>
          <span className={styles.label}>Avg Intensity</span>
          <div className={styles.iconWrapper}>
            <Activity size={16} />
          </div>
        </div>
        <div className={styles.value}>{avgIntensity.toLocaleString()}</div>
      </div>
    </div>
  );
}
