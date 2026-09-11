import React, { useState, useRef } from 'react';
import { UploadCloud, FileSpreadsheet, X, ArrowRight, Loader2 } from 'lucide-react';
import { uploadFile } from '../../api/upload';
import styles from './FileUploader.module.css';

export default function FileUploader({ onUploadSuccess, onError }) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSet(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSet(e.target.files[0]);
    }
  };

  const validateAndSet = (file) => {
    const name = file.name.toLowerCase();
    if (!name.endsWith('.csv') && !name.endsWith('.xlsx')) {
      onError?.({
        message: 'Unsupported format. Please upload a CSV (.csv) or modern Excel (.xlsx) file.',
      });
      return;
    }
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const res = await uploadFile(selectedFile);
      onUploadSuccess?.(res);
    } catch (err) {
      onError?.(err);
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className={styles.uploaderContainer}>
      {!selectedFile ? (
        <div
          className={`${styles.dropzone} ${dragActive ? styles.dropzoneActive : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv, .xlsx"
            onChange={handleChange}
            style={{ display: 'none' }}
          />

          <div className={styles.iconWrapper}>
            <UploadCloud size={32} />
          </div>

          <h3 className={styles.title}>Drop your Analytical Dataset here</h3>
          <p className={styles.subtitle}>or click to browse from your device</p>

          <div className={styles.formatBadges}>
            <span className={styles.badge}>.CSV</span>
            <span className={styles.badge}>.XLSX (Modern Excel)</span>
          </div>
        </div>
      ) : (
        <div className={styles.selectedFileCard}>
          <div className={styles.fileInfo}>
            <div className={styles.fileIcon}>
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <div className={styles.fileName}>{selectedFile.name}</div>
              <div className={styles.fileMeta}>{formatFileSize(selectedFile.size)}</div>
            </div>
          </div>

          <button
            className={styles.btnRemove}
            onClick={() => setSelectedFile(null)}
            disabled={uploading}
            aria-label="Remove selected file"
          >
            <X size={20} />
          </button>
        </div>
      )}

      {selectedFile && (
        <button
          className={styles.btnPrimary}
          onClick={handleUpload}
          disabled={uploading}
        >
          {uploading ? (
            <>
              <Loader2 className={styles.spinner} size={20} />
              <span>Validating & Ingesting Dataset...</span>
            </>
          ) : (
            <>
              <span>Validate & Process Pipeline</span>
              <ArrowRight size={18} />
            </>
          )}
        </button>
      )}
    </div>
  );
}
