import React from 'react';
import { Network, Database } from 'lucide-react';
import styles from './GraphVisualization.module.css';

export default function GraphVisualization({ graphData = {} }) {
  const nodes = graphData?.visualization?.nodes || [];
  const context = graphData?.context || {};

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.title}>
          <Network size={18} color="#06b6d4" />
          <span>Knowledge Graph Entity Network</span>
        </div>
      </div>

      <div className={styles.graphArea}>
        {context.sample && (
          <div className={styles.entityCard}>
            <span className={styles.entityType}>Sample Node</span>
            <span className={styles.entityLabel}>{context.sample}</span>
            <span className={styles.entityMeta}>Analysis: {context.analysis_type || 'HPLC'}</span>
          </div>
        )}

        {context.instrument && (
          <div className={styles.entityCard}>
            <span className={styles.entityType}>Instrument Node</span>
            <span className={styles.entityLabel}>{context.instrument.name}</span>
            <span className={styles.entityMeta}>Type: {context.instrument.type}</span>
          </div>
        )}

        {context.compounds?.map((comp, idx) => (
          <div key={idx} className={styles.entityCard}>
            <span className={styles.entityType}>Compound Entity</span>
            <span className={styles.entityLabel}>{comp}</span>
            <span className={styles.entityMeta}>Relationship: PRODUCED_BY</span>
          </div>
        ))}
      </div>
    </div>
  );
}
