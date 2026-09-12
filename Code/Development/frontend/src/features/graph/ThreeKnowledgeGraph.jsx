import React, { useRef, useEffect, useState, useCallback } from 'react';
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
  Eye,
  Info,
  Activity
} from 'lucide-react';
import styles from './GraphVisualization.module.css';

// Luxury Chromatic Color Mapping for 3D Nodes
const PALETTE = {
  Sample: { hex: 0xd4af37, color: '#d4af37', emissive: 0x5a4510, glow: 'rgba(212, 175, 55, 0.6)', radius: 9 },
  Compound: { hex: 0x10b981, color: '#10b981', emissive: 0x064e3b, glow: 'rgba(16, 185, 129, 0.6)', radius: 7 },
  Peak: { hex: 0xc5a059, color: '#c5a059', emissive: 0x4a3b1a, glow: 'rgba(197, 160, 89, 0.5)', radius: 5.5 },
  AnomalyPeak: { hex: 0xef4444, color: '#ef4444', emissive: 0x7f1d1d, glow: 'rgba(239, 68, 68, 0.8)', radius: 7 },
  Anomaly: { hex: 0xf43f5e, color: '#f43f5e', emissive: 0x881337, glow: 'rgba(244, 63, 94, 0.8)', radius: 6.5 },
  Instrument: { hex: 0x06b6d4, color: '#06b6d4', emissive: 0x164e63, glow: 'rgba(6, 182, 212, 0.6)', radius: 7.5 },
  Batch: { hex: 0xf59e0b, color: '#f59e0b', emissive: 0x78350f, glow: 'rgba(245, 158, 11, 0.6)', radius: 7 },
  RetentionTime: { hex: 0xeedbbb, color: '#eedbbb', emissive: 0x4a4030, glow: 'rgba(238, 219, 187, 0.4)', radius: 4.5 },
  Finding: { hex: 0xa855f7, color: '#a855f7', emissive: 0x581c87, glow: 'rgba(168, 85, 247, 0.6)', radius: 5 },
  Default: { hex: 0x94a3b8, color: '#94a3b8', emissive: 0x334155, glow: 'rgba(148, 163, 184, 0.4)', radius: 5 }
};

export default function ThreeKnowledgeGraph({
  nodes = [],
  edges = [],
  onSelectNode,
  selectedNodeId,
  searchTerm = '',
  typeFilter = 'ALL',
  layoutMode = 'force' // 'force', 'sphere', 'helix', 'layered'
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
  const sphericalRef = useRef({ radius: 380, theta: 0.8, phi: 1.1 });

  // Filter nodes based on active filter and search term
  const filteredNodes = React.useMemo(() => {
    return nodes.filter(node => {
      const matchType = typeFilter === 'ALL' || node.group === typeFilter || (typeFilter === 'Anomaly' && (node.group === 'Anomaly' || node.group === 'AnomalyPeak' || node.properties?.is_anomaly));
      const matchSearch = !searchTerm || (node.label && node.label.toLowerCase().includes(searchTerm.toLowerCase())) || (node.id && node.id.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchType && matchSearch;
    });
  }, [nodes, typeFilter, searchTerm]);

  const filteredNodeIds = React.useMemo(() => new Set(filteredNodes.map(n => n.id)), [filteredNodes]);

  const filteredEdges = React.useMemo(() => {
    return edges.filter(e => {
      const srcId = typeof e.source === 'object' ? e.source.id : e.source;
      const tgtId = typeof e.target === 'object' ? e.target.id : e.target;
      return filteredNodeIds.has(srcId) && filteredNodeIds.has(tgtId);
    });
  }, [edges, filteredNodeIds]);

  // Create Text Sprite for 3D Billboards
  const createTextSprite = (text, color = '#ffffff') => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.font = 'bold 22px "Outfit", "Segoe UI", sans-serif';
    ctx.fillStyle = 'rgba(12, 10, 7, 0.75)';
    ctx.roundRect(4, 4, 248, 56, 12);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text.length > 16 ? text.substring(0, 15) + '...' : text, 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.88, depthWrite: false });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(32, 8, 1);
    return sprite;
  };

  // Initialize Three.js WebGL Scene
  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.fog = new THREE.FogExp2(0x060503, 0.0012);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 3000);
    cameraRef.current = camera;
    updateCameraPosition();

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const goldPointLight = new THREE.PointLight(0xd4af37, 2.5, 800);
    goldPointLight.position.set(100, 150, 200);
    scene.add(goldPointLight);

    const cyanPointLight = new THREE.PointLight(0x06b6d4, 2.0, 800);
    cyanPointLight.position.set(-150, -100, -150);
    scene.add(cyanPointLight);

    // 5. Starfield Dust Particles
    const dustCount = 400;
    const dustGeometry = new THREE.BufferGeometry();
    const dustPositions = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount * 3; i += 3) {
      dustPositions[i] = (Math.random() - 0.5) * 1200;
      dustPositions[i + 1] = (Math.random() - 0.5) * 1200;
      dustPositions[i + 2] = (Math.random() - 0.5) * 1200;
    }
    dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    const dustMaterial = new THREE.PointsMaterial({
      color: 0xeedbbb,
      size: 2.2,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending
    });
    const dustPoints = new THREE.Points(dustGeometry, dustMaterial);
    scene.add(dustPoints);

    // 6. Handle Window Resize
    const handleResize = () => {
      if (!containerRef.current || !renderer || !camera) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (rendererRef.current && rendererRef.current.domElement) {
        rendererRef.current.dispose();
      }
    };
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

  // Initialize and Build 3D Entities from Nodes and Edges
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Clean up previous nodes and lines
    nodeMeshesRef.current.forEach((item) => {
      scene.remove(item.mesh);
      if (item.sprite) scene.remove(item.sprite);
      if (item.glowMesh) scene.remove(item.glowMesh);
    });
    nodeMeshesRef.current.clear();

    linkLinesRef.current.forEach(line => scene.remove(line));
    linkLinesRef.current = [];

    pulseParticlesRef.current.forEach(p => scene.remove(p.mesh));
    pulseParticlesRef.current = [];

    if (filteredNodes.length === 0) return;

    // Create Simulation Node Objects
    const simNodes = filteredNodes.map((n, i) => {
      let x = 0, y = 0, z = 0;
      if (layoutMode === 'sphere') {
        const phi = Math.acos(-1 + (2 * i) / filteredNodes.length);
        const theta = Math.sqrt(filteredNodes.length * Math.PI) * phi;
        const rad = n.group === 'Sample' ? 30 : n.group === 'Compound' ? 90 : 150;
        x = rad * Math.cos(theta) * Math.sin(phi);
        y = rad * Math.sin(theta) * Math.sin(phi);
        z = rad * Math.cos(phi);
      } else if (layoutMode === 'helix') {
        const t = (i - filteredNodes.length / 2) * 12;
        const rad = 70;
        x = rad * Math.cos(i * 0.45);
        z = rad * Math.sin(i * 0.45);
        y = t;
      } else if (layoutMode === 'layered') {
        const levels = { Sample: 120, Batch: 120, Instrument: 80, Compound: 30, Peak: -40, AnomalyPeak: -40, RetentionTime: -100, Anomaly: -100, Finding: -140 };
        y = levels[n.group] || 0;
        const angle = (i % 8) * (Math.PI / 4) + (Math.floor(i / 8) * 0.2);
        const radius = 50 + (i % 5) * 22;
        x = Math.cos(angle) * radius;
        z = Math.sin(angle) * radius;
      } else {
        // Force initial spread
        x = (Math.random() - 0.5) * 200;
        y = (Math.random() - 0.5) * 200;
        z = (Math.random() - 0.5) * 200;
      }

      return {
        id: n.id,
        raw: n,
        x, y, z,
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

      // 1. Core Sphere Mesh
      const geometry = new THREE.SphereGeometry(node.radius, 24, 24);
      const material = new THREE.MeshStandardMaterial({
        color: p.hex,
        emissive: isAnomaly ? 0xff2222 : (isSelected ? 0xffffff : p.emissive),
        emissiveIntensity: isSelected ? 0.9 : (isAnomaly ? 0.7 : 0.4),
        roughness: 0.2,
        metalness: 0.8
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(node.x, node.y, node.z);
      mesh.userData = { nodeId: node.id, nodeData: node.raw };
      scene.add(mesh);

      // 2. Halo Glow Outer Mesh
      const haloGeo = new THREE.SphereGeometry(node.radius * 1.35, 16, 16);
      const haloMat = new THREE.MeshBasicMaterial({
        color: p.hex,
        transparent: true,
        opacity: isSelected ? 0.45 : (isAnomaly ? 0.35 : 0.18),
        wireframe: true
      });
      const glowMesh = new THREE.Mesh(haloGeo, haloMat);
      glowMesh.position.copy(mesh.position);
      scene.add(glowMesh);

      // 3. Billboard Text Label Sprite
      const sprite = createTextSprite(node.raw.label || node.id, p.color);
      sprite.position.set(node.x, node.y + node.radius + 8, node.z);
      scene.add(sprite);

      nodeMeshesRef.current.set(node.id, { mesh, glowMesh, sprite, simNode: node, palette: p });
    });

    // Create 3D Edges Link Lines
    simEdges.forEach(edge => {
      const src = simNodes[edge.sourceIdx];
      const tgt = simNodes[edge.targetIdx];
      const isAnomalyEdge = edge.relationship === 'HAS_ANOMALY';

      const points = [new THREE.Vector3(src.x, src.y, src.z), new THREE.Vector3(tgt.x, tgt.y, tgt.z)];
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      const lineMat = new THREE.LineBasicMaterial({
        color: isAnomalyEdge ? 0xef4444 : 0xc5a059,
        transparent: true,
        opacity: isAnomalyEdge ? 0.75 : 0.3,
        linewidth: isAnomalyEdge ? 2 : 1
      });
      const line = new THREE.Line(lineGeo, lineMat);
      scene.add(line);
      linkLinesRef.current.push({ line, srcIdx: edge.sourceIdx, tgtIdx: edge.targetIdx, isAnomaly: isAnomalyEdge });

      // Add Travelling Photon Pulse Particle
      const pulseGeo = new THREE.SphereGeometry(1.6, 8, 8);
      const pulseMat = new THREE.MeshBasicMaterial({
        color: isAnomalyEdge ? 0xff7777 : 0xffeebb,
        transparent: true,
        opacity: 0.9
      });
      const pulseMesh = new THREE.Mesh(pulseGeo, pulseMat);
      scene.add(pulseMesh);
      pulseParticlesRef.current.push({
        mesh: pulseMesh,
        srcIdx: edge.sourceIdx,
        tgtIdx: edge.targetIdx,
        progress: Math.random(),
        speed: 0.006 + Math.random() * 0.008
      });
    });

  }, [filteredNodes, filteredEdges, layoutMode, selectedNodeId]);

  // Physics Simulation Step (3D Force Layout)
  const stepPhysics = useCallback(() => {
    if (!physicsRunning && layoutMode !== 'force') return;

    const simNodes = simNodesRef.current;
    const simEdges = simEdgesRef.current;
    if (simNodes.length === 0) return;

    if (layoutMode === 'force') {
      const repulsion = 1400;
      const springLength = 55;
      const springK = 0.035;
      const centerGravity = 0.008;

      // 1. Repulsion between node pairs
      for (let i = 0; i < simNodes.length; i++) {
        for (let j = i + 1; j < simNodes.length; j++) {
          const n1 = simNodes[i];
          const n2 = simNodes[j];
          let dx = n2.x - n1.x;
          let dy = n2.y - n1.y;
          let dz = n2.z - n1.z;
          let distSq = dx * dx + dy * dy + dz * dz;
          if (distSq < 1) distSq = 1;
          const dist = Math.sqrt(distSq);

          if (dist < 280) {
            const force = repulsion / distSq;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            const fz = (dz / dist) * force;

            n1.vx -= fx; n1.vy -= fy; n1.vz -= fz;
            n2.vx += fx; n2.vy += fy; n2.vz += fz;
          }
        }
      }

      // 2. Spring attraction along links
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

      // 3. Center Gravity & Integration with Damping
      const damping = 0.86;
      simNodes.forEach(n => {
        n.vx -= n.x * centerGravity;
        n.vy -= n.y * centerGravity;
        n.vz -= n.z * centerGravity;

        n.vx *= damping;
        n.vy *= damping;
        n.vz *= damping;

        n.x += n.vx;
        n.y += n.vy;
        n.z += n.vz;
      });
    }

    // Update 3D Object Positions
    simNodes.forEach(n => {
      const item = nodeMeshesRef.current.get(n.id);
      if (item) {
        item.mesh.position.set(n.x, n.y, n.z);
        item.glowMesh.position.set(n.x, n.y, n.z);
        item.sprite.position.set(n.x, n.y + n.radius + 8, n.z);
      }
    });

    // Update Edge Lines
    linkLinesRef.current.forEach(link => {
      const n1 = simNodes[link.srcIdx];
      const n2 = simNodes[link.tgtIdx];
      if (n1 && n2 && link.line) {
        const positions = link.line.geometry.attributes.position.array;
        positions[0] = n1.x; positions[1] = n1.y; positions[2] = n1.z;
        positions[3] = n2.x; positions[4] = n2.y; positions[5] = n2.z;
        link.line.geometry.attributes.position.needsUpdate = true;
      }
    });

    // Update Photon Pulse Particles along lines
    pulseParticlesRef.current.forEach(p => {
      const n1 = simNodes[p.srcIdx];
      const n2 = simNodes[p.tgtIdx];
      if (n1 && n2 && p.mesh) {
        p.progress = (p.progress + p.speed) % 1.0;
        p.mesh.position.set(
          n1.x + (n2.x - n1.x) * p.progress,
          n1.y + (n2.y - n1.y) * p.progress,
          n1.z + (n2.z - n1.z) * p.progress
        );
      }
    });
  }, [physicsRunning, layoutMode]);

  // Main Render Animation Loop
  useEffect(() => {
    let lastTime = performance.now();

    const animate = (time) => {
      animFrameRef.current = requestAnimationFrame(animate);

      // Auto-Orbit rotation
      if (autoRotate && !isDraggingRef.current) {
        sphericalRef.current.theta += 0.0025;
        updateCameraPosition();
      }

      // Smooth camera interpolation on fly-to target
      if (cameraDestRef.current) {
        sphericalRef.current.theta += (cameraDestRef.current.theta - sphericalRef.current.theta) * 0.08;
        sphericalRef.current.phi += (cameraDestRef.current.phi - sphericalRef.current.phi) * 0.08;
        sphericalRef.current.radius += (cameraDestRef.current.radius - sphericalRef.current.radius) * 0.08;
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
      const pulseScale = 1.0 + Math.sin(time * 0.005) * 0.12;
      nodeMeshesRef.current.forEach((item) => {
        if (item.simNode.group === 'Anomaly' || item.simNode.group === 'AnomalyPeak') {
          item.glowMesh.scale.set(pulseScale, pulseScale, pulseScale);
        }
      });

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [autoRotate, stepPhysics, updateCameraPosition]);

  // Mouse & Touch 3D Orbit Interaction
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
      // 3D Raycasting for Hover Detection
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
    sphericalRef.current.radius = Math.max(120, Math.min(900, sphericalRef.current.radius + e.deltaY * 0.45));
    updateCameraPosition();
  };

  // Node Click Selection via Raycasting
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

      // Smooth camera orbit to clicked node
      const simNode = simNodesRef.current.find(n => n.id === hitNode.id);
      if (simNode) {
        const dist = Math.sqrt(simNode.x * simNode.x + simNode.z * simNode.z) || 1;
        const targetTheta = Math.atan2(simNode.x, simNode.z);
        const targetPhi = Math.acos(simNode.y / (Math.sqrt(simNode.x * simNode.x + simNode.y * simNode.y + simNode.z * simNode.z) || 1));
        cameraDestRef.current = {
          radius: 280,
          theta: targetTheta,
          phi: Math.max(0.3, Math.min(Math.PI - 0.3, targetPhi))
        };
      }
    }
  };

  const handleResetCamera = () => {
    cameraDestRef.current = { radius: 380, theta: 0.8, phi: 1.1 };
  };

  return (
    <div className={styles.threeCanvasWrapper}>
      {/* 3D WebGL Canvas Viewport */}
      <div
        ref={containerRef}
        className={styles.webglContainer}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onClick={handleClick}
      />

      {/* Floating 3D Interaction Control Dock */}
      <div className={styles.floatingControls}>
        <button
          className={`${styles.controlBtn} ${autoRotate ? styles.activeBtn : ''}`}
          onClick={() => setAutoRotate(!autoRotate)}
          title={autoRotate ? 'Pause 3D Orbit' : 'Enable 3D Auto-Orbit'}
        >
          <Compass size={16} />
          <span>{autoRotate ? 'Orbiting' : 'Orbit'}</span>
        </button>

        <button
          className={`${styles.controlBtn} ${physicsRunning ? styles.activeBtn : ''}`}
          onClick={() => setPhysicsRunning(!physicsRunning)}
          title="Toggle 3D Physics Simulation"
        >
          {physicsRunning ? <Pause size={16} /> : <Play size={16} />}
          <span>Physics</span>
        </button>

        <button
          className={styles.controlBtn}
          onClick={() => {
            sphericalRef.current.radius = Math.max(120, sphericalRef.current.radius - 60);
            updateCameraPosition();
          }}
          title="Zoom In"
        >
          <ZoomIn size={16} />
        </button>

        <button
          className={styles.controlBtn}
          onClick={() => {
            sphericalRef.current.radius = Math.min(900, sphericalRef.current.radius + 60);
            updateCameraPosition();
          }}
          title="Zoom Out"
        >
          <ZoomOut size={16} />
        </button>

        <button className={styles.controlBtn} onClick={handleResetCamera} title="Reset 3D View">
          <RotateCcw size={16} />
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
              {Object.entries(hoveredNode.properties).slice(0, 3).map(([k, v]) => (
                <div key={k} className={styles.tooltipRow}>
                  <span className={styles.propKey}>{k.replace('_', ' ')}:</span>
                  <span className={styles.propVal}>{String(v)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* HUD 3D Universe Stats Badge */}
      <div className={styles.universeStats}>
        <div className={styles.statItem}>
          <Sparkles size={12} className={styles.goldText} />
          <span>3D WebGL Engine</span>
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
