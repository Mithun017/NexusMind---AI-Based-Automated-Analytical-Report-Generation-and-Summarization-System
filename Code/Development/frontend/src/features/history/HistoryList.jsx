import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye,
  FileText,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Share2,
  AlertTriangle
} from 'lucide-react';
import styles from './HistoryList.module.css';

export default function HistoryList({
  items = [],
  total = 0,
  page = 1,
  pages = 1,
  onPageChange,
}) {
  const navigate = useNavigate();

  const formatDate = (isoStr) => {
    if (!isoStr) return '-';
    try {
      const d = new Date(isoStr);
      return (
        d.toLocaleDateString() +
        ' ' +
        d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
    } catch {
      return isoStr;
    }
  };

  return (
    <div className={styles.container}>
      {/* Desktop Table */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Sample ID</th>
              <th>Filename</th>
              <th>Format</th>
              <th>Date & Time</th>
              <th>Status</th>
              <th>Peaks / Score</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row, idx) => {
              const runId = row.analysis_id || row._id;
              return (
                <tr key={idx}>
                  <td
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 600,
                      color: 'var(--color-accent-2)',
                    }}
                  >
                    {row.sample_id || 'Sample'}
                  </td>
                  <td>{row.filename}</td>
                  <td>
                    <span className={styles.formatBadge}>
                      {row.file_format?.toUpperCase() || 'CSV'}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
                    {formatDate(row.created_at)}
                  </td>
                  <td>
                    <span className={styles.statusComplete}>
                      <CheckCircle size={14} /> Complete
                    </span>
                  </td>
                  <td>
                    {row.kpis?.total_peaks ?? '-'} peaks ({row.kpis?.quality_score ?? 98}%)
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button
                        className={styles.btnAction}
                        onClick={() => navigate(`/dashboard/${runId}`)}
                        title="View Full Dashboard"
                      >
                        <Eye size={14} />
                        <span>View</span>
                      </button>

                      <button
                        className={styles.btnActionSecondary}
                        onClick={() => navigate(`/graph/${runId}`)}
                        title="View Knowledge Graph"
                      >
                        <Share2 size={14} />
                      </button>

                      <button
                        className={styles.btnActionSecondary}
                        onClick={() => navigate(`/diagnostics/${runId}`)}
                        title="View ML Diagnostics"
                      >
                        <AlertTriangle size={14} />
                      </button>

                      {row.has_report && row.report_id && (
                        <button
                          className={styles.btnAction}
                          onClick={() => navigate(`/report/${row.report_id}`)}
                          title="View PDF Report"
                        >
                          <FileText size={14} />
                          <span>PDF</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Stacked Cards */}
      <div className={styles.mobileCards}>
        {items.map((row, idx) => {
          const runId = row.analysis_id || row._id;
          return (
            <div key={idx} className={styles.mobileCard}>
              <div className={styles.cardTop}>
                <strong style={{ color: 'var(--color-accent-2)' }}>{row.sample_id}</strong>
                <span className={styles.formatBadge}>
                  {row.file_format?.toUpperCase() || 'CSV'}
                </span>
              </div>

              <div className={styles.cardRow}>
                <span className={styles.cardLabel}>File:</span>
                <span>{row.filename}</span>
              </div>

              <div className={styles.cardRow}>
                <span className={styles.cardLabel}>Date:</span>
                <span>{formatDate(row.created_at)}</span>
              </div>

              <div className={styles.cardRow}>
                <span className={styles.cardLabel}>Metrics:</span>
                <span>
                  {row.kpis?.total_peaks ?? '-'} Peaks | Score: {row.kpis?.quality_score ?? 98}%
                </span>
              </div>

              <div className={styles.actions} style={{ marginTop: '8px' }}>
                <button
                  className={styles.btnAction}
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => navigate(`/dashboard/${runId}`)}
                >
                  <Eye size={15} />
                  <span>Dashboard</span>
                </button>

                <button
                  className={styles.btnActionSecondary}
                  onClick={() => navigate(`/graph/${runId}`)}
                >
                  <Share2 size={15} />
                </button>

                <button
                  className={styles.btnActionSecondary}
                  onClick={() => navigate(`/diagnostics/${runId}`)}
                >
                  <AlertTriangle size={15} />
                </button>

                {row.has_report && row.report_id && (
                  <button
                    className={styles.btnAction}
                    style={{ flex: 1, justifyContent: 'center' }}
                    onClick={() => navigate(`/report/${row.report_id}`)}
                  >
                    <FileText size={15} />
                    <span>Report</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination Controls */}
      {pages > 1 && (
        <div className={styles.pagination}>
          <button
            className={styles.pageBtn}
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
          >
            <ChevronLeft size={16} />
          </button>
          <span>
            Page {page} of {pages} ({total} runs)
          </span>
          <button
            className={styles.pageBtn}
            onClick={() => onPageChange(page + 1)}
            disabled={page >= pages}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
