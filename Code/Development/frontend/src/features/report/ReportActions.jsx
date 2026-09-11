import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Download, Loader2, Eye, CheckCircle2 } from 'lucide-react';
import { generateReport, getReportStatus, getReportDownloadUrl } from '../../api/report';
import styles from './ReportActions.module.css';

export default function ReportActions({ analysisId }) {
  const navigate = useNavigate();
  const [generating, setGenerating] = useState(false);
  const [reportInfo, setReportInfo] = useState(null);

  useEffect(() => {
    if (!analysisId) return;
    getReportStatus(analysisId)
      .then((res) => {
        if (res.has_report) {
          setReportInfo(res.report);
        }
      })
      .catch(() => {});
  }, [analysisId]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await generateReport(analysisId);
      setReportInfo(res);
    } catch (err) {
      alert(err.message || 'Failed to generate PDF report.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.leftSection}>
        <div className={styles.title}>
          <FileText size={20} color="#6366f1" />
          <span>Automated 10-Section PDF Analytical Report</span>
        </div>
        <div className={styles.subtitle}>
          Includes sample metadata, chromatograms, KPI tables, ML anomalies, KG findings, and AI interpretation.
        </div>
      </div>

      <div className={styles.actionsGroup}>
        {!reportInfo ? (
          <button
            className={styles.btnGenerate}
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? (
              <>
                <Loader2 className={styles.spinner} size={18} />
                <span>Compiling 10-Section PDF...</span>
              </>
            ) : (
              <>
                <FileText size={18} />
                <span>Generate PDF Report</span>
              </>
            )}
          </button>
        ) : (
          <>
            <button
              className={styles.btnDownload}
              onClick={() => navigate(`/report/${reportInfo.report_id}`)}
            >
              <Eye size={18} />
              <span>Preview Report</span>
            </button>

            <a
              href={getReportDownloadUrl(reportInfo.report_id)}
              download
              className={styles.btnGenerate}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Download size={18} />
              <span>Download PDF</span>
            </a>
          </>
        )}
      </div>
    </div>
  );
}
