import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Loader2,
  Calendar,
  FileText,
  Activity,
  Share2,
  AlertTriangle,
  UploadCloud,
  ChevronDown
} from 'lucide-react';
import { getAnalysis } from '../../api/analysis';
import { getGraphData } from '../../api/graph';
import { getHistory } from '../../api/history';
import KPICards from '../dashboard/KPICards';
import Chromatogram from '../dashboard/Chromatogram';
import PeakTable from '../dashboard/PeakTable';
import AnomalyPanel from '../dashboard/AnomalyPanel';
import GraphVisualization from '../graph/GraphVisualization';
import AISummaryPanel from '../ai/AISummaryPanel';
import ReportActions from '../report/ReportActions';
import styles from './DashboardPage.module.css';

export default function DashboardPage() {
  const { analysisId: paramAnalysisId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const initialAnalysis = location.state?.initialAnalysis;
  const initialGraph = location.state?.initialGraph;

  const [activeAnalysisId, setActiveAnalysisId] = useState(paramAnalysisId || initialAnalysis?.id || initialAnalysis?.analysis_id || null);
  const [historyList, setHistoryList] = useState([]);
  const [analysis, setAnalysis] = useState(initialAnalysis || null);
  const [graphData, setGraphData] = useState(initialGraph || null);
  const [loading, setLoading] = useState(!initialAnalysis);
  const [error, setError] = useState(null);

  // Load available history runs for quick switcher
  useEffect(() => {
    const fetchRuns = async () => {
      try {
        const res = await getHistory(1, 20);
        if (res.items && res.items.length > 0) {
          setHistoryList(res.items);
          if (!paramAnalysisId && !activeAnalysisId) {
            const firstId = res.items[0].analysis_id || res.items[0].id || res.items[0]._id;
            setActiveAnalysisId(firstId);
            navigate(`/dashboard/${firstId}`, { replace: true });
          }
        } else if (!paramAnalysisId && !initialAnalysis) {
          setLoading(false);
        }
      } catch (err) {
        console.warn('Could not fetch history runs for dashboard selector:', err);
      }
    };
    fetchRuns();
  }, [paramAnalysisId, activeAnalysisId, initialAnalysis, navigate]);

  // When active ID changes, fetch details if not already populated from state
  useEffect(() => {
    if (!paramAnalysisId && !activeAnalysisId) return;
    const targetId = paramAnalysisId || activeAnalysisId;

    // If preloaded analysis matches target ID, use it immediately with zero delay
    if (analysis && (analysis.id === targetId || analysis.analysis_id === targetId)) {
      setLoading(false);
      return;
    }

    const fetchFullAnalysis = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getAnalysis(targetId);
        setAnalysis(data);

        try {
          const gData = await getGraphData(targetId);
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

    fetchFullAnalysis();
  }, [paramAnalysisId, activeAnalysisId]);

  const handleSummaryGenerated = (summaryRes) => {
    setAnalysis((prev) => ({
      ...prev,
      ai_interpretation: summaryRes.interpretation,
      ai_summary: summaryRes.summary,
    }));
  };

  const handleSwitchAnalysis = (id) => {
    setActiveAnalysisId(id);
    navigate(`/dashboard/${id}`);
  };

  if (loading) {
    return (
      <div className={styles.loadingWrapper}>
        <Loader2 size={36} className={styles.spinner} />
        <div>Retrieving deterministic analytical run results...</div>
      </div>
    );
  }

  if (!paramAnalysisId && (!historyList || historyList.length === 0)) {
    return (
      <div className={styles.emptyStateContainer}>
        <div className={styles.emptyCard}>
          <UploadCloud size={48} className={styles.emptyIcon} />
          <h2>No Analytical Runs Yet</h2>
          <p>
            Upload your chromatographic raw dataset (CSV, XLSX, JSON) in the Studio to execute the 7-step deterministic and ML pipeline.
          </p>
          <Link to="/" className={styles.ctaBtn}>
            Launch New Analysis Studio
          </Link>
        </div>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className={styles.loadingWrapper}>
        <div style={{ color: '#ef4444' }}>{error || 'Analysis record not found.'}</div>
        <Link to="/" style={{ color: '#38bdf8', marginTop: '12px' }}>
          Back to New Analysis Studio
        </Link>
      </div>
    );
  }

  const currentId = paramAnalysisId || activeAnalysisId;

  return (
    <div className={styles.page}>
      {/* 1. Header Metadata & Quick Navigation Bar */}
      <div className={styles.metaHeader}>
        <div className={styles.metaLeft}>
          <div className={styles.titleSelectRow}>
            <div className={styles.sampleTitle}>{analysis.sample_id || 'Sample Analysis'}</div>
            {historyList.length > 1 && (
              <select
                value={currentId}
                onChange={(e) => handleSwitchAnalysis(e.target.value)}
                className={styles.runDropdown}
              >
                {historyList.map((h) => (
                  <option key={h._id} value={h._id}>
                    {h.sample_id || h._id.slice(0, 8)} ({new Date(h.created_at).toLocaleDateString()})
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className={styles.metaTags}>
            <span className={styles.tag}>
              Type: {analysis.kpis?.analysis_type || 'HPLC-UV/Vis'}
            </span>
            <span className={styles.tag}>Status: {analysis.status}</span>
          </div>
        </div>

        <div className={styles.metaRight}>
          <div className={styles.quickNavTools}>
            <Link
              to={`/graph/${currentId}`}
              className={styles.deepDiveLink}
              title="Open Knowledge Graph Explorer"
            >
              <Share2 size={14} /> Full Graph
            </Link>
            <Link
              to={`/diagnostics/${currentId}`}
              className={styles.deepDiveLink}
              title="Open ML Isolation Forest Diagnostics"
            >
              <AlertTriangle size={14} /> Diagnostics
            </Link>
          </div>

          <div className={styles.dateBadge}>
            <Calendar size={14} />
            <span>{new Date(analysis.created_at).toLocaleString()}</span>
          </div>
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

      {/* 6. 3D WebGL Knowledge Graph Entity Network */}
      <GraphVisualization
        graphData={graphData}
        analysisId={currentId}
        sampleId={analysis.sample_id || analysis.filename}
        peaks={analysis.peak_details}
        anomalies={analysis.anomaly_results}
      />

      {/* 7. AI Analytical Reasoning & Summary Panel */}
      <AISummaryPanel
        analysisId={currentId}
        aiSummary={analysis.ai_summary}
        aiInterpretation={analysis.ai_interpretation}
        onSummaryGenerated={handleSummaryGenerated}
      />

      {/* 8. Report Generation & Export Actions */}
      <ReportActions analysisId={currentId} />
    </div>
  );
}
