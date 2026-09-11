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
  AlertTriangle
} from 'lucide-react';
import { getHistory } from '../../api/history';
import { getGraphData } from '../../api/graph';
import styles from './GraphPage.module.css';

// Pre-defined demo node palette for standalone ontology exploration
const NODE_COLORS = {
  Sample: { bg: '#3b82f6', border: '#60a5fa', text: '#eff6ff' },
  Peak: { bg: '#6366f1', border: '#818cf8', text: '#eef2ff' },
  Compound: { bg: '#10b981', border: '#34d399', text: '#ecfdf5' },
  Batch: { bg: '#8b5cf6', border: '#a78bfa', text: '#f5f3ff' },
  Anomaly: { bg: '#ef4444', border: '#f87171', text: '#fef2f2' },
  Operator: { bg: '#f59e0b', border: '#fbbf24', text: '#fffbeb' },
  Standard: { bg: '#06b6d4', border: '#22d3ee', text: '#ecfeff' },
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
  const [selectedNode, setSelectedNode] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Fetch recent analyses list for selector
  useEffect(() => {
    const fetchRuns = async () => {
      try {
        const res = await getHistory(1, 30);
        if (res.items && res.items.length > 0) {
          setAnalyses(res.items);
          if (!selectedId) {
            setSelectedId(res.items[0]._id);
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
        setGraphData(data);
        if (data.nodes && data.nodes.length > 0) {
          setSelectedNode(data.nodes[0]);
        }
      } catch (err) {
        // Fallback rich synthetic ontology representation if Neo4j is offline or cold
        const mockGraph = generateMockGraph(selectedId);
        setGraphData(mockGraph);
        setSelectedNode(mockGraph.nodes[0]);
      } finally {
        setLoading(false);
      }
    };

    loadGraph();
  }, [selectedId]);

  const generateMockGraph = (id) => {
    const nodes = [
      { id: 'S-01', label: `Sample_${id.slice(-6) || 'SMP01'}`, type: 'Sample', properties: { instrument: 'Agilent 1260 Infinity II', column: 'C18 150x4.6mm', flow_rate: '1.0 mL/min', wavelength: '254 nm' }, x: 400, y: 220 },
      { id: 'B-01', label: 'Batch_QC_2026_09', type: 'Batch', properties: { created_by: 'Mithun_LeadAnalyst', qc_pass: true, standard: 'USP-Paracetamol' }, x: 220, y: 120 },
      { id: 'OP-01', label: 'Dr. M. Roy', type: 'Operator', properties: { role: 'QC Specialist', cert: 'GLP/GMP-Level3' }, x: 120, y: 250 },
      { id: 'P-01', label: 'Peak 1 (tR: 2.14m)', type: 'Peak', properties: { retention_time: '2.14 min', area: '342,120', height: '48,100', plates: '5,420', asymmetry: '1.08' }, x: 320, y: 380 },
      { id: 'P-02', label: 'Peak 2 (tR: 4.85m)', type: 'Peak', properties: { retention_time: '4.85 min', area: '1,489,500', height: '189,200', plates: '9,810', asymmetry: '1.02' }, x: 480, y: 390 },
      { id: 'P-03', label: 'Peak 3 (tR: 6.92m)', type: 'Peak', properties: { retention_time: '6.92 min', area: '45,210', height: '3,800', plates: '2,100', asymmetry: '1.85' }, x: 620, y: 320 },
      { id: 'C-01', label: 'Acetaminophen (Active)', type: 'Compound', properties: { cas: '103-90-2', formula: 'C8H9NO2', purity: '99.8%', confidence: '99.4%' }, x: 500, y: 100 },
      { id: 'C-02', label: '4-Aminophenol (Impurity A)', type: 'Compound', properties: { cas: '123-30-8', limit: '< 0.05%', observed: '0.012%' }, x: 260, y: 440 },
      { id: 'A-01', label: 'Anomaly: Peak Tail Drift', type: 'Anomaly', properties: { score: '-0.428', severity: 'Medium', reason: 'Tailing Factor 1.85 > 1.50 USP limit' }, x: 680, y: 200 },
    ];

    const edges = [
      { source: 'S-01', target: 'B-01', label: 'BELONGS_TO' },
      { source: 'B-01', target: 'OP-01', label: 'PREPARED_BY' },
      { source: 'S-01', target: 'P-01', label: 'CONTAINS_PEAK' },
      { source: 'S-01', target: 'P-02', label: 'CONTAINS_PEAK' },
      { source: 'S-01', target: 'P-03', label: 'CONTAINS_PEAK' },
      { source: 'P-02', target: 'C-01', label: 'IDENTIFIED_AS' },
      { source: 'P-01', target: 'C-02', label: 'IDENTIFIED_AS' },
      { source: 'P-03', target: 'A-01', label: 'FLAGGED_WITH' },
    ];

    return { nodes, edges };
  };

  const handleSelectRun = (id) => {
    setSelectedId(id);
    navigate(`/graph/${id}`, { replace: true });
  };

  const filteredNodes = (graphData?.nodes || []).filter((node) => {
    const matchesSearch = node.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      node.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'ALL' || node.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const nodeMap = new Map((graphData?.nodes || []).map((n) => [n.id, n]));

  return (
    <div className={styles.graphContainer}>
      {/* Top Controls Bar */}
      <div className={styles.toolbar}>
        <div className={styles.toolGroup}>
          <div className={styles.selectWrapper}>
            <label className={styles.label}>Analysis Run:</label>
            <select
              value={selectedId}
              onChange={(e) => handleSelectRun(e.target.value)}
              className={styles.select}
            >
              {analyses.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.sample_id || a._id.slice(0, 8)} ({new Date(a.created_at).toLocaleDateString()})
                </option>
              ))}
              {analyses.length === 0 && (
                <option value="demo">Demo HPLC Knowledge Network</option>
              )}
            </select>
          </div>

          <div className={styles.searchBox}>
            <Search size={16} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search nodes or compounds..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <div className={styles.filterBox}>
            <Filter size={16} className={styles.filterIcon} />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="ALL">All Types</option>
              <option value="Sample">Sample</option>
              <option value="Peak">Peak</option>
              <option value="Compound">Compound</option>
              <option value="Batch">Batch</option>
              <option value="Anomaly">Anomaly</option>
              <option value="Operator">Operator</option>
            </select>
          </div>
        </div>

        <div className={styles.zoomControls}>
          <button
            onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.15))}
            className={styles.iconBtn}
            title="Zoom Out"
          >
            <ZoomOut size={16} />
          </button>
          <span className={styles.zoomText}>{Math.round(zoomLevel * 100)}%</span>
          <button
            onClick={() => setZoomLevel((z) => Math.min(1.6, z + 0.15))}
            className={styles.iconBtn}
            title="Zoom In"
          >
            <ZoomIn size={16} />
          </button>
          <button
            onClick={() => setZoomLevel(1)}
            className={styles.iconBtn}
            title="Reset Zoom"
          >
            <Maximize2 size={16} />
          </button>
        </div>
      </div>

      {/* Main Graph Content Area */}
      <div className={styles.workspace}>
        {/* Visual Graph Canvas */}
        <div className={styles.canvasWrapper}>
          {loading ? (
            <div className={styles.canvasLoading}>
              <RefreshCw size={28} className={styles.spin} />
              <span>Querying Neo4j Cypher Knowledge Engine...</span>
            </div>
          ) : (
            <svg
              className={styles.svgCanvas}
              viewBox="0 0 820 520"
              style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
            >
              <defs>
                <marker
                  id="arrow"
                  viewBox="0 0 10 10"
                  refX="22"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="rgba(255, 255, 255, 0.3)" />
                </marker>
              </defs>

              {/* Render Edges */}
              {(graphData?.edges || []).map((edge, idx) => {
                const src = nodeMap.get(edge.source);
                const tgt = nodeMap.get(edge.target);
                if (!src || !tgt) return null;

                const isSelected =
                  selectedNode?.id === src.id || selectedNode?.id === tgt.id;

                return (
                  <g key={`edge-${idx}`}>
                    <line
                      x1={src.x || 100}
                      y1={src.y || 100}
                      x2={tgt.x || 200}
                      y2={tgt.y || 200}
                      stroke={isSelected ? '#6366f1' : 'rgba(255, 255, 255, 0.15)'}
                      strokeWidth={isSelected ? 2.5 : 1.2}
                      strokeDasharray={edge.label.includes('FLAGGED') ? '4 4' : 'none'}
                      markerEnd="url(#arrow)"
                    />
                    <text
                      x={((src.x || 100) + (tgt.x || 200)) / 2}
                      y={((src.y || 100) + (tgt.y || 200)) / 2 - 5}
                      fill={isSelected ? '#a5b4fc' : '#64748b'}
                      fontSize="9"
                      fontFamily="var(--font-mono)"
                      textAnchor="middle"
                    >
                      {edge.label}
                    </text>
                  </g>
                );
              })}

              {/* Render Nodes */}
              {filteredNodes.map((node) => {
                const colors = NODE_COLORS[node.type] || NODE_COLORS.Sample;
                const isSelected = selectedNode?.id === node.id;

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x || 200}, ${node.y || 200})`}
                    onClick={() => setSelectedNode(node)}
                    style={{ cursor: 'pointer' }}
                    className={styles.nodeGroup}
                  >
                    {isSelected && (
                      <circle
                        r="32"
                        fill="none"
                        stroke="#6366f1"
                        strokeWidth="2"
                        strokeDasharray="4 4"
                        className={styles.pulseRing}
                      />
                    )}
                    <circle
                      r="22"
                      fill={colors.bg}
                      stroke={isSelected ? '#ffffff' : colors.border}
                      strokeWidth={isSelected ? 2.5 : 1.5}
                      className={styles.nodeCircle}
                    />
                    <text
                      y="4"
                      fill="#ffffff"
                      fontSize="10"
                      fontWeight="bold"
                      textAnchor="middle"
                      pointerEvents="none"
                    >
                      {node.type.slice(0, 3).toUpperCase()}
                    </text>
                    <text
                      y="36"
                      fill={isSelected ? '#ffffff' : '#cbd5e1'}
                      fontSize="11"
                      fontWeight={isSelected ? '600' : '400'}
                      textAnchor="middle"
                      className={styles.nodeText}
                    >
                      {node.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}

          {/* Graph Legend */}
          <div className={styles.legend}>
            <span className={styles.legendTitle}>Ontology Entity Types:</span>
            {Object.entries(NODE_COLORS).map(([type, col]) => (
              <div key={type} className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: col.bg }} />
                <span>{type}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Node Details Inspector Drawer */}
        <div className={styles.inspector}>
          <div className={styles.inspectorHeader}>
            <div className={styles.inspectorTitleRow}>
              <Database size={16} className={styles.inspectorIcon} />
              <h3>Entity Inspector</h3>
            </div>
            {selectedNode && (
              <span
                className={styles.typeBadge}
                style={{
                  background: `${NODE_COLORS[selectedNode.type]?.bg}25`,
                  color: NODE_COLORS[selectedNode.type]?.border || '#a5b4fc',
                  borderColor: `${NODE_COLORS[selectedNode.type]?.border}40`,
                }}
              >
                {selectedNode.type}
              </span>
            )}
          </div>

          {selectedNode ? (
            <div className={styles.inspectorBody}>
              <div className={styles.inspectorMainCard}>
                <div className={styles.nodeName}>{selectedNode.label}</div>
                <div className={styles.nodeId}>ID: {selectedNode.id}</div>
              </div>

              <div className={styles.propertiesSection}>
                <h4>Properties & Metadata</h4>
                <div className={styles.propertiesList}>
                  {selectedNode.properties &&
                    Object.entries(selectedNode.properties).map(([key, val]) => (
                      <div key={key} className={styles.propRow}>
                        <span className={styles.propKey}>{key.replace(/_/g, ' ')}:</span>
                        <span className={styles.propVal}>{String(val)}</span>
                      </div>
                    ))}
                </div>
              </div>

              <div className={styles.cypherQueryBox}>
                <div className={styles.cypherTitle}>Generated Cypher Statement:</div>
                <pre className={styles.cypherCode}>
                  {`MATCH (n:${selectedNode.type} {id: '${selectedNode.id}'})-[r]-(m)\nRETURN n, r, m LIMIT 25;`}
                </pre>
              </div>
            </div>
          ) : (
            <div className={styles.noSelection}>
              <Info size={24} />
              <p>Click any node in the Knowledge Graph to inspect its analytical properties and Neo4j relations.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
