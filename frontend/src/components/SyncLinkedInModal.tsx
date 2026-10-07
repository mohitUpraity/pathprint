import React, { useState, useRef } from 'react';
import { 
  Share2, 
  UploadCloud, 
  X, 
  CheckCircle2, 
  Puzzle, 
  ExternalLink, 
  FileSpreadsheet, 
  Download, 
  Users, 
  Building2, 
  GraduationCap, 
  ArrowRight,
  Loader2,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SyncLinkedInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenExtensionModal?: () => void;
  onSuccessToast: (message: string) => void;
  onErrorToast: (message: string) => void;
  onSyncSuccess?: () => void;
}

export const SyncLinkedInModal: React.FC<SyncLinkedInModalProps> = ({
  isOpen,
  onClose,
  onOpenExtensionModal,
  onSuccessToast,
  onErrorToast,
  onSyncSuccess,
}) => {
  const { getAuthHeaders, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'extension' | 'csv'>('extension');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleCsvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (!selected.name.toLowerCase().endsWith('.csv')) {
        onErrorToast('Please upload an official LinkedIn Connections.csv file');
        return;
      }
      setCsvFile(selected);
      setUploadResult(null);
    }
  };

  const handleUploadCsv = async () => {
    if (!csvFile) {
      onErrorToast('Please select a CSV file first');
      return;
    }

    setIsUploading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('file', csvFile);

      const headers = getAuthHeaders();
      const reqHeaders = { ...headers };
      delete reqHeaders['Content-Type'];

      const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
      const res = await fetch(`${API_BASE}/api/v1/ingest/linkedin`, {
        method: 'POST',
        headers: reqHeaders,
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `LinkedIn ingestion failed (${res.status})`);
      }

      const data = await res.json();
      setUploadResult(data);
      onSuccessToast(`Synchronized ${data.total_connections_imported ?? 0} LinkedIn connections & alumni nodes!`);
      if (onSyncSuccess) onSyncSuccess();
    } catch (err: any) {
      onErrorToast(err.message || 'Failed to parse LinkedIn connections CSV');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-scale-up"
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
            background: 'linear-gradient(135deg, rgba(14,165,233,0.08) 0%, rgba(99,102,241,0.04) 100%)'
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  Sync LinkedIn Footprint
                </h3>
                <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300">
                  Referral Network
                </span>
              </div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Ingest 1st-degree connections, college alumni, and target company employees
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

        {/* Tab Switcher */}
        <div className="px-6 pt-4 border-b flex items-center gap-4" style={{ borderColor: 'var(--border-primary)' }}>
          <button
            onClick={() => setActiveTab('extension')}
            className={`pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'extension'
                ? 'border-sky-600 text-sky-600 dark:text-sky-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Puzzle className="w-4 h-4" />
            <span>Method 1: Chrome Extension (1-Click Instant)</span>
          </button>

          <button
            onClick={() => setActiveTab('csv')}
            className={`pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'csv'
                ? 'border-sky-600 text-sky-600 dark:text-sky-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Method 2: Upload Connections.csv</span>
          </button>
        </div>

        {/* Tab 1: Extension Guide */}
        {activeTab === 'extension' && (
          <div className="p-6 space-y-5">
            <div 
              className="p-5 rounded-2xl border space-y-4"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                borderColor: 'var(--border-primary)'
              }}
            >
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  How to Sync Directly from LinkedIn:
                </h4>
                {onOpenExtensionModal && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenExtensionModal();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white shadow-xs transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Get Extension (.zip)
                  </button>
                )}
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 font-bold flex items-center justify-center shrink-0">
                    1
                  </span>
                  <p className="mt-0.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    Open your <strong>LinkedIn profile</strong> or any LinkedIn job post in Chrome.
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 font-bold flex items-center justify-center shrink-0">
                    2
                  </span>
                  <p className="mt-0.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    Click the <strong>PathPrint extension icon</strong> in your browser toolbar.
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 font-bold flex items-center justify-center shrink-0">
                    3
                  </span>
                  <p className="mt-0.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    Click <strong>"1-Click Sync to Graph"</strong>. Your connections, alumni, and company relationships will automatically merge into your private Neo4j graph!
                  </p>
                </div>
              </div>
            </div>

            {/* Active Account Identity for Extension */}
            <div 
              className="p-3.5 rounded-xl border flex items-center justify-between"
              style={{
                backgroundColor: 'var(--brand-50)',
                borderColor: 'var(--brand-100)'
              }}
            >
              <div className="flex flex-col min-w-0 pr-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                  Active PathPrint Account ID (For Extension)
                </span>
                <span className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {user?.uid || user?.email || 'candidate-workspace'}
                </span>
              </div>
              <button
                onClick={() => {
                  const id = user?.uid || user?.email || 'candidate-workspace';
                  navigator.clipboard.writeText(id);
                  onSuccessToast('Account ID copied to clipboard!');
                }}
                className="px-3 py-1 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs shrink-0 transition-colors"
              >
                Copy ID
              </button>
            </div>

            <div className="p-4 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-xs flex items-center gap-3">
              <Sparkles className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
              <p className="text-sky-800 dark:text-sky-200 leading-relaxed">
                When you open the extension while this tab is active, it will automatically link your account. No manual login required.
              </p>
            </div>
          </div>
        )}

        {/* Tab 2: CSV Upload */}
        {activeTab === 'csv' && (
          <div className="p-6 space-y-5">
            {!uploadResult ? (
              <>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-7 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-sky-500 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-slate-50/50 dark:bg-slate-900/30"
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleCsvChange} 
                    accept=".csv" 
                    className="hidden" 
                  />
                  <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400 flex items-center justify-center mb-3">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  {csvFile ? (
                    <p className="text-sm font-semibold text-sky-600 dark:text-sky-400">
                      {csvFile.name} ({(csvFile.size / 1024).toFixed(1)} KB)
                    </p>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        Select LinkedIn <code className="font-mono text-sky-600">Connections.csv</code> file
                      </p>
                      <p className="text-xs text-slate-500">
                        Exported directly from LinkedIn Privacy & Data Settings
                      </p>
                    </div>
                  )}
                </div>

                <div 
                  className="p-4 rounded-xl text-xs space-y-2"
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-primary)'
                  }}
                >
                  <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                    How to get your Connections.csv from LinkedIn:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-slate-500 dark:text-slate-400 leading-relaxed">
                    <li>Go to LinkedIn &rarr; <strong>Settings & Privacy</strong> &rarr; <strong>Data Privacy</strong>.</li>
                    <li>Click <strong>Get a copy of your data</strong>.</li>
                    <li>Select <strong>Connections</strong> and click <em>Request archive</em>.</li>
                    <li>Download and upload the unzipped <code className="font-mono">Connections.csv</code> here!</li>
                  </ol>
                </div>
              </>
            ) : (
              <div className="space-y-4 animate-fade-in">
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                      LinkedIn Network Ingested
                    </h4>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300">
                      Merged contacts, current employers, and alumni referral pathways.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl border" style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-primary)' }}>
                    <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                      <Users className="w-3.5 h-3.5 text-sky-500" />
                      <span>Connections</span>
                    </div>
                    <p className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                      {uploadResult.total_connections_imported ?? 0}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl border" style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-primary)' }}>
                    <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                      <Building2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Companies</span>
                    </div>
                    <p className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                      {uploadResult.companies_mapped ?? 0}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

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

          {activeTab === 'csv' && !uploadResult && (
            <button
              onClick={handleUploadCsv}
              disabled={!csvFile || isUploading}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 shadow-md transition-all disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Importing Network...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>Import Connections.csv</span>
                </>
              )}
            </button>
          )}

          {activeTab === 'extension' && onOpenExtensionModal && (
            <button
              onClick={() => {
                onClose();
                onOpenExtensionModal();
              }}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 shadow-md transition-all"
            >
              <span>Download Extension (.zip)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
