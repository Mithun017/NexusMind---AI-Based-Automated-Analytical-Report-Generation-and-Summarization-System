import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Zap,
  UploadCloud,
  Sliders,
  Play,
  RotateCcw,
  Sparkles,
  Cpu,
  FileCheck2,
  LineChart,
  Network,
  FileText,
  Activity,
  CheckCircle2,
  Gauge,
  Flame,
  Droplets,
  Layers,
  ArrowRight,
  FileSpreadsheet,
  Check,
  AlertCircle,
  X,
  Radio,
  Disc,
  Waves,
  Table as TableIcon
} from 'lucide-react';
import { uploadFile } from '../../api/upload';
import { runAnalysis } from '../../api/analysis';
import styles from './HomePage.module.css';

const PRESETS = [
  {
    name: 'USP Standard QC',
    desc: 'Nominal purity (99.4%) with standard retention and baseline USP resolution',
    params: { volume: 20, flow: 1.0, temp: 35, impurity: 2, noise: 0.003, pressure: 135, wavelength: 254 },
  },
  {
    name: 'Degradation Study',
    desc: 'Elevated impurity spike (14%) with peak tailing drift',
    params: { volume: 45, flow: 0.8, temp: 45, impurity: 14, noise: 0.015, pressure: 220, wavelength: 280 },
  },
  {
    name: 'Fast Screening',
    desc: 'High flow rate (1.8 mL/min) with narrow peak separation',
    params: { volume: 15, flow: 1.8, temp: 50, impurity: 4, noise: 0.005, pressure: 310, wavelength: 230 },
  },
];

const PIPELINE_STEPS = [
  { id: 1, label: 'Validate', icon: FileCheck2, desc: 'ChemStation integrity & schema' },
  { id: 2, label: 'Preprocess', icon: Cpu, desc: 'Baseline smoothing & decimation' },
  { id: 3, label: 'Analytics', icon: LineChart, desc: 'Retention times & USP resolution' },
  { id: 4, label: 'ML Anomaly', icon: Sparkles, desc: 'Isolation Forest outlier scoring' },
  { id: 5, label: 'Knowledge Graph', icon: Network, desc: 'Neo4j entity graph mapping' },
  { id: 6, label: 'PDF Report', icon: FileText, desc: '21 CFR Part 11 PDF compilation' },
];

export default function HomePage() {
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0); // 0 = idle, 1..6 = active/done
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Manual File Upload & Raw Ingestion State
  const [selectedFile, setSelectedFile] = useState(null);
  const [rawHeaders, setRawHeaders] = useState([]);
  const [rawRows, setRawRows] = useState([]);
  const [dragActive, setDragActive] = useState(false);

  // Volume Bar Parameters (Image 2 Aesthetic - 7 Distinct Parameters)
  const [injVolume, setInjVolume] = useState(25);          // 5 to 100 uL
  const [flowRate, setFlowRate] = useState(1.0);           // 0.4 to 2.5 mL/min
  const [columnTemp, setColumnTemp] = useState(40);        // 20 to 65 °C
  const [impurityRatio, setImpurityRatio] = useState(6);   // 0 to 20 %
  const [noiseLevel, setNoiseLevel] = useState(0.005);     // 0.001 to 0.040 mAU
  const [columnPressure, setColumnPressure] = useState(145); // 50 to 400 bar
  const [wavelength, setWavelength] = useState(254);       // 200 to 400 nm

  const handleApplyPreset = (preset) => {
    setInjVolume(preset.params.volume);
    setFlowRate(preset.params.flow);
    setColumnTemp(preset.params.temp);
    setImpurityRatio(preset.params.impurity);
    setNoiseLevel(preset.params.noise);
    if (preset.params.pressure) setColumnPressure(preset.params.pressure);
    if (preset.params.wavelength) setWavelength(preset.params.wavelength);
  };

  const handleResetSliders = () => {
    setInjVolume(25);
    setFlowRate(1.0);
    setColumnTemp(40);
    setImpurityRatio(6);
    setNoiseLevel(0.005);
    setColumnPressure(145);
    setWavelength(254);
  };

  // Parse CSV file content for real-time in-card preview and parameter binding
  const parseFilePreview = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length > 0) {
          const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
          const parsed = lines.slice(1).map(line => {
            return line.split(',').map(cell => cell.trim().replace(/^"|"$/g, ''));
          });
          setRawHeaders(headers);
          setRawRows(parsed);
        }
      } catch (err) {
        console.warn('Failed to parse file preview:', err);
      }
    };
    reader.readAsText(file);
  };

  // Dynamically compute modulated preview rows based on current faders
  const modulatedPreviewRows = useMemo(() => {
    if (!rawRows || rawRows.length === 0) return [];
    
    const trIdx = rawHeaders.findIndex(h => h.toLowerCase().includes('retention'));
    const areaIdx = rawHeaders.findIndex(h => h.toLowerCase().includes('area'));
    const heightIdx = rawHeaders.findIndex(h => h.toLowerCase().includes('height'));
    const intensityIdx = rawHeaders.findIndex(h => h.toLowerCase().includes('intensity'));
    const concIdx = rawHeaders.findIndex(h => h.toLowerCase().includes('concentration'));
    const compoundIdx = rawHeaders.findIndex(h => h.toLowerCase().includes('compound'));

    return rawRows.map((row) => {
      const newRow = [...row];
      // Modulate retention time inversely with flow rate
      if (trIdx !== -1 && !isNaN(parseFloat(row[trIdx]))) {
        newRow[trIdx] = (parseFloat(row[trIdx]) / flowRate).toFixed(2);
      }
      // Scale peak area by injection volume
      if (areaIdx !== -1 && !isNaN(parseFloat(row[areaIdx]))) {
        newRow[areaIdx] = (parseFloat(row[areaIdx]) * (injVolume / 25)).toFixed(1);
      }
      // Scale peak height by injection volume
      if (heightIdx !== -1 && !isNaN(parseFloat(row[heightIdx]))) {
        newRow[heightIdx] = (parseFloat(row[heightIdx]) * (injVolume / 25)).toFixed(1);
      }
      // Modulate intensity with injection scale + detector noise
      if (intensityIdx !== -1 && !isNaN(parseFloat(row[intensityIdx]))) {
        const noise = (noiseLevel * 100);
        newRow[intensityIdx] = Math.max(10, (parseFloat(row[intensityIdx]) * (injVolume / 25)) + noise).toFixed(1);
      }
      // Impurity modulation
      if (concIdx !== -1 && compoundIdx !== -1 && row[compoundIdx] && row[compoundIdx].toLowerCase().includes('impurity')) {
        newRow[concIdx] = (impurityRatio * 0.005 + 0.001).toFixed(4);
      }
      return newRow;
    });
  }, [rawRows, rawHeaders, flowRate, injVolume, noiseLevel, impurityRatio]);

  // Animate pipeline execution across 6 steps with glowing state transitions
  const executePipelineWithProgress = async (uploadRes) => {
    setErrorMessage('');
    
    // Step 1: Validate
    setCurrentStep(1);
    setStatusMessage('Step 1/6: Validating chromatography dataset headers & integrity...');
    await new Promise(r => setTimeout(r, 450));

    // Step 2: Preprocess
    setCurrentStep(2);
    setStatusMessage('Step 2/6: Preprocessing chromatographic signals, noise reduction & baseline correction...');
    await new Promise(r => setTimeout(r, 450));

    // Step 3: Analytics
    setCurrentStep(3);
    setStatusMessage('Step 3/6: Extracting deterministic peak KPIs, retention times & USP resolution...');
    
    // Trigger actual analysis backend API call
    const analysisPromise = runAnalysis(uploadRes.upload_id);
    
    await new Promise(r => setTimeout(r, 500));

    // Step 4: ML Anomaly
    setCurrentStep(4);
    setStatusMessage('Step 4/6: Executing Isolation Forest ML anomaly scoring & outlier detection...');
    await new Promise(r => setTimeout(r, 500));

    // Step 5: Knowledge Graph
    setCurrentStep(5);
    setStatusMessage('Step 5/6: Linking chromatographic entities to Neo4j Analytical Knowledge Graph...');
    await new Promise(r => setTimeout(r, 500));

    // Step 6: PDF Report
    setCurrentStep(6);
    setStatusMessage('Step 6/6: Synthesizing compliance summary & 21 CFR Part 11 PDF report...');
    
    const analysisRes = await analysisPromise;
    await new Promise(r => setTimeout(r, 600));

    // Complete & Navigate
    navigate(`/dashboard/${analysisRes.analysis_id}`);
  };

  // Unified Joint Execution: Combines File Dataset + Physical Chromatographic Faders
  const handleExecuteCombinedAnalysis = async () => {
    setProcessing(true);
    setErrorMessage('');

    try {
      let csvContent = '';
      const timestamp = Date.now();
      let filename = '';

      if (selectedFile && rawHeaders.length > 0 && modulatedPreviewRows.length > 0) {
        // 1. Build CSV from uploaded dataset modulated by the live faders
        csvContent = rawHeaders.join(',') + '\n';
        modulatedPreviewRows.forEach(row => {
          csvContent += row.join(',') + '\n';
        });
        filename = `Ingested_${selectedFile.name.replace(/\.[^/.]+$/, "")}_Vol${injVolume}uL_Flow${flowRate.toFixed(1)}_${timestamp}.csv`;
      } else {
        // 2. Synthesize complete standard analytical dataset from current faders
        csvContent = 'Sample ID,Retention Time,Peak Area,Peak Height,Intensity,Concentration,Compound Name,Analysis Type\n';
        const compounds = [
          { name: 'Uracil (Void Marker)', tr: 1.25 / flowRate, area: 12450 * (injVolume / 25), height: 3200 * (injVolume / 25), conc: 0.0125 },
          { name: 'Acetaminophen', tr: 2.80 / flowRate, area: 45800 * (injVolume / 25), height: 8900 * (injVolume / 25), conc: 0.0458 },
          { name: 'Caffeine (Main Peak)', tr: 4.15 / flowRate, area: 89200 * (injVolume / 25), height: 14500 * (injVolume / 25), conc: 0.0892 },
          { name: 'Aspirin', tr: 5.60 / flowRate, area: 23100 * (injVolume / 25), height: 5100 * (injVolume / 25), conc: 0.0231 },
          { name: 'Related Degradant / Impurity', tr: 7.20 / flowRate, area: (impurityRatio * 5500 + 500) * (injVolume / 25), height: (impurityRatio * 900 + 100) * (injVolume / 25), conc: (impurityRatio * 0.005 + 0.001) },
          { name: 'Phenacetin', tr: 8.95 / flowRate, area: 31200 * (injVolume / 25), height: 6400 * (injVolume / 25), conc: 0.0312 },
          { name: 'Salicylic Acid', tr: 10.40 / flowRate, area: 15600 * (injVolume / 25), height: 3800 * (injVolume / 25), conc: 0.0156 },
          { name: 'Chlorpheniramine', tr: 12.10 / flowRate, area: 54200 * (injVolume / 25), height: 9800 * (injVolume / 25), conc: 0.0542 }
        ];

        compounds.forEach((comp) => {
          const noise = (Math.random() - 0.5) * noiseLevel * 1000;
          const finalIntensity = Math.max(10, comp.height + noise);
          csvContent += `SMP-001,${comp.tr.toFixed(2)},${comp.area.toFixed(1)},${comp.height.toFixed(1)},${finalIntensity.toFixed(1)},${comp.conc.toFixed(4)},${comp.name},HPLC-UV/Vis\n`;
        });
        filename = `Simulated_Run_Vol${injVolume}uL_Flow${flowRate.toFixed(1)}_${timestamp}.csv`;
      }

      // Package file blob
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const fileToUpload = new File([blob], filename, { type: 'text/csv' });

      // Upload and trigger animated 6-phase analytical pipeline
      const uploadRes = await uploadFile(fileToUpload);
      await executePipelineWithProgress(uploadRes);

    } catch (err) {
      setErrorMessage(err.message || 'Analytical pipeline execution failed.');
      setProcessing(false);
      setCurrentStep(0);
    }
  };

  // File Drag & Select Handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const name = file.name.toLowerCase();
      if (name.endsWith('.csv') || name.endsWith('.xlsx')) {
        setSelectedFile(file);
        parseFilePreview(file);
      } else {
        setErrorMessage('Unsupported format. Please select a .csv or .xlsx dataset.');
      }
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      parseFilePreview(file);
    }
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setRawHeaders([]);
    setRawRows([]);
  };

  return (
    <div className={styles.page}>
      {/* Studio Header Bar */}
      <div className={styles.topHeader}>
        <div className={styles.headerBadge}>
          <Sparkles size={14} />
          <span>Core Analytical Studio</span>
        </div>
        <p className={styles.headerDesc}>
          Simulate synthetic runs via tactile parameter faders and ingest real instrument chromatograms with live fader coupling.
        </p>
      </div>

      {/* Main Single Page Unified Grid */}
      <div className={styles.unifiedGrid}>
        {/* Left Column: Parameter Faders Simulator (7 Faders) */}
        <div className={styles.simulatorCard}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitleGroup}>
              <Sliders size={18} className={styles.goldIcon} />
              <div>
                <h2 className={styles.cardTitle}>Chromatographic Parameter Faders</h2>
                <span className={styles.cardSubtitle}>
                  {selectedFile ? 'Dynamic parameters actively applied to dataset' : 'Dial in physical kinetics & instrument parameters'}
                </span>
              </div>
            </div>

            {/* Quick Presets */}
            <div className={styles.presetsRow}>
              {PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleApplyPreset(p)}
                  className={styles.presetChip}
                  title={p.desc}
                  type="button"
                >
                  <Sparkles size={11} />
                  <span>{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Compact Tactile Volume Bars (Image 2 Aesthetic - 7 Parameters) */}
          <div className={styles.volumeBarsContainer}>
            {/* 1: Injection Volume */}
            <div className={styles.volumeRow}>
              <div className={styles.volumeLabelBox}>
                <Droplets size={14} className={styles.paramIcon} />
                <span className={styles.paramName}>Injection Volume</span>
                <span className={styles.paramValueDisplay}>{injVolume} &mu;L</span>
              </div>
              <div className={styles.volumeTrackWrapper}>
                <div className={styles.recessedTrack}>
                  <div
                    className={styles.activeFill}
                    style={{ width: `${((injVolume - 5) / 95) * 100}%` }}
                  />
                  <input
                    type="range"
                    min="5"
                    max="100"
                    step="1"
                    value={injVolume}
                    onChange={(e) => setInjVolume(parseInt(e.target.value))}
                    className={styles.tactileInput}
                    disabled={processing}
                  />
                </div>
              </div>
            </div>

            {/* 2: Flow Rate */}
            <div className={styles.volumeRow}>
              <div className={styles.volumeLabelBox}>
                <Gauge size={14} className={styles.paramIcon} />
                <span className={styles.paramName}>Flow Rate (F)</span>
                <span className={styles.paramValueDisplay}>{flowRate.toFixed(2)} mL/min</span>
              </div>
              <div className={styles.volumeTrackWrapper}>
                <div className={styles.recessedTrack}>
                  <div
                    className={styles.activeFill}
                    style={{ width: `${((flowRate - 0.4) / 2.1) * 100}%` }}
                  />
                  <input
                    type="range"
                    min="0.4"
                    max="2.5"
                    step="0.05"
                    value={flowRate}
                    onChange={(e) => setFlowRate(parseFloat(e.target.value))}
                    className={styles.tactileInput}
                    disabled={processing}
                  />
                </div>
              </div>
            </div>

            {/* 3: Oven Temperature */}
            <div className={styles.volumeRow}>
              <div className={styles.volumeLabelBox}>
                <Flame size={14} className={styles.paramIcon} />
                <span className={styles.paramName}>Oven Temperature</span>
                <span className={styles.paramValueDisplay}>{columnTemp} &deg;C</span>
              </div>
              <div className={styles.volumeTrackWrapper}>
                <div className={styles.recessedTrack}>
                  <div
                    className={styles.activeFill}
                    style={{ width: `${((columnTemp - 20) / 45) * 100}%` }}
                  />
                  <input
                    type="range"
                    min="20"
                    max="65"
                    step="1"
                    value={columnTemp}
                    onChange={(e) => setColumnTemp(parseInt(e.target.value))}
                    className={styles.tactileInput}
                    disabled={processing}
                  />
                </div>
              </div>
            </div>

            {/* 4: Impurity Spike Ratio */}
            <div className={styles.volumeRow}>
              <div className={styles.volumeLabelBox}>
                <Activity size={14} className={styles.paramIcon} />
                <span className={styles.paramName}>Impurity Spike</span>
                <span className={styles.paramValueDisplay}>{impurityRatio}% Ratio</span>
              </div>
              <div className={styles.volumeTrackWrapper}>
                <div className={styles.recessedTrack}>
                  <div
                    className={styles.activeFill}
                    style={{
                      width: `${(impurityRatio / 20) * 100}%`,
                      background: impurityRatio > 10 ? 'linear-gradient(90deg, #f59e0b, #ef4444)' : undefined,
                    }}
                  />
                  <input
                    type="range"
                    min="0"
                    max="20"
                    step="1"
                    value={impurityRatio}
                    onChange={(e) => setImpurityRatio(parseInt(e.target.value))}
                    className={styles.tactileInput}
                    disabled={processing}
                  />
                </div>
              </div>
            </div>

            {/* 5: Detector Baseline Noise */}
            <div className={styles.volumeRow}>
              <div className={styles.volumeLabelBox}>
                <Layers size={14} className={styles.paramIcon} />
                <span className={styles.paramName}>Baseline Noise (&sigma;)</span>
                <span className={styles.paramValueDisplay}>{(noiseLevel * 1000).toFixed(1)} &mu;AU</span>
              </div>
              <div className={styles.volumeTrackWrapper}>
                <div className={styles.recessedTrack}>
                  <div
                    className={styles.activeFill}
                    style={{ width: `${((noiseLevel - 0.001) / 0.039) * 100}%` }}
                  />
                  <input
                    type="range"
                    min="0.001"
                    max="0.040"
                    step="0.001"
                    value={noiseLevel}
                    onChange={(e) => setNoiseLevel(parseFloat(e.target.value))}
                    className={styles.tactileInput}
                    disabled={processing}
                  />
                </div>
              </div>
            </div>

            {/* 6: Column Backpressure (NEW) */}
            <div className={styles.volumeRow}>
              <div className={styles.volumeLabelBox}>
                <Disc size={14} className={styles.paramIcon} />
                <span className={styles.paramName}>Column Pressure (&Delta;P)</span>
                <span className={styles.paramValueDisplay}>{columnPressure} bar</span>
              </div>
              <div className={styles.volumeTrackWrapper}>
                <div className={styles.recessedTrack}>
                  <div
                    className={styles.activeFill}
                    style={{ width: `${((columnPressure - 50) / 350) * 100}%` }}
                  />
                  <input
                    type="range"
                    min="50"
                    max="400"
                    step="5"
                    value={columnPressure}
                    onChange={(e) => setColumnPressure(parseInt(e.target.value))}
                    className={styles.tactileInput}
                    disabled={processing}
                  />
                </div>
              </div>
            </div>

            {/* 7: Detector Wavelength (NEW) */}
            <div className={styles.volumeRow}>
              <div className={styles.volumeLabelBox}>
                <Radio size={14} className={styles.paramIcon} />
                <span className={styles.paramName}>Detector Wavelength (&lambda;)</span>
                <span className={styles.paramValueDisplay}>{wavelength} nm</span>
              </div>
              <div className={styles.volumeTrackWrapper}>
                <div className={styles.recessedTrack}>
                  <div
                    className={styles.activeFill}
                    style={{ width: `${((wavelength - 200) / 200) * 100}%` }}
                  />
                  <input
                    type="range"
                    min="200"
                    max="400"
                    step="2"
                    value={wavelength}
                    onChange={(e) => setWavelength(parseInt(e.target.value))}
                    className={styles.tactileInput}
                    disabled={processing}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Ingest File Dropzone / Interactive Data Preview */}
        <div className={styles.uploadCard}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitleGroup}>
              <UploadCloud size={18} className={styles.goldIcon} />
              <div>
                <h2 className={styles.cardTitle}>Manual File Ingestion</h2>
                <span className={styles.cardSubtitle}>
                  {selectedFile ? 'Parsed Dataset (Live Parameters Applied)' : 'Raw instrument exports (.csv / .xlsx)'}
                </span>
              </div>
            </div>
            {selectedFile && (
              <button
                onClick={handleClearFile}
                className={styles.iconCloseBtn}
                title="Remove and select different file"
                type="button"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {!selectedFile ? (
            <div
              className={`${styles.dropzone} ${dragActive ? styles.dropzoneActive : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => document.getElementById('studioFileInput')?.click()}
            >
              <input
                id="studioFileInput"
                type="file"
                accept=".csv, .xlsx"
                onChange={handleFileInputChange}
                style={{ display: 'none' }}
              />
              <div className={styles.uploadIconCircle}>
                <UploadCloud size={24} />
              </div>
              <p className={styles.dropMainText}>Drop your Analytical Dataset here</p>
              <p className={styles.dropSubText}>or click to browse local files</p>
              <div className={styles.formatBadges}>
                <span className={styles.badge}>.CSV</span>
                <span className={styles.badge}>.XLSX</span>
              </div>
            </div>
          ) : (
            <div className={styles.selectedFileContainer}>
              {/* File Info Bar */}
              <div className={styles.selectedFileInfo}>
                <div className={styles.fileIconBadge}>
                  <FileSpreadsheet size={16} />
                </div>
                <div className={styles.fileDetails}>
                  <span className={styles.fileName}>{selectedFile.name}</span>
                  <span className={styles.fileSize}>
                    {(selectedFile.size / 1024).toFixed(1)} KB &bull; {rawRows.length} rows &bull; <strong className={styles.activePillHighlight}>Parameters Synced</strong>
                  </span>
                </div>
              </div>

              {/* Live Interactive Data Table Preview Modulated by Faders */}
              <div className={styles.previewTableWrapper}>
                {rawHeaders.length > 0 && modulatedPreviewRows.length > 0 ? (
                  <div className={styles.tableScroll}>
                    <table className={styles.previewTable}>
                      <thead>
                        <tr>
                          {rawHeaders.map((h, i) => (
                            <th key={i}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {modulatedPreviewRows.map((row, rIdx) => (
                          <tr key={rIdx}>
                            {row.map((cell, cIdx) => (
                              <td key={cIdx}>{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className={styles.tablePlaceholder}>
                    <TableIcon size={20} className={styles.goldIcon} />
                    <span>Dataset structured & formatted for validation</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error Banner if any */}
      {errorMessage && (
        <div className={styles.errorBanner}>
          <AlertCircle size={16} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Unified Single Action Master Execution Bar (Combined Execute Button) */}
      <div className={styles.masterActionBar}>
        <div className={styles.modeSummaryBadge}>
          {selectedFile ? (
            <>
              <FileSpreadsheet size={15} className={styles.goldIcon} />
              <span>
                Ingesting: <strong>{selectedFile.name}</strong> + Modulating with <strong>{injVolume}&mu;L, {flowRate.toFixed(2)}mL/min, {columnTemp}&deg;C, {columnPressure} bar, {wavelength} nm</strong>
              </span>
            </>
          ) : (
            <>
              <Sliders size={15} className={styles.goldIcon} />
              <span>
                Synthetic Run: <strong>{injVolume}&mu;L, {flowRate.toFixed(2)}mL/min, {columnTemp}&deg;C, {columnPressure} bar, {wavelength} nm</strong>
              </span>
            </>
          )}
        </div>

        <div className={styles.masterBtnGroup}>
          <button
            onClick={handleResetSliders}
            className={styles.resetBtn}
            type="button"
            disabled={processing}
            title="Reset parameters to standard QC defaults"
          >
            <RotateCcw size={13} /> Reset Parameters
          </button>

          <button
            onClick={handleExecuteCombinedAnalysis}
            disabled={processing}
            className={styles.masterExecBtn}
            type="button"
          >
            {processing ? (
              <>
                <Activity size={16} className={styles.spin} />
                <span>Processing Combined Pipeline...</span>
              </>
            ) : (
              <>
                <Play size={16} />
                <span>
                  {selectedFile
                    ? 'Analyze Ingested Dataset & Fader Parameters'
                    : 'Simulate & Execute Analytical Run'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Pulled-Down 6-Step Analytical Pipeline Stepper (Docked at Bottom) */}
      <div className={styles.pipelineCard}>
        <div className={styles.pipelineHeader}>
          <div className={styles.pipelineStatusBadge}>
            <Activity size={14} className={processing ? styles.spin : ''} />
            <span>
              {processing ? statusMessage : '6-Phase End-to-End Analytical Pipeline Engine'}
            </span>
          </div>
          <span className={styles.activePhaseCount}>
            {currentStep > 0 ? `Stage ${currentStep} of 6` : 'Ready to ingest'}
          </span>
        </div>

        {/* Steps Track with Progress Beam */}
        <div className={styles.stepsTrack}>
          {/* Background and active glowing connection line */}
          <div className={styles.connectingLineBg} />
          <div
            className={styles.connectingLineActive}
            style={{
              width: currentStep === 0 ? '0%' : `${((currentStep - 1) / 5) * 100}%`,
            }}
          />

          {PIPELINE_STEPS.map((step) => {
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;
            const isPending = currentStep < step.id;
            const StepIcon = step.icon;

            return (
              <div
                key={step.id}
                className={`${styles.stepNode} ${
                  isCurrent ? styles.stepNodeActive : ''
                } ${isCompleted ? styles.stepNodeCompleted : ''} ${
                  isPending ? styles.stepNodePending : ''
                }`}
              >
                <div className={styles.stepIconCircle}>
                  {isCompleted ? (
                    <Check size={16} className={styles.checkIcon} />
                  ) : (
                    <StepIcon size={16} className={isCurrent ? styles.activePulseIcon : ''} />
                  )}
                  {isCurrent && <div className={styles.glowHalo} />}
                </div>
                <div className={styles.stepLabels}>
                  <span className={styles.stepTitle}>
                    {step.id}. {step.label}
                  </span>
                  <span className={styles.stepDesc}>{step.desc}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}