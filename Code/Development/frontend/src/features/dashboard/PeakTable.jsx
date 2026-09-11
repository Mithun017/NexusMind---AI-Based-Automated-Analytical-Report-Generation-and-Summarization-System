import React, { useState } from 'react';
import { Table as TableIcon, ArrowUpDown } from 'lucide-react';
import styles from './PeakTable.module.css';

export default function PeakTable({ peaks = [], anomalies = [] }) {
  const [sortField, setSortField] = useState('retention_time');
  const [sortAsc, setSortAsc] = useState(true);

  const anomalySet = new Set(
    anomalies.filter((a) => a.is_anomaly).map((a) => a.peak_id)
  );

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const sortedPeaks = [...peaks].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];
    if (typeof valA === 'string') {
      return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    return sortAsc ? (valA ?? 0) - (valB ?? 0) : (valB ?? 0) - (valA ?? 0);
  });

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.title}>
          <TableIcon size={18} color="#6366f1" />
          <span>Analytical Peak Results Table</span>
        </div>
      </div>

      {/* Desktop Table */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th onClick={() => handleSort('peak_id')}>Peak ID <ArrowUpDown size={12} /></th>
              <th onClick={() => handleSort('compound_name')}>Compound <ArrowUpDown size={12} /></th>
              <th onClick={() => handleSort('retention_time')}>RT (min) <ArrowUpDown size={12} /></th>
              <th onClick={() => handleSort('peak_area')}>Peak Area <ArrowUpDown size={12} /></th>
              <th onClick={() => handleSort('peak_height')}>Height <ArrowUpDown size={12} /></th>
              <th onClick={() => handleSort('concentration')}>Conc (mg/L) <ArrowUpDown size={12} /></th>
              <th onClick={() => handleSort('relative_abundance')}>Abundance (%) <ArrowUpDown size={12} /></th>
              <th onClick={() => handleSort('snr')}>S/N <ArrowUpDown size={12} /></th>
            </tr>
          </thead>
          <tbody>
            {sortedPeaks.map((p, idx) => {
              const isAnom = anomalySet.has(p.peak_id);
              return (
                <tr key={idx} className={isAnom ? styles.anomalyRow : ''}>
                  <td className={styles.peakIdBadge}>
                    {p.peak_id} {isAnom && '⚠️'}
                  </td>
                  <td>{p.compound_name}</td>
                  <td className={styles.monoVal}>{p.retention_time}</td>
                  <td className={styles.monoVal}>{p.peak_area?.toLocaleString()}</td>
                  <td className={styles.monoVal}>{p.peak_height?.toLocaleString()}</td>
                  <td className={styles.monoVal}>{p.concentration}</td>
                  <td className={styles.monoVal}>{p.relative_abundance}%</td>
                  <td className={styles.monoVal}>{p.snr}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Stacked Cards */}
      <div className={styles.mobileCards}>
        {sortedPeaks.map((p, idx) => {
          const isAnom = anomalySet.has(p.peak_id);
          return (
            <div key={idx} className={styles.mobileCard}>
              <div className={styles.cardRow}>
                <span className={styles.peakIdBadge}>
                  {p.peak_id} {isAnom && '(Anomaly ⚠️)'}
                </span>
                <strong>{p.compound_name}</strong>
              </div>
              <div className={styles.cardRow}>
                <span className={styles.cardLabel}>Retention Time:</span>
                <span className={styles.monoVal}>{p.retention_time} min</span>
              </div>
              <div className={styles.cardRow}>
                <span className={styles.cardLabel}>Peak Area:</span>
                <span className={styles.monoVal}>{p.peak_area?.toLocaleString()}</span>
              </div>
              <div className={styles.cardRow}>
                <span className={styles.cardLabel}>Concentration:</span>
                <span className={styles.monoVal}>{p.concentration} mg/L</span>
              </div>
              <div className={styles.cardRow}>
                <span className={styles.cardLabel}>Relative Abundance:</span>
                <span className={styles.monoVal}>{p.relative_abundance}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
