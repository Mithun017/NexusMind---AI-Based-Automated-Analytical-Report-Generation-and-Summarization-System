import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, CheckCircle2, Cpu, FileCheck2, LineChart, Network, FileText } from 'lucide-react';
import FileUploader from '../upload/FileUploader';
import ValidationReport from '../upload/ValidationReport';
import { runAnalysis } from '../../api/analysis';
import styles from './HomePage.module.css';

export default function HomePage() {
  const navigate = useNavigate();
  const [validationReport, setValidationReport] = useState(null);
  const [processing, setProcessing] = useState(false);

  const handleUploadSuccess = async (uploadRes) => {
    setValidationReport(uploadRes.validation_report);
    setProcessing(true);

    try {
      const analysisRes = await runAnalysis(uploadRes.upload_id);
      navigate(`/dashboard/${analysisRes.analysis_id}`);
    } catch (err) {
      alert(err.message || 'Error processing analysis pipeline.');
      setProcessing(false);
    }
  };

  const handleUploadError = (err) => {
    setValidationReport({
      errors: err.details || [{ message: err.message || 'Validation error' }],
      warnings: [],
    });
  };

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.heroTag}>
          <Sparkles size={14} />
          <span>Next-Generation Analytical Intelligence</span>
        </div>
        <h1 className={styles.heroTitle}>
          Chromatography Analytics & Automated PDF Reporting
        </h1>
        <p className={styles.heroSubtitle}>
          Ingest raw chromatography and mass spectrometry runs. Extract deterministic peak KPIs,
          uncover outliers with ML Isolation Forest, link entities to Knowledge Graph, and generate
          AI-synthesized reports.
        </p>
      </div>

      <div className={styles.pipelineCard}>
        <FileUploader
          onUploadSuccess={handleUploadSuccess}
          onError={handleUploadError}
        />

        <ValidationReport
          errors={validationReport?.errors}
          warnings={validationReport?.warnings}
        />

        <div className={styles.stepsRow}>
          <div className={styles.stepItem}>
            <div className={styles.stepIcon}><FileCheck2 size={14} /></div>
            <span>1. Validate</span>
          </div>
          <div className={styles.stepItem}>
            <div className={styles.stepIcon}><Cpu size={14} /></div>
            <span>2. Preprocess</span>
          </div>
          <div className={styles.stepItem}>
            <div className={styles.stepIcon}><LineChart size={14} /></div>
            <span>3. Analytics</span>
          </div>
          <div className={styles.stepItem}>
            <div className={styles.stepIcon}><Sparkles size={14} /></div>
            <span>4. ML Anomaly</span>
          </div>
          <div className={styles.stepItem}>
            <div className={styles.stepIcon}><Network size={14} /></div>
            <span>5. Knowledge Graph</span>
          </div>
          <div className={styles.stepItem}>
            <div className={styles.stepIcon}><FileText size={14} /></div>
            <span>6. PDF Report</span>
          </div>
        </div>
      </div>
    </div>
  );
}
