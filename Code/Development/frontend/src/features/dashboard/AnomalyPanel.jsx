import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import styles from './AnomalyPanel.module.css';

export default function AnomalyPanel({ anomalies = [] }) {
  const flagged = anomalies.filter((a) => a.is_anomaly || a.anomaly_score > 0.5);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.title}>
          <AlertTriangle size={18} color="#ef4444" />
          <span>ML Isolation Forest Anomaly Analysis</span>
        </div>
        <span
          className={`${styles.badge} ${
            flagged.length > 0 ? styles.badgeConfirmed : styles.badgeNormal
          }`}
        >
          {flagged.length} Flagged
        </span>
      </div>

      {flagged.length === 0 ? (
        <div className={styles.emptyState}>
          <CheckCircle2 size={24} color="#10b981" style={{ marginBottom: 6 }} />
          <div>All chromatographic peaks are within normal statistical distribution parameters.</div>
        </div>
      ) : (
        <div className={styles.cardsGrid}>
          {flagged.map((anom, idx) => (
            <div key={idx} className={styles.anomalyCard}>
              <div className={styles.cardHeader}>
                <span className={styles.peakId}>{anom.peak_id}</span>
                <span
                  className={`${styles.badge} ${
                    anom.classification === 'Confirmed Anomaly'
                      ? styles.badgeConfirmed
                      : styles.badgeNormal
                  }`}
                >
                  {anom.classification}
                </span>
              </div>

              <div className={styles.score}>
                Retention Time: <strong>{anom.retention_time} min</strong>
              </div>

              <div className={styles.score}>
                Anomaly Score:{' '}
                <span className={styles.scoreValue}>
                  {anom.anomaly_score} ({anom.confidence}%)
                </span>
              </div>

              {anom.contributing_features && (
                <div className={styles.featureList}>
                  {Object.entries(anom.contributing_features).map(([key, val]) => (
                    <div key={key}>
                      {key}: <span className={styles.featureVal}>{val}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
