import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, FileText } from 'lucide-react';
import { getReportDownloadUrl } from '../../api/report';
import styles from './ReportPage.module.css';

export default function ReportPage() {
  const { reportId } = useParams();
  const navigate = useNavigate();

  const downloadUrl = getReportDownloadUrl(reportId);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.leftSection}>
          <button className={styles.btnBack} onClick={() => navigate('/history')}>
            <ArrowLeft size={16} />
            <span>Back to History</span>
          </button>
          <div className={styles.title}>
            <span>Analytical Report Preview</span>
          </div>
        </div>

        <a
          href={downloadUrl}
          download
          className={styles.btnDownload}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Download size={18} />
          <span>Download PDF</span>
        </a>
      </div>

      <div className={styles.iframeWrapper}>
        <iframe
          src={downloadUrl}
          title="PDF Report Preview"
          className={styles.pdfFrame}
        />
      </div>
    </div>
  );
}
