import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import {
  RotateCcw,
  Play,
  Pause,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Sparkles,
  Compass,
  Layers,
  GitBranch,
  Eye,
  Info,
  Activity
} from 'lucide-react';
import styles from './GraphVisualization.module.css';

// Luxury Chromatic Color Mapping for 3D Nodes
const PALETTE = {
  Sample: { hex: 0xd4af37, color: '#d4af37', emissive: 0x665015, glow: 'rgba(212, 175, 55, 0.8)', radius: 10, label: 'Sample Hub' },
  Compound: { hex: 0x10b981, color: '#10b981', emissive: 0x0a5c36, glow: 'rgba(16, 185, 129, 0.7)', radius: 7.5, label: 'Compound' },
  Peak: { hex: 0xc5a059, color: '#c5a059', emissive: 0x4a3b1a, glow: 'rgba(197, 160, 89, 0.6)', radius: 5.5, label: 'Chromatographic Peak' },
  AnomalyPeak: { hex: 0xef4444, color: '#ef4444', emissive: 0x991b1b, glow: 'rgba(239, 68, 68, 0.9)', radius: 7.5, label: 'Flagged Anomaly Peak' },
  Anomaly: { hex: 0xf43f5e, color: '#f43f5e', emissive: 0x9f1239, glow: 'rgba(244, 63, 94, 0.9)', radius: 6.5, label: 'ML Anomaly' },
  Instrument: { hex: 0x06b6d4, color: '#06b6d4', emissive: 0x155e75, glow: 'rgba(6, 182, 212, 0.7)', radius: 8, label: 'Instrument' },
  Batch: { hex: 0xf59e0b, color: '#f59e0b', emissive: 0x854d0e, glow: 'rgba(245, 158, 11, 0.7)', radius: 7.5, label: 'QC Batch' },
  RetentionTime: { hex: 0xeedbbb, color: '#eedbbb', emissive: 0x524632, glow: 'rgba(238, 219, 187, 0.5)', radius: 4.5, label: 'Retention Time (tR)' },
  Finding: { hex: 0xa855f7, color: '#a855f7', emissive: 0x6b21a8, glow: 'rgba(168, 85, 247, 0.7)', radius: 5.5, label: 'Analytical Finding' },
  Default: { hex: 0x94a3b8, color: '#94a3b8', emissive: 0x334155, glow: 'rgba(148, 163, 184, 0.5)', radius: 5, label: 'Entity' }
};

export default function ThreeKnowledgeGraph({
  nodes = [],
  edges = [],
  onSelectNode,
  selectedNodeId,
  searchTerm = '',
  typeFilter = 'ALL',
  layoutMode = 'tree' // 'tree', 'force', 'sphere', 'helix', 'layered'
}) {
  const containerRef = useRef(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [physicsRunning, setPhysicsRunning] = useState(true);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0, visible: false });

  // Scene state references
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const animFrameRef = useRef(null);
  const nodeMeshesRef = useRef(new Map());
  const linkLinesRef = useRef([]);
  const pulseParticlesRef = useRef([]);
  const simNodesRef = useRef([]);
  const simEdgesRef = useRef([]);
  const isDraggingRef = useRef(false);
  const prevMousePosRef = useRef({ x: 0, y: 0 });
  const cameraTargetRef = useRef(new THREE.Vector3(0, 0, 0));
  const cameraDestRef = useRef(null);
  const sphericalRef = useRef({ radius: 310, theta: 0.85, phi: 1.15 });

  // Filter nodes based on active filter and search term
  const filteredNodes = useMemo(() => {
    if (!nodes || nodes.length === 0) return [];
    return nodes.filter(node => {
      const matchType = typeFilter === 'ALL' || node.group === typeFilter || (typeFilter === 'Anomaly' && (node.group === 'Anomaly' || node.group === 'AnomalyPeak' || node.properties?.is_anomaly));
      const matchSearch = !searchTerm || (node.label && node.label.toLowerCase().includes(searchTerm.toLowerCase())) || (node.id && node.id.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchType && matchSearch;
    });
  }, [nodes, typeFilter, searchTerm]);

  const filteredNodeIds = useMemo(() => new Set(filteredNodes.map(n => n.id)), [filteredNodes]);

  const filteredEdges = useMemo(() => {
    if (!edges || edges.length === 0) return [];
    return edges.filter(e => {
      const srcId = typeof e.source === 'object' ? e.source.id : e.source;
      const tgtId = typeof e.target === 'object' ? e.target.id : e.target;
      return filteredNodeIds.has(srcId) && filteredNodeIds.has(tgtId);
    });
  }, [edges, filteredNodeIds]);

  // Create High-DPI Text Sprite for 3D Node Labels
  const createTextSprite = useCallback((text, color = '#ffffff') => {
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 80;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'rgba(10, 8, 5, 0.82)';
    ctx.roundRect(4, 4, 312, 72, 14);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.font = 'bold 26px "Inter", "Segoe UI", sans-serif';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const displayLabel = text.length > 18 ? text.substring(0, 17) + '…' : text;
    ctx.fillText(displayLabel, 160, 40);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 0.95,
      depthWrite: false
    });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(36, 9, 1);
    return sprite;
  }, []);

  const updateCameraPosition = useCallback(() => {
    if (!cameraRef.current) return;
    const s = sphericalRef.current;
    const x = s.radius * Math.sin(s.phi) * Math.sin(s.theta);
    const y = s.radius * Math.cos(s.phi);
    const z = s.radius * Math.sin(s.phi) * Math.cos(s.theta);
    cameraRef.current.position.set(x, y, z);
    cameraRef.current.lookAt(cameraTargetRef.current);
  }, []);

  // 1. Initialize Three.js WebGL Scene
  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth || 800;
    const height = containerRef.current.clientHeight || 480;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(48, width / height, 1, 3500);
    cameraRef.current = camera;
    updateCameraPosition();

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const goldPointLight = new THREE.PointLight(0xd4af37, 3.2, 1200);
    goldPointLight.position.set(120, 180, 220);
    scene.add(goldPointLight);

    const cyanPointLight = new THREE.PointLight(0x06b6d4, 2.8, 1200);
    cyanPointLight.position.set(-180, -120, -180);
    scene.add(cyanPointLight);

    const rubyPointLight = new THREE.PointLight(0xef4444, 2.2, 1000);
    rubyPointLight.position.set(0, -150, 150);
    scene.add(rubyPointLight);

    // Starfield Dust Particles
    const dustCount = 350;
    const dustGeometry = new THREE.BufferGeometry();
    const dustPositions = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount * 3; i += 3) {
      dustPositions[i] = (Math.random() - 0.5) * 1100;
      dustPositions[i + 1] = (Math.random() - 0.5) * 1100;
      dustPositions[i + 2] = (Math.random() - 0.5) * 1100;
    }
    dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    const dustMaterial = new THREE.PointsMaterial({
      color: 0xeedbbb,
      size: 2.2,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending
    });
    const dustPoints = new THREE.Points(dustGeometry, dustMaterial);
    scene.add(dustPoints);

    // Handle Window / Container Resize
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth || 800;
      const h = containerRef.current.clientHeight || 480;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(containerRef.current);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, [updateCameraPosition]);

  // 2. Build 3D Entities, Tree Hierarchies and Topology
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Clean up previous meshes and link lines
    nodeMeshesRef.current.forEach((item) => {
      scene.remove(item.mesh);
      if (item.sprite) scene.remove(item.sprite);
      if (item.glowMesh) scene.remove(item.glowMesh);
    });
    nodeMeshesRef.current.clear();

    linkLinesRef.current.forEach(item => scene.remove(item.line));
    linkLinesRef.current = [];

    pulseParticlesRef.current.forEach(p => scene.remove(p.mesh));
    pulseParticlesRef.current = [];

    if (filteredNodes.length === 0) return;

    // Compute Tree Hierarchy & Node Coordinates
    const simNodes = filteredNodes.map((n, i) => {
      let x = 0, y = 0, z = 0;

      if (layoutMode === 'tree' || layoutMode === 'layered') {
        // ── 3D HIERARCHICAL TREE ARCHITECTURE ──
        // Level 0 (Root Apex): Sample
        // Level 1: Instruments & Batches
        // Level 2: Chemical Compounds
        // Level 3: Chromatographic Peaks
        // Level 4 (Leaves): Retention Times & Anomaly Flags
        const group = n.group;
        if (group === 'Sample') {
          x = 0; y = 130; z = 0;
        } else if (group === 'Instrument' || group === 'Batch') {
          const angle = (i * Math.PI * 2) / 3;
          const radius = 65;
          x = radius * Math.cos(angle);
          y = 75;
          z = radius * Math.sin(angle);
        } else if (group === 'Compound') {
          const compNodes = filteredNodes.filter(node => node.group === 'Compound');
          const compIdx = compNodes.findIndex(c => c.id === n.id);
          const totalComps = Math.max(1, compNodes.length);
          const angle = (compIdx / totalComps) * Math.PI * 2;
          const radius = 120;
          x = radius * Math.cos(angle);
          y = 15;
          z = radius * Math.sin(angle);
        } else if (group === 'Peak' || group === 'AnomalyPeak') {
          const peakNodes = filteredNodes.filter(node => node.group === 'Peak' || node.group === 'AnomalyPeak');
          const peakIdx = peakNodes.findIndex(p => p.id === n.id);
          const totalPeaks = Math.max(1, peakNodes.length);
          const angle = (peakIdx / totalPeaks) * Math.PI * 2 + (Math.sin(peakIdx) * 0.2);
          const radius = 175 + (peakIdx % 3) * 18;
          x = radius * Math.cos(angle);
          y = -50;
          z = radius * Math.sin(angle);
        } else if (group === 'Anomaly') {
          const anomNodes = filteredNodes.filter(node => node.group === 'Anomaly');
          const anomIdx = anomNodes.findIndex(a => a.id === n.id);
          const totalAnoms = Math.max(1, anomNodes.length);
          const angle = (anomIdx / totalAnoms) * Math.PI * 2;
          const radius = 230;
          x = radius * Math.cos(angle);
          y = -115;
          z = radius * Math.sin(angle);
        } else {
          // RetentionTime, Finding, Default
          const angle = (i % 12) * (Math.PI / 6) + (Math.floor(i / 12) * 0.15);
          const radius = 210 + (i % 4) * 15;
          x = radius * Math.cos(angle);
          y = -110;
          z = radius * Math.sin(angle);
        }
      } else if (layoutMode === 'sphere') {
        const phi = Math.acos(-1 + (2 * i) / filteredNodes.length);
        const theta = Math.sqrt(filteredNodes.length * Math.PI) * phi;
        const rad = n.group === 'Sample' ? 25 : n.group === 'Compound' ? 95 : 165;
        x = rad * Math.cos(theta) * Math.sin(phi);
        y = rad * Math.sin(theta) * Math.sin(phi);
        z = rad * Math.cos(phi);
      } else if (layoutMode === 'helix') {
        const t = (i - filteredNodes.length / 2) * 11;
        const rad = 85;
        x = rad * Math.cos(i * 0.48);
        z = rad * Math.sin(i * 0.48);
        y = t;
      } else {
        // Force layout initial radial seed
        const angle = i * 0.65;
        const radius = 60 + Math.sqrt(i) * 22;
        x = radius * Math.cos(angle);
        y = ((i % 5) - 2) * 35;
        z = radius * Math.sin(angle);
      }

      return {
        id: n.id,
        raw: n,
        x, y, z,
        targetX: x, targetY: y, targetZ: z,
        vx: 0, vy: 0, vz: 0,
        group: n.group || 'Default',
        radius: (PALETTE[n.group] || PALETTE.Default).radius
      };
    });

    const nodeIndexMap = new Map(simNodes.map((n, idx) => [n.id, idx]));

    const simEdges = filteredEdges.map(e => {
      const srcId = typeof e.source === 'object' ? e.source.id : e.source;
      const tgtId = typeof e.target === 'object' ? e.target.id : e.target;
      return {
        source: srcId,
        target: tgtId,
        sourceIdx: nodeIndexMap.get(srcId),
        targetIdx: nodeIndexMap.get(tgtId),
        relationship: e.relationship || 'CONNECTED'
      };
    }).filter(e => e.sourceIdx !== undefined && e.targetIdx !== undefined);

    simNodesRef.current = simNodes;
    simEdgesRef.current = simEdges;

    // Create 3D Meshes for Nodes
    simNodes.forEach((node) => {
      const p = PALETTE[node.group] || PALETTE.Default;
      const isSelected = selectedNodeId === node.id;
      const isAnomaly = node.group === 'Anomaly' || node.group === 'AnomalyPeak' || node.raw.properties?.is_anomaly;

      // 1. Core Sphere Mesh with Rich Emissive Glow
      const geometry = new THREE.SphereGeometry(node.radius, 28, 28);
      const material = new THREE.MeshStandardMaterial({
        color: p.hex,
        emissive: isAnomaly ? 0xff2222 : (isSelected ? 0xffffff : p.emissive),
        emissiveIntensity: isSelected ? 1.0 : (isAnomaly ? 0.85 : 0.55),
        roughness: 0.15,
        metalness: 0.85
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(node.x, node.y, node.z);
      mesh.userData = { nodeId: node.id, nodeData: node.raw };
      scene.add(mesh);

      // 2. Halo Glow Outer Wireframe Shell
      const haloGeo = new THREE.SphereGeometry(node.radius * 1.35, 16, 16);
      const haloMat = new THREE.MeshBasicMaterial({
        color: isAnomaly ? 0xef4444 : p.hex,
        transparent: true,
        opacity: isSelected ? 0.55 : (isAnomaly ? 0.45 : 0.22),
        wireframe: true
      });
      const glowMesh = new THREE.Mesh(haloGeo, haloMat);
      glowMesh.position.copy(mesh.position);
      scene.add(glowMesh);

      // 3. Billboard Text Label Sprite
      const sprite = createTextSprite(node.raw.label || node.id, p.color);
      sprite.position.set(node.x, node.y + node.radius + 7.5, node.z);
      scene.add(sprite);

      nodeMeshesRef.current.set(node.id, { mesh, glowMesh, sprite, simNode: node, palette: p });
    });

    // Create 3D Tree Edges & Connector Lines
    simEdges.forEach(edge => {
      const src = simNodes[edge.sourceIdx];
      const tgt = simNodes[edge.targetIdx];
      const isAnomalyEdge = edge.relationship === 'HAS_ANOMALY';

      const points = [new THREE.Vector3(src.x, src.y, src.z), new THREE.Vector3(tgt.x, tgt.y, tgt.z)];
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      const lineMat = new THREE.LineBasicMaterial({
        color: isAnomalyEdge ? 0xef4444 : 0xc5a059,
        transparent: true,
        opacity: isAnomalyEdge ? 0.85 : 0.4,
        linewidth: isAnomalyEdge ? 2.2 : 1.2
      });
      const line = new THREE.Line(lineGeo, lineMat);
      scene.add(line);
      linkLinesRef.current.push({ line, srcIdx: edge.sourceIdx, tgtIdx: edge.targetIdx, isAnomaly: isAnomalyEdge });

      // Add Flowing Photon Pulse Particle
      const pulseGeo = new THREE.SphereGeometry(1.8, 8, 8);
      const pulseMat = new THREE.MeshBasicMaterial({
        color: isAnomalyEdge ? 0xff6666 : 0xffeebb,
        transparent: true,
        opacity: 0.95
      });
      const pulseMesh = new THREE.Mesh(pulseGeo, pulseMat);
      scene.add(pulseMesh);
      pulseParticlesRef.current.push({
        mesh: pulseMesh,
        srcIdx: edge.sourceIdx,
        tgtIdx: edge.targetIdx,
        progress: Math.random(),
        speed: 0.007 + Math.random() * 0.009
      });
    });

  }, [filteredNodes, filteredEdges, layoutMode, selectedNodeId, createTextSprite]);

  // 3. Physics Simulation Step (with Zero-NaN Safety & Tree Relaxation)
  const stepPhysics = useCallback(() => {
    if (!physicsRunning) return;

    const simNodes = simNodesRef.current;
    const simEdges = simEdgesRef.current;
    if (simNodes.length === 0) return;

    if (layoutMode === 'force') {
      const repulsion = 1600;
      const springLength = 65;
      const springK = 0.03;
      const centerGravity = 0.007;

      // Repulsion between node pairs with NaN protection
      for (let i = 0; i < simNodes.length; i++) {
        for (let j = i + 1; j < simNodes.length; j++) {
          const n1 = simNodes[i];
          const n2 = simNodes[j];
          let dx = n2.x - n1.x;
          let dy = n2.y - n1.y;
          let dz = n2.z - n1.z;
          let distSq = dx * dx + dy * dy + dz * dz;
          if (distSq < 2) distSq = 2;
          const dist = Math.sqrt(distSq) || 1.4;

          if (dist < 260) {
            const force = repulsion / distSq;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            const fz = (dz / dist) * force;

            n1.vx -= fx; n1.vy -= fy; n1.vz -= fz;
            n2.vx += fx; n2.vy += fy; n2.vz += fz;
          }
        }
      }

      // Spring attraction along links
      simEdges.forEach(e => {
        const n1 = simNodes[e.sourceIdx];
        const n2 = simNodes[e.targetIdx];
        if (!n1 || !n2) return;

        const dx = n2.x - n1.x;
        const dy = n2.y - n1.y;
        const dz = n2.z - n1.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
        const displacement = dist - springLength;
        const force = displacement * springK;

        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        const fz = (dz / dist) * force;

        n1.vx += fx; n1.vy += fy; n1.vz += fz;
        n2.vx -= fx; n2.vy -= fy; n2.vz -= fz;
      });

      // Gravity integration & Damping
      const damping = 0.88;
      simNodes.forEach(n => {
        n.vx -= n.x * centerGravity;
        n.vy -= n.y * centerGravity;
        n.vz -= n.z * centerGravity;

        n.vx = Math.max(-12, Math.min(12, n.vx * damping));
        n.vy = Math.max(-12, Math.min(12, n.vy * damping));
        n.vz = Math.max(-12, Math.min(12, n.vz * damping));

        n.x += n.vx;
        n.y += n.vy;
        n.z += n.vz;

        if (isNaN(n.x) || isNaN(n.y) || isNaN(n.z)) {
          n.x = 0; n.y = 0; n.z = 0; n.vx = 0; n.vy = 0; n.vz = 0;
        }
      });
    } else {
      // Smooth interpolation towards structured Tree / Sphere / Helix coordinates
      simNodes.forEach(n => {
        n.x += (n.targetX - n.x) * 0.08;
        n.y += (n.targetY - n.y) * 0.08;
        n.z += (n.targetZ - n.z) * 0.08;
      });
    }

    // Update 3D Mesh Positions
    simNodes.forEach(n => {
      const item = nodeMeshesRef.current.get(n.id);
      if (item && !isNaN(n.x)) {
        item.mesh.position.set(n.x, n.y, n.z);
        item.glowMesh.position.set(n.x, n.y, n.z);
        item.sprite.position.set(n.x, n.y + n.radius + 7.5, n.z);
      }
    });

    // Update Edge Lines
    linkLinesRef.current.forEach(link => {
      const n1 = simNodes[link.srcIdx];
      const n2 = simNodes[link.tgtIdx];
      if (n1 && n2 && link.line && !isNaN(n1.x) && !isNaN(n2.x)) {
        const positions = link.line.geometry.attributes.position.array;
        positions[0] = n1.x; positions[1] = n1.y; positions[2] = n1.z;
        positions[3] = n2.x; positions[4] = n2.y; positions[5] = n2.z;
        link.line.geometry.attributes.position.needsUpdate = true;
      }
    });

    // Update Photon Pulses
    pulseParticlesRef.current.forEach(p => {
      const n1 = simNodes[p.srcIdx];
      const n2 = simNodes[p.tgtIdx];
      if (n1 && n2 && p.mesh && !isNaN(n1.x)) {
        p.progress = (p.progress + p.speed) % 1.0;
        p.mesh.position.set(
          n1.x + (n2.x - n1.x) * p.progress,
          n1.y + (n2.y - n1.y) * p.progress,
          n1.z + (n2.z - n1.z) * p.progress
        );
      }
    });
  }, [physicsRunning, layoutMode]);

  // 4. Main Animation & Render Loop
  useEffect(() => {
    let animId;

    const animate = (time) => {
      animId = requestAnimationFrame(animate);

      // Smooth Auto-Orbit
      if (autoRotate && !isDraggingRef.current) {
        sphericalRef.current.theta += 0.0032;
        updateCameraPosition();
      }

      // Smooth Camera Fly-To Destination
      if (cameraDestRef.current) {
        sphericalRef.current.theta += (cameraDestRef.current.theta - sphericalRef.current.theta) * 0.09;
        sphericalRef.current.phi += (cameraDestRef.current.phi - sphericalRef.current.phi) * 0.09;
        sphericalRef.current.radius += (cameraDestRef.current.radius - sphericalRef.current.radius) * 0.09;
        updateCameraPosition();

        if (
          Math.abs(cameraDestRef.current.theta - sphericalRef.current.theta) < 0.01 &&
          Math.abs(cameraDestRef.current.phi - sphericalRef.current.phi) < 0.01
        ) {
          cameraDestRef.current = null;
        }
      }

      // Step physics layout
      stepPhysics();

      // Pulsate glowing rings around anomalies
      const pulseScale = 1.0 + Math.sin(time * 0.006) * 0.16;
      nodeMeshesRef.current.forEach((item) => {
        if (item.simNode.group === 'Anomaly' || item.simNode.group === 'AnomalyPeak') {
          item.glowMesh.scale.set(pulseScale, pulseScale, pulseScale);
        }
      });

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [autoRotate, stepPhysics, updateCameraPosition]);

  // 5. Mouse Interaction & 3D Raycasting
  const handleMouseDown = (e) => {
    isDraggingRef.current = true;
    prevMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();

    if (isDraggingRef.current) {
      const deltaX = e.clientX - prevMousePosRef.current.x;
      const deltaY = e.clientY - prevMousePosRef.current.y;

      sphericalRef.current.theta -= deltaX * 0.007;
      sphericalRef.current.phi = Math.max(0.1, Math.min(Math.PI - 0.1, sphericalRef.current.phi + deltaY * 0.007));
      updateCameraPosition();

      prevMousePosRef.current = { x: e.clientX, y: e.clientY };
    } else {
      // Raycasting for Node Hover Tooltip
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );

      if (cameraRef.current && sceneRef.current) {
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, cameraRef.current);
        const meshes = Array.from(nodeMeshesRef.current.values()).map(item => item.mesh);
        const intersects = raycaster.intersectObjects(meshes);

        if (intersects.length > 0) {
          const hitMesh = intersects[0].object;
          const nodeData = hitMesh.userData.nodeData;
          setHoveredNode(nodeData);
          setTooltipPos({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
            visible: true
          });
        } else {
          setHoveredNode(null);
          setTooltipPos(prev => ({ ...prev, visible: false }));
        }
      }
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e) => {
    e.preventDefault();
    sphericalRef.current.radius = Math.max(100, Math.min(800, sphericalRef.current.radius + e.deltaY * 0.45));
    updateCameraPosition();
  };

  const handleClick = (e) => {
    if (!containerRef.current || !cameraRef.current || !sceneRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, cameraRef.current);
    const meshes = Array.from(nodeMeshesRef.current.values()).map(item => item.mesh);
    const intersects = raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
      const hitNode = intersects[0].object.userData.nodeData;
      if (onSelectNode) onSelectNode(hitNode);

      const simNode = simNodesRef.current.find(n => n.id === hitNode.id);
      if (simNode) {
        const targetTheta = Math.atan2(simNode.x, simNode.z || 1);
        const targetPhi = Math.acos(simNode.y / (Math.sqrt(simNode.x * simNode.x + simNode.y * simNode.y + simNode.z * simNode.z) || 1));
        cameraDestRef.current = {
          radius: 240,
          theta: targetTheta,
          phi: Math.max(0.3, Math.min(Math.PI - 0.3, targetPhi))
        };
      }
    }
  };

  // 6. Action Button Handlers (Image 2)
  const handleZoomIn = () => {
    sphericalRef.current.radius = Math.max(100, sphericalRef.current.radius - 50);
    updateCameraPosition();
  };

  const handleZoomOut = () => {
    sphericalRef.current.radius = Math.min(800, sphericalRef.current.radius + 50);
    updateCameraPosition();
  };

  const handleResetCamera = () => {
    cameraDestRef.current = { radius: 310, theta: 0.85, phi: 1.15 };
  };

  return (
    <div className={styles.threeCanvasWrapper}>
      {/* 3D WebGL Canvas */}
      <div
        ref={containerRef}
        className={styles.webglContainer}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onClick={handleClick}
      />

      {/* Floating 3D Interaction Control Dock (Matches Image 2) */}
      <div className={styles.floatingControls}>
        <button
          className={`${styles.controlBtn} ${autoRotate ? styles.activeBtn : ''}`}
          onClick={() => setAutoRotate(!autoRotate)}
          title={autoRotate ? 'Pause 3D Auto-Orbit' : 'Enable 3D Auto-Orbit'}
        >
          <Compass size={15} />
          <span>{autoRotate ? 'Orbiting' : 'Orbit'}</span>
        </button>

        <button
          className={`${styles.controlBtn} ${physicsRunning ? styles.activeBtn : ''}`}
          onClick={() => setPhysicsRunning(!physicsRunning)}
          title={physicsRunning ? 'Pause 3D Physics' : 'Resume 3D Physics'}
        >
          {physicsRunning ? <Pause size={15} /> : <Play size={15} />}
          <span>Physics</span>
        </button>

        <button
          className={styles.controlBtn}
          onClick={handleZoomIn}
          title="Zoom In"
        >
          <ZoomIn size={15} />
        </button>

        <button
          className={styles.controlBtn}
          onClick={handleZoomOut}
          title="Zoom Out"
        >
          <ZoomOut size={15} />
        </button>

        <button
          className={styles.controlBtn}
          onClick={handleResetCamera}
          title="Reset 3D Camera View"
        >
          <RotateCcw size={15} />
        </button>
      </div>

      {/* Live 3D Hover Tooltip */}
      {tooltipPos.visible && hoveredNode && (
        <div
          className={styles.hoverTooltip3D}
          style={{
            left: `${tooltipPos.x + 16}px`,
            top: `${tooltipPos.y - 12}px`
          }}
        >
          <div className={styles.tooltipHeader}>
            <span
              className={styles.tooltipDot}
              style={{ background: (PALETTE[hoveredNode.group] || PALETTE.Default).color }}
            />
            <span className={styles.tooltipType}>{hoveredNode.group}</span>
          </div>
          <div className={styles.tooltipTitle}>{hoveredNode.label || hoveredNode.id}</div>
          {hoveredNode.properties && Object.keys(hoveredNode.properties).length > 0 && (
            <div className={styles.tooltipProps}>
              {Object.entries(hoveredNode.properties).slice(0, 4).map(([k, v]) => (
                <div key={k} className={styles.tooltipRow}>
                  <span className={styles.propKey}>{k.replace(/_/g, ' ')}:</span>
                  <span className={styles.propVal}>{String(v)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* HUD 3D Cosmos Stats */}
      <div className={styles.universeStats}>
        <div className={styles.statItem}>
          <Sparkles size={12} className={styles.goldText} />
          <span>3D WebGL Tree Engine</span>
        </div>
        <div className={styles.statDivider}>&bull;</div>
        <div className={styles.statItem}>
          <span>{filteredNodes.length} Nodes</span>
        </div>
        <div className={styles.statDivider}>&bull;</div>
        <div className={styles.statItem}>
          <span>{filteredEdges.length} Edges</span>
        </div>
      </div>
    </div>
  );
}
