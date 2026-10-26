import React, { useState, useRef } from 'react';
import { api, ApiError } from '@/lib/apiClient';
import { CadAsset } from '../types';
import { Upload, X, FileCheck, AlertCircle, Loader2 } from 'lucide-react';

interface UploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (asset: CadAsset) => void;
  existingAssetId?: string | null;
  existingAssetName?: string | null;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_EXTENSIONS = ['.stl', '.step', '.stp', '.iges', '.igs'];

export const UploadDialog: React.FC<UploadDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
  existingAssetId,
  existingAssetName,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [units, setUnits] = useState<'mm' | 'inch'>('mm');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelection = (selectedFile: File) => {
    setErrorMessage(null);
    const lowerName = selectedFile.name.toLowerCase();
    const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));

    if (!hasValidExt) {
      setErrorMessage(`Unsupported format. Allowed CAD extensions: ${ALLOWED_EXTENSIONS.join(', ')}`);
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setErrorMessage(`File exceeds 50MB limit (${(selectedFile.size / (1024 * 1024)).toFixed(1)}MB).`);
      return;
    }

    setFile(selectedFile);
    if (!existingAssetId && !name) {
      // Suggest part name from filename
      const baseName = selectedFile.name.replace(/\.[^/.]+$/, '');
      setName(baseName);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setErrorMessage('Please select a CAD file to upload.');
      return;
    }

    if (!existingAssetId && !name.trim()) {
      setErrorMessage('Please provide a name for this CAD asset.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('units', units);

    try {
      let savedAsset: CadAsset;
      if (existingAssetId) {
        // Upload new version to existing asset
        savedAsset = await api.post<CadAsset>(`/cad-assets/${existingAssetId}/versions`, formData);
      } else {
        // Create new asset with version 1
        formData.append('name', name.trim());
        if (description.trim()) {
          formData.append('description', description.trim());
        }
        savedAsset = await api.post<CadAsset>('/cad-assets', formData);
      }

      onSuccess(savedAsset);
      handleClose();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message || 'CAD processing failed.');
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to upload CAD model. Check geometry service connectivity.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setFile(null);
    setName('');
    setDescription('');
    setUnits('mm');
    setErrorMessage(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-surface border border-border rounded-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-surface-1">
          <div>
            <h3 className="text-sm font-semibold text-text">
              {existingAssetId ? `Upload New Version: ${existingAssetName}` : 'Upload CAD Model'}
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              Supports STEP, STL, and IGES up to 50MB. Computes SHA-256 and tessellates mesh.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-1 text-text-muted hover:text-text rounded-md hover:bg-surface-2 transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Error Banner */}
          {errorMessage && (
            <div className="flex items-start gap-2.5 p-3 rounded-md bg-danger/10 border border-danger/30 text-danger text-xs font-mono">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Drag and Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer border-2 border-dashed rounded-lg p-6 text-center transition-all ${
              isDragging
                ? 'border-accent bg-accent/5'
                : file
                ? 'border-success/50 bg-success/5'
                : 'border-border-strong hover:border-accent/60 bg-surface-0/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".stl,.step,.stp,.iges,.igs"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFileSelection(e.target.files[0]);
                }
              }}
              className="hidden"
            />

            {file ? (
              <div className="flex flex-col items-center gap-1.5">
                <FileCheck className="w-8 h-8 text-success mb-1" />
                <span className="text-xs font-mono font-semibold text-text">{file.name}</span>
                <span className="text-[11px] font-mono text-text-muted">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB • Click or drag to replace
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5">
                <Upload className="w-8 h-8 text-text-muted mb-1" />
                <p className="text-xs font-medium text-text">
                  Drag and drop your CAD file here, or <span className="text-accent underline">browse</span>
                </p>
                <p className="text-[11px] text-text-muted font-mono">
                  STEP (.step, .stp), STL (.stl), IGES (.iges, .igs) — Max 50MB
                </p>
              </div>
            )}
          </div>

          {/* Metadata Fields (for new asset) */}
          {!existingAssetId && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-text-2 mb-1">
                  Asset / Part Name <span className="text-accent">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Engine Mounting Bracket"
                  required
                  className="w-full px-3 py-1.5 bg-surface-0 border border-border rounded-md text-xs text-text focus:outline-none focus:border-accent transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-2 mb-1">
                  Description <span className="text-text-muted font-normal">(Optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="e.g. Aerospace 6061-T6 aluminum structural component"
                  className="w-full px-3 py-1.5 bg-surface-0 border border-border rounded-md text-xs text-text focus:outline-none focus:border-accent transition-colors resize-none"
                />
              </div>
            </div>
          )}

          {/* Units Selection */}
          <div className="pt-1">
            <label className="block text-xs font-medium text-text-2 mb-1.5">Model Dimensional Units</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setUnits('mm')}
                className={`px-3 py-1.5 rounded border text-xs font-mono font-medium transition-colors ${
                  units === 'mm'
                    ? 'border-accent bg-accent/15 text-accent'
                    : 'border-border bg-surface-0 text-text-muted hover:text-text'
                }`}
              >
                Millimeters (mm) [Standard]
              </button>
              <button
                type="button"
                onClick={() => setUnits('inch')}
                className={`px-3 py-1.5 rounded border text-xs font-mono font-medium transition-colors ${
                  units === 'inch'
                    ? 'border-accent bg-accent/15 text-accent'
                    : 'border-border bg-surface-0 text-text-muted hover:text-text'
                }`}
              >
                Inches (in)
              </button>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-3 py-1.5 rounded-md border border-border text-xs font-medium text-text hover:bg-surface-2 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!file || isSubmitting}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-accent hover:bg-accent-hover text-accent-fg text-xs font-semibold rounded-md shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing Geometry...</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  <span>{existingAssetId ? 'Upload New Version' : 'Upload & Process'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
