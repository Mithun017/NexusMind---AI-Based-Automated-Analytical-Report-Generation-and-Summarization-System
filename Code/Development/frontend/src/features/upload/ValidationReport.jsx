import React from 'react';
import { AlertCircle, AlertTriangle } from 'lucide-react';
import styles from './ValidationReport.module.css';

export default function ValidationReport({ errors = [], warnings = [] }) {
  if ((!errors || errors.length === 0) && (!warnings || warnings.length === 0)) {
    return null;
  }

  return (
    <div className={styles.container}>
      {warnings.length > 0 && (
        <div className={styles.warningBox}>
          <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong>Warnings (Non-blocking):</strong>
            {warnings.map((w, idx) => (
              <div key={idx} style={{ marginTop: 2 }}>{w}</div>
            ))}
          </div>
        </div>
      )}

      {errors.length > 0 && (
        <div className={styles.errorBox}>
          <div className={styles.errorHeader}>
            <AlertCircle size={18} />
            <span>Validation Errors ({errors.length})</span>
          </div>
          <ul className={styles.errorList}>
            {errors.map((err, idx) => (
              <li key={idx} className={styles.errorItem}>
                <span>•</span>
                <div>
                  {err.column && <span className={styles.colBadge}>[{err.column}]</span>}{' '}
                  {err.message}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
