import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Share2,
  Search,
  Filter,
  RefreshCw,
  Info,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Layers,
  Database,
  Tag,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Compass,
  Cpu,
  Flame,
  Droplets,
  Network,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { getHistory } from '../../api/history';
import { getGraphData } from '../../api/graph';
import ThreeKnowledgeGraph from '../graph/ThreeKnowledgeGraph';
import styles from './GraphPage.module.css';

const NODE_COLORS = {
  Sample: { bg: '#d4af37', border: '#eedbbb', text: '#0c0a07', label: 'Sample Run' },
  Compound: { bg: '#10b981', border: '#34d399', text: '#ecfdf5', label: 'Analyte Compound' },
  Peak: { bg: '#c5a059', border: '#f9f1d7', text: '#0c0a07', label: 'Chromatographic Peak' },
  AnomalyPeak: { bg: '#ef4444', border: '#fca5a5', text: '#ffffff', label: 'Flagged Anomaly Peak' },
  Anomaly: { bg: '#f43f5e', border: '#fda4af', text: '#ffffff', label: 'ML Anomaly' },
  Instrument: { bg: '#06b6d4', border: '#67e8f9', text: '#0c0a07', label: 'Instrument / Detector' },
  Batch: { bg: '#f59e0b', border: '#fde68a', text: '#0c0a07', label: 'QC Batch' },
  RetentionTime: { bg: '#eedbbb', border: '#c5a059', text: '#0c0a07', label: 'Retention Time (tR)' },
  Finding: { bg: '#a855f7', border: '#d8b4fe', text: '#ffffff', label: 'Clinical Finding' },
  Default: { bg: '#94a3b8', border: '#cbd5e1', text: '#0f172a', label: 'Entity' }
};

export default function GraphPage() {
  const { analysisId } = useParams();
  const navigate = useNavigate();

  const [analyses, setAnalyses] = useState([]);
  const [selectedId, setSelectedId] = useState(analysisId || '');
  const [graphData, setGraphData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [layoutMode, setLayoutMode] = useState('force'); // 'force', 'sphere', 'helix', 'layered'
  const [selectedNode, setSelectedNode] = useState(null);

  // Fetch recent analysis runs for selector
  useEffect(() => {
    const fetchRuns = async () => {
      try {
        const res = await getHistory(1, 30);
        if (res.items && res.items.length > 0) {
          setAnalyses(res.items);
          if (!selectedId) {
            const firstId = res.items[0].analysis_id || res.items[0].id || res.items[0]._id;
            setSelectedId(firstId);
          }
        }
      } catch (e) {
        console.error('Failed to load history runs:', e);
      }
    };
    fetchRuns();
  }, []);

  // Fetch graph for active selected ID
  useEffect(() => {
    if (!selectedId) return;

    const loadGraph = async () => {
      setLoading(true);
      try {
        const data = await getGraphData(selectedId);
        const rawNodes = data.nodes || data.visualization?.nodes || [];
        const rawEdges = data.edges || data.visualization?.edges || [];

        if (rawNodes.length > 0) {
          const normalizedNodes = rawNodes.map(n => ({
            id: String(n.id),
            label: String(n.label || n.id),
            group: n.group || n.type || 'Default',
            properties: n.properties || {}
          }));

          const normalizedEdges = rawEdges.map(e => ({
            source: typeof e.source === 'object' ? String(e.source.id) : String(e.source),
            target: typeof e.target === 'object' ? String(e.target.id) : String(e.target),
            relationship: e.relationship || e.label || 'CONNECTED'
          }));

          setGraphData({ nodes: normalizedNodes, edges: normalizedEdges, context: data.context });
          setSelectedNode(normalizedNodes[0]);
        } else {
          const mock = generateMockGraph(selectedId);
          setGraphData(mock);
          setSelectedNode(mock.nodes[0]);
        }
      } catch (err) {
        console.warn('Neo4j fetch fallback to synthetic ontology:', err);
        const mock = generateMockGraph(selectedId);
        setGraphData(mock);
        setSelectedNode(mock.nodes[0]);
      } finally {
        setLoading(false);
      }
    };

    loadGraph();
  }, [selectedId]);

  const generateMockGraph = (id) => {
    const sid = `Sample_${(id && id.length > 6) ? id.slice(-6) : 'SMP-01'}`;
    const nodes = [
      { id: sid, label: sid, group: 'Sample', properties: { instrument: 'Agilent 1260 HPLC', column: 'C18 150x4.6mm', flow_rate: '1.00 mL/min', wavelength: '254 nm', quality_score: '99.2%' } },
      { id: 'INST-01', label: 'Agilent 1260 HPLC-UV', group: 'Instrument', properties: { detector: 'Photodiode Array (DAD)', flow_cell: '10 mm', lamp: 'Deuterium' } },
      { id: 'BATCH-01', label: 'QC-Batch-2026', group: 'Batch', properties: { standard: 'USP Standard QC', compliance: '21 CFR Part 11', lot: 'LOT-9821' } },
      { id: 'C-01', label: 'Acetaminophen', group: 'Compound', properties: { formula: 'C8H9NO2', purity: '99.8%', category: 'Active Pharmaceutical Ingredient' } },
      { id: 'C-02', label: 'Caffeine', group: 'Compound', properties: { formula: 'C8H10N4O2', purity: '99.4%', category: 'Reference Standard' } },
      { id: 'C-03', label: '4-Aminophenol', group: 'Compound', properties: { formula: 'C6H7NO', limit: '< 0.05%', category: 'Related Degradant' } },
      { id: 'P-01', label: 'Peak 1 (tR: 2.80m)', group: 'Peak', properties: { retention_time: '2.80 min', area: '45,800', height: '8,900', snr: '124.5', asymmetry: '1.02' } },
      { id: 'P-02', label: 'Peak 2 (tR: 4.15m)', group: 'Peak', properties: { retention_time: '4.15 min', area: '89,200', height: '14,500', snr: '342.1', asymmetry: '1.05' } },
      { id: 'P-03', label: 'Peak 3 (Impurity Spike)', group: 'AnomalyPeak', properties: { retention_time: '7.20 min', area: '31,200', height: '6,400', snr: '45.2', is_anomaly: true } },
      { id: 'RT-01', label: 'tR: 2.80 min', group: 'RetentionTime', properties: { value: 2.80, unit: 'min' } },
      { id: 'RT-02', label: 'tR: 4.15 min', group: 'RetentionTime', properties: { value: 4.15, unit: 'min' } },
      { id: 'RT-03', label: 'tR: 7.20 min', group: 'RetentionTime', properties: { value: 7.20, unit: 'min' } },
      { id: 'AN-01', label: 'Anomaly: Degradation Spike', group: 'Anomaly', properties: { score: '0.892', confidence: '96.4%', classification: 'Confirmed Impurity Drift' } },
      { id: 'F-01', label: 'Finding: Resolution > 2.0', group: 'Finding', properties: { severity: 'LOW', description: 'Nominal baseline separation achieved across critical pair.' } }
    ];

    const edges = [
      { source: sid, target: 'INST-01', relationship: 'RUN_ON' },
      { source: sid, target: 'BATCH-01', relationship: 'PART_OF_BATCH' },
      { source: sid, target: 'C-01', relationship: 'CONTAINS' },
      { source: sid, target: 'C-02', relationship: 'CONTAINS' },
      { source: sid, target: 'C-03', relationship: 'CONTAINS' },
      { source: 'C-01', target: 'P-01', relationship: 'PRODUCES' },
      { source: 'C-02', target: 'P-02', relationship: 'PRODUCES' },
      { source: 'C-03', target: 'P-03', relationship: 'PRODUCES' },
      { source: 'P-01', target: 'RT-01', relationship: 'HAS_RETENTION_TIME' },
      { source: 'P-02', target: 'RT-02', relationship: 'HAS_RETENTION_TIME' },
      { source: 'P-03', target: 'RT-03', relationship: 'HAS_RETENTION_TIME' },
      { source: 'P-03', target: 'AN-01', relationship: 'HAS_ANOMALY' },
      { source: 'RT-02', target: 'F-01', relationship: 'ASSOCIATED_WITH' }
    ];

    return { nodes, edges };
  };

  const handleSelectRun = (id) => {
    setSelectedId(id);
    navigate(`/graph/${id}`, { replace: true });
  };

  // Compute connected neighbors of selected node
  const connectedEdges = (graphData?.edges || []).filter(e => {
    if (!selectedNode) return false;
    return e.source === selectedNode.id || e.target === selectedNode.id;
  });

  const connectedNeighborIds = new Set();
  connectedEdges.forEach(e => {
    connectedNeighborIds.add(e.source === selectedNode.id ? e.target : e.source);
  });

  const neighborNodes = (graphData?.nodes || []).filter(n => connectedNeighborIds.has(n.id));

  const anomalyCount = (graphData?.nodes || []).filter(n => n.group === 'Anomaly' || n.group === 'AnomalyPeak' || n.properties?.is_anomaly).length;

  return (
    <div className={styles.graphContainer}>
      {/* Top Header & 3D Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.titleGroup}>
          <div className={styles.iconCircle}>
            <Share2 size={20} className={styles.goldIcon} />
          </div>
          <div>
            <h1 className={styles.title}>3D Analytical Knowledge Graph</h1>
            <span className={styles.subtitle}>
              Interactive Neo4j Chromatic Graph &bull; Real-Time Entity Topology
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className={styles.toolActions}>
          {/* Analysis Run Selector */}
          <div className={styles.selectWrapper}>
            <Database size={14} className={styles.fieldIcon} />
            <select
              value={selectedId}
              onChange={(e) => handleSelectRun(e.target.value)}
              className={styles.select}
            >
              {analyses.map((a) => {
                const aid = a.analysis_id || a.id || a._id;
                return (
                  <option key={aid} value={aid}>
                    {a.sample_id || a.filename || aid.slice(0, 8)} ({new Date(a.created_at).toLocaleDateString()})
                  </option>
                );
              })}
              {analyses.length === 0 && (
                <option value="demo">Demo HPLC Knowledge Network</option>
              )}
            </select>
          </div>

          {/* 3D Layout Switcher */}
          <div className={styles.layoutSelector}>
            <span className={styles.selectorLabel}>3D Layout:</span>
            <div className={styles.layoutPills}>
              {[
                { id: 'force', label: 'Force 3D' },
                { id: 'sphere', label: 'Orbital Sphere' },
                { id: 'helix', label: 'Helical DNA' },
                { id: 'layered', label: 'Layered' },
              ].map((m) => (
                <button
                  key={m.id}
                  className={`${styles.layoutBtn} ${layoutMode === m.id ? styles.activeLayoutBtn : ''}`}
                  onClick={() => setLayoutMode(m.id)}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className={styles.filterBar}>
        <div className={styles.filterChips}>
          {['ALL', 'Sample', 'Compound', 'Peak', 'Anomaly', 'Instrument', 'RetentionTime'].map((type) => (
            <button
              key={type}
              className={`${styles.chip} ${typeFilter === type ? styles.activeChip : ''}`}
              onClick={() => setTypeFilter(type)}
            >
              {type === 'ALL' ? 'All Entities' : (NODE_COLORS[type]?.label || type)}
            </button>
          ))}
        </div>

        <div className={styles.searchWrapper}>
          <Search size={14} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search 3D nodes by name, ID or formula..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>
      </div>

      {/* Main 3D Graph + Inspector Layout */}
      <div className={styles.viewportGrid}>
        {/* 3D WebGL Canvas */}
        <div className={styles.canvasContainer}>
          {loading ? (
            <div className={styles.loadingOverlay}>
              <RefreshCw size={28} className={styles.spinIcon} />
              <span>Simulating 3D Graph Topology...</span>
            </div>
          ) : (
            <ThreeKnowledgeGraph
              nodes={graphData?.nodes || []}
              edges={graphData?.edges || []}
              onSelectNode={setSelectedNode}
              selectedNodeId={selectedNode?.id}
              searchTerm={searchTerm}
              typeFilter={typeFilter}
              layoutMode={layoutMode}
            />
          )}
        </div>

        {/* Right Side 3D Entity Inspector Drawer */}
        <div className={styles.inspectorDrawer}>
          <div className={styles.drawerHeader}>
            <div className={styles.drawerTitleGroup}>
              <Activity size={16} className={styles.goldIcon} />
              <span className={styles.drawerTitle}>3D Node Inspector</span>
            </div>
            {selectedNode && (
              <span
                className={styles.nodeBadge}
                style={{
                  background: (NODE_COLORS[selectedNode.group] || NODE_COLORS.Default).bg,
                  color: (NODE_COLORS[selectedNode.group] || NODE_COLORS.Default).text,
                }}
              >
                {selectedNode.group}
              </span>
            )}
          </div>

          {selectedNode ? (
            <div className={styles.inspectorContent}>
              <div className={styles.nodeMainInfo}>
                <div className={styles.nodeTitle}>{selectedNode.label || selectedNode.id}</div>
                <div className={styles.nodeIdTag}>ID: {selectedNode.id}</div>
              </div>

              {/* Chemical & Kinetics Properties */}
              <div className={styles.propSection}>
                <div className={styles.propSectionTitle}>Entity Properties</div>
                <div className={styles.propGrid}>
                  {selectedNode.properties && Object.keys(selectedNode.properties).length > 0 ? (
                    Object.entries(selectedNode.properties).map(([k, v]) => (
                      <div key={k} className={styles.propCard}>
                        <span className={styles.propLabel}>{k.replace(/_/g, ' ')}</span>
                        <span className={styles.propValue}>{String(v)}</span>
                      </div>
                    ))
                  ) : (
                    <div className={styles.emptyProps}>No custom properties attached to this node.</div>
                  )}
                </div>
              </div>

              {/* Connected 3D Graph Neighbors */}
              <div className={styles.propSection}>
                <div className={styles.propSectionTitle}>
                  Connected Neighbors ({neighborNodes.length})
                </div>
                <div className={styles.neighborList}>
                  {neighborNodes.map((n) => (
                    <div
                      key={n.id}
                      className={styles.neighborItem}
                      onClick={() => setSelectedNode(n)}
                    >
                      <div className={styles.neighborLeft}>
                        <span
                          className={styles.neighborDot}
                          style={{ background: (NODE_COLORS[n.group] || NODE_COLORS.Default).bg }}
                        />
                        <span className={styles.neighborName}>{n.label || n.id}</span>
                      </div>
                      <ChevronRight size={14} className={styles.chevron} />
                    </div>
                  ))}
                  {neighborNodes.length === 0 && (
                    <div className={styles.emptyProps}>No direct links to other entities.</div>
                  )}
                </div>
              </div>

              {/* Graph Stats Card */}
              <div className={styles.statsCard}>
                <div className={styles.statsHeader}>
                  <Sparkles size={14} className={styles.goldIcon} />
                  <span>Graph Summary</span>
                </div>
                <div className={styles.statsRow}>
                  <span>Total Nodes:</span>
                  <strong>{graphData?.nodes?.length || 0}</strong>
                </div>
                <div className={styles.statsRow}>
                  <span>Total Edges:</span>
                  <strong>{graphData?.edges?.length || 0}</strong>
                </div>
                <div className={styles.statsRow}>
                  <span>Anomalies Flagged:</span>
                  <strong className={styles.redText}>{anomalyCount}</strong>
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.emptyInspector}>
              <Compass size={32} className={styles.emptyIcon} />
              <p>Click any 3D node in the WebGL canvas to inspect properties, chemical kinetics, and connected topology.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
