import React, { useState, useRef } from 'react';
import { 
  FileText, 
  UploadCloud, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Sparkles, 
  User, 
  Briefcase, 
  GraduationCap, 
  Code2,
  FileCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';

interface SyncResumeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (blueprint: any) => void;
  onSuccessToast: (message: string) => void;
  onErrorToast: (message: string) => void;
}

export const SyncResumeModal: React.FC<SyncResumeModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
  onSuccessToast,
  onErrorToast,
}) => {
  const { getAuthHeaders } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (!selected.name.toLowerCase().endsWith('.pdf')) {
        onErrorToast('Please upload a PDF format resume document');
        return;
      }
      setFile(selected);
      setUploadResult(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selected = e.dataTransfer.files[0];
      if (!selected.name.toLowerCase().endsWith('.pdf')) {
        onErrorToast('Please upload a PDF format resume document');
        return;
      }
      setFile(selected);
      setUploadResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      onErrorToast('Please select a resume file first');
      return;
    }

    setIsUploading(true);
    setUploadResult(null);

    try {
      const res = await apiService.uploadResumePdf(file, getAuthHeaders());
      setUploadResult(res);
      onUploadSuccess(res.blueprint);
      onSuccessToast(`Master Resume uploaded! Extracted ${res.total_skills_extracted ?? 0} skills & graph nodes.`);
    } catch (err: any) {
      onErrorToast(err.message || 'Failed to upload and parse resume');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden animate-scale-up"
        style={{
          backgroundColor: 'var(--bg-primary)',
          border: '1px solid var(--border-primary)',
        }}
      >
        {/* Header */}
        <div 
          className="px-6 py-5 flex items-center justify-between border-b"
          style={{
            borderColor: 'var(--border-primary)',
            background: 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(37,99,235,0.04) 100%)'
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  Sync Master Resume
                </h3>
                <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                  Golden Blueprint
                </span>
              </div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Set your baseline candidate identity, verified skills, and experience topology
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-5">
          {!uploadResult ? (
            <>
              {/* Dropzone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-8 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  isDragging 
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20' 
                    : 'border-slate-300 dark:border-slate-700 hover:border-emerald-500 hover:bg-slate-50 dark:hover:bg-slate-900/50'
                }`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept=".pdf" 
                  className="hidden" 
                />
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400 flex items-center justify-center mb-3">
                  <UploadCloud className="w-6 h-6" />
                </div>
                {file ? (
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1.5">
                      <FileCheck className="w-4 h-4" />
                      {file.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {(file.size / 1024).toFixed(1)} KB • Ready to parse & merge
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      Click to upload or drag & drop your PDF resume
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      Supports standard PDF format up to 10MB
                    </p>
                  </div>
                )}
              </div>

              {/* Notice Box */}
              <div 
                className="p-4 rounded-xl flex items-start gap-3"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-primary)'
                }}
              >
                <Sparkles className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1" style={{ color: 'var(--text-secondary)' }}>
                  <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Why upload a Master Resume?
                  </p>
                  <p className="leading-relaxed">
                    PathPrint uses your Master Resume to identify your real experience timeline, education, and career summary, which serves as the base anchor for automated ATS resume tailoring and peer benchmarking.
                  </p>
                </div>
              </div>
            </>
          ) : (
            /* Upload Success View */
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                    Master Resume Synchronized Successfully
                  </h4>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">
                    Extracted candidate blueprint, work history, and verified skills into Neo4j AuraDB.
                  </p>
                </div>
              </div>

              {/* Extracted Details Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl border" style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-primary)' }}>
                  <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                    <User className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Candidate Name</span>
                  </div>
                  <p className="font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                    {uploadResult.blueprint?.contact?.full_name || 'Candidate Identified'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border" style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-primary)' }}>
                  <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                    <Code2 className="w-3.5 h-3.5 text-blue-500" />
                    <span>Skills Extracted</span>
                  </div>
                  <p className="font-bold" style={{ color: 'var(--text-primary)' }}>
                    {uploadResult.total_skills_extracted ?? 0} Skills Mapped
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border" style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-primary)' }}>
                  <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                    <Briefcase className="w-3.5 h-3.5 text-amber-500" />
                    <span>Companies</span>
                  </div>
                  <p className="font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                    {uploadResult.companies_mapped?.length ?? 0} Organizations
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border" style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-primary)' }}>
                  <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                    <GraduationCap className="w-3.5 h-3.5 text-purple-500" />
                    <span>Education</span>
                  </div>
                  <p className="font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                    {uploadResult.universities_mapped?.[0] || '1 University / Degree'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div 
          className="px-6 py-4 flex items-center justify-between border-t"
          style={{
            borderColor: 'var(--border-primary)',
            backgroundColor: 'var(--bg-secondary)'
          }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            {uploadResult ? 'Done' : 'Cancel'}
          </button>

          {!uploadResult ? (
            <button
              onClick={handleUpload}
              disabled={!file || isUploading}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md transition-all disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Parsing & Synthesizing...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>Upload & Sync Master Resume</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={() => {
                setFile(null);
                setUploadResult(null);
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors"
            >
              Upload Another Resume
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
