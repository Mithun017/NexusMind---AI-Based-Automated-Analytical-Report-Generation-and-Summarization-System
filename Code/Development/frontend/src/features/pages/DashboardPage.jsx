import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, Calendar, FileText, Activity } from 'lucide-react';
import { getAnalysis } from '../../api/analysis';
import { getGraphData } from '../../api/graph';
import KPICards from '../dashboard/KPICards';
import Chromatogram from '../dashboard/Chromatogram';
import PeakTable from '../dashboard/PeakTable';
import AnomalyPanel from '../dashboard/AnomalyPanel';
import GraphVisualization from '../graph/GraphVisualization';
import AISummaryPanel from '../ai/AISummaryPanel';
import ReportActions from '../report/ReportActions';
import styles from './DashboardPage.module.css';

export default function DashboardPage() {
  const { analysisId } = useParams();
  const [analysis, setAnalysis] = useState(null);
  const [graphData, setGraphData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchFullAnalysis = async () => {
    try {
      setLoading(true);
      const data = await getAnalysis(analysisId);
      setAnalysis(data);

      try {
        const gData = await getGraphData(analysisId);
        setGraphData(gData);
      } catch (gErr) {
        console.warn('Graph data fetch skipped or unavailable:', gErr);
      }
    } catch (err) {
      setError(err.message || 'Failed to load analysis details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (analysisId) {
      fetchFullAnalysis();
    }
  }, [analysisId]);

  const handleSummaryGenerated = (summaryRes) => {
    setAnalysis((prev) => ({
      ...prev,
      ai_interpretation: summaryRes.interpretation,
      ai_summary: summaryRes.summary,
    }));
  };

  if (loading) {
    return (
      <div className={styles.loadingWrapper}>
        <Loader2 size={36} className={styles.spinner} />
        <div>Retrieving deterministic analytical run results...</div>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className={styles.loadingWrapper}>
        <div style={{ color: '#ef4444' }}>{error || 'Analysis record not found.'}</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* 1. Header Metadata */}
      <div className={styles.metaHeader}>
        <div className={styles.metaLeft}>
          <div className={styles.sampleTitle}>{analysis.sample_id || 'Sample'}</div>
          <div className={styles.metaTags}>
            <span className={styles.tag}>
              Type: {analysis.kpis?.analysis_type || 'HPLC-UV/Vis'}
            </span>
            <span className={styles.tag}>Status: {analysis.status}</span>
          </div>
        </div>
        <div className={styles.metaTags}>
          <Calendar size={14} />
          <span>
            {new Date(analysis.created_at).toLocaleString()}
          </span>
        </div>
      </div>

      {/* 2. Deterministic KPI Cards */}
      <KPICards kpis={analysis.kpis} />

      {/* 3. Interactive Chromatogram */}
      <Chromatogram
        peaks={analysis.peak_details}
        anomalies={analysis.anomaly_results}
      />

      {/* 4. Peak Table */}
      <PeakTable
        peaks={analysis.peak_details}
        anomalies={analysis.anomaly_results}
      />

      {/* 5. ML Anomaly Panel */}
      <AnomalyPanel anomalies={analysis.anomaly_results} />

      {/* 6. Knowledge Graph Entity Network */}
      {graphData && <GraphVisualization graphData={graphData} />}

      {/* 7. AI Analytical Reasoning & Summary Panel */}
      <AISummaryPanel
        analysisId={analysisId}
        aiSummary={analysis.ai_summary}
        aiInterpretation={analysis.ai_interpretation}
        onSummaryGenerated={handleSummaryGenerated}
      />

      {/* 8. Report Generation & Export Actions */}
      <ReportActions analysisId={analysisId} />
    </div>
  );
}
