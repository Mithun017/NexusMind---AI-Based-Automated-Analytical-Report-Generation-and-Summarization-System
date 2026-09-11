import React, { useState, useEffect } from 'react';
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
  AlertCircle
} from 'lucide-react';
import { uploadFile } from '../../api/upload';
import { runAnalysis } from '../../api/analysis';
import styles from './HomePage.module.css';

const PRESETS = [
  {
    name: 'USP Standard QC',
    desc: 'Nominal purity (99.4%) with standard retention and baseline USP resolution',
    params: { volume: 20, flow: 1.0, temp: 35, impurity: 2, noise: 0.003 },
  },
  {
    name: 'Degradation Study',
    desc: 'Elevated impurity spike (14%) with peak tailing drift',
    params: { volume: 45, flow: 0.8, temp: 45, impurity: 14, noise: 0.015 },
  },
  {
    name: 'Fast Screening',
    desc: 'High flow rate (1.8 mL/min) with narrow peak separation',
    params: { volume: 15, flow: 1.8, temp: 50, impurity: 4, noise: 0.005 },
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

  // Manual File Upload State
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  // Volume Bar Parameters (Image 2 Aesthetic - Compact Sizing)
  const [injVolume, setInjVolume] = useState(25);      // 5 to 100 uL
  const [flowRate, setFlowRate] = useState(1.0);       // 0.4 to 2.5 mL/min
  const [columnTemp, setColumnTemp] = useState(40);    // 20 to 65 °C
  const [impurityRatio, setImpurityRatio] = useState(6); // 0 to 20 %
  const [noiseLevel, setNoiseLevel] = useState(0.005); // 0.001 to 0.040 mAU

  const handleApplyPreset = (preset) => {
    setInjVolume(preset.params.volume);
    setFlowRate(preset.params.flow);
    setColumnTemp(preset.params.temp);
    setImpurityRatio(preset.params.impurity);
    setNoiseLevel(preset.params.noise);
  };

  const handleResetSliders = () => {
    setInjVolume(25);
    setFlowRate(1.0);
    setColumnTemp(40);
    setImpurityRatio(6);
    setNoiseLevel(0.005);
  };

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

  // 1. Synthetic Simulator Execution
  const handleRunSimulator = async () => {
    setProcessing(true);
    setErrorMessage('');
    try {
      // Synthesize realistic HPLC time series
      const samplingRate = 20;
      const totalTime = 12 / flowRate;
      const numPoints = Math.floor(totalTime * samplingRate);
      
      let csvContent = 'Retention_Time_min,Absorbance_mAU\n';
      
      const peaks = [
        { tr: 2.1 / flowRate, height: 45 * (injVolume / 25), width: 0.18 * (40 / columnTemp) },
        { tr: 4.85 / flowRate, height: 320 * (injVolume / 25), width: 0.22 * (40 / columnTemp) },
        { tr: 6.9 / flowRate, height: (impurityRatio * 18) * (injVolume / 25), width: 0.26 * (40 / columnTemp) },
        { tr: 8.4 / flowRate, height: 22 * (injVolume / 25), width: 0.24 * (40 / columnTemp) },
      ];

      for (let i = 0; i <= numPoints; i++) {
        const t = (i / samplingRate);
        let signal = 0;
        
        peaks.forEach(p => {
          const exponent = -Math.pow(t - p.tr, 2) / (2 * Math.pow(p.width, 2));
          signal += p.height * Math.exp(exponent);
        });

        const randomNoise = (Math.random() - 0.5) * noiseLevel * 200;
        const baselineDrift = 0.05 * t;
        const finalSignal = Math.max(0, signal + baselineDrift + randomNoise);

        csvContent += `${t.toFixed(4)},${finalSignal.toFixed(4)}\n`;
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `Simulated_Run_Vol${injVolume}uL_Flow${flowRate.toFixed(1)}_${timestamp}.csv`;
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const file = new File([blob], filename, { type: 'text/csv' });

      // Ingest synthesized file
      const uploadRes = await uploadFile(file);

      // Run animated pipeline steps
      await executePipelineWithProgress(uploadRes);
    } catch (err) {
      setErrorMessage(err.message || 'Simulation execution encountered an error.');
      setProcessing(false);
      setCurrentStep(0);
    }
  };

  // 2. Manual Upload File Handlers
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
      } else {
        setErrorMessage('Unsupported format. Please select a .csv or .xlsx dataset.');
      }
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
    }
  };

  const handleRunManualUpload = async () => {
    if (!selectedFile) return;
    setProcessing(true);
    setErrorMessage('');
    try {
      const uploadRes = await uploadFile(selectedFile);
      await executePipelineWithProgress(uploadRes);
    } catch (err) {
      setErrorMessage(err.message || 'File ingestion failed.');
      setProcessing(false);
      setCurrentStep(0);
    }
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
          Simulate synthetic runs via tactile parameter faders or ingest real instrument chromatograms in a single unified workspace.
        </p>
      </div>

      {/* Main Single Page Unified Grid */}
      <div className={styles.unifiedGrid}>
        {/* Left Column: Parameter Faders Simulator (Image 2 Sizing Reduced) */}
        <div className={styles.simulatorCard}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitleGroup}>
              <Sliders size={18} className={styles.goldIcon} />
              <div>
                <h2 className={styles.cardTitle}>Chromatographic Parameter Faders</h2>
                <span className={styles.cardSubtitle}>Dial in physical kinetics & instrument parameters</span>
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

          {/* Compact Tactile Volume Bars (Image 2 Aesthetic) */}
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
          </div>

          {/* Simulator Actions */}
          <div className={styles.simActionsRow}>
            <button
              onClick={handleResetSliders}
              className={styles.resetBtn}
              type="button"
              disabled={processing}
            >
              <RotateCcw size={13} /> Reset
            </button>
            <button
              onClick={handleRunSimulator}
              disabled={processing}
              className={styles.runSimBtn}
              type="button"
            >
              <Play size={15} />
              <span>Simulate & Execute Run</span>
            </button>
          </div>
        </div>

        {/* Right Column: Ingest File Dropzone */}
        <div className={styles.uploadCard}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitleGroup}>
              <UploadCloud size={18} className={styles.goldIcon} />
              <div>
                <h2 className={styles.cardTitle}>Manual File Ingestion</h2>
                <span className={styles.cardSubtitle}>Raw instrument exports (.csv / .xlsx)</span>
              </div>
            </div>
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
              <div className={styles.selectedFileInfo}>
                <FileSpreadsheet size={24} className={styles.goldIcon} />
                <div className={styles.fileDetails}>
                  <span className={styles.fileName}>{selectedFile.name}</span>
                  <span className={styles.fileSize}>
                    {(selectedFile.size / 1024).toFixed(1)} KB &bull; Ready for pipeline
                  </span>
                </div>
              </div>
              <div className={styles.fileActions}>
                <button
                  onClick={() => setSelectedFile(null)}
                  className={styles.removeFileBtn}
                  disabled={processing}
                >
                  Change File
                </button>
                <button
                  onClick={handleRunManualUpload}
                  disabled={processing}
                  className={styles.runUploadBtn}
                >
                  <ArrowRight size={15} />
                  <span>Analyze Dataset</span>
                </button>
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

      {/* Glowing 6-Step Analytical Pipeline Progress Stepper (Image 3 Area) */}
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
