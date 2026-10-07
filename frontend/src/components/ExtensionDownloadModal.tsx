import React, { useState } from 'react';
import { 
  Download, 
  X, 
  Copy, 
  Check, 
  FolderArchive, 
  ToggleRight, 
  FolderPlus, 
  Sparkles,
  ShieldCheck,
  Zap
} from 'lucide-react';

interface ExtensionDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExtensionDownloadModal: React.FC<ExtensionDownloadModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  if (!isOpen) return null;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText('chrome://extensions');
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  const handleDownload = () => {
    setDownloaded(true);
    const link = document.createElement('a');
    link.href = '/pathprint-extension.zip';
    link.download = 'pathprint-extension.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
        {/* Header Gradient */}
        <div 
          className="px-6 py-5 flex items-center justify-between border-b"
          style={{
            borderColor: 'var(--border-primary)',
            background: 'linear-gradient(135deg, rgba(37,99,235,0.08) 0%, rgba(99,102,241,0.04) 100%)'
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  PathPrint Chrome Extension
                </h3>
                <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                  v5.0 Beta
                </span>
              </div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                1-Click LinkedIn Ingest & Real-Time AST Job Matcher
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

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          
          {/* Download Action Banner */}
          <div 
            className="p-5 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              border: '1px solid var(--border-primary)'
            }}
          >
            <div>
              <h4 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Download Ready-to-Use Package
              </h4>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                Manifest V3 • Chromium Ready (Chrome, Brave, Edge, Arc)
              </p>
            </div>
            <button
              onClick={handleDownload}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs text-white bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg transition-all active:scale-98"
            >
              {downloaded ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  Downloaded (.zip)
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Download Extension (.zip)
                </>
              )}
            </button>
          </div>

          {/* Installation Guide */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider mb-3.5" style={{ color: 'var(--text-tertiary)' }}>
              3-Step Installation Guide (Takes 30 Seconds)
            </h4>

            <div className="space-y-3">
              {/* Step 1 */}
              <div 
                className="p-4 rounded-xl flex items-start gap-3.5"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-primary)'
                }}
              >
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0 font-bold text-xs">
                  1
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 font-semibold text-xs" style={{ color: 'var(--text-primary)' }}>
                    <FolderArchive className="w-3.5 h-3.5 text-blue-500" />
                    Extract the ZIP file
                  </div>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    Download <code className="px-1.5 py-0.5 rounded text-[11px] font-mono bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">pathprint-extension.zip</code> and extract/unzip it into a folder on your computer.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div 
                className="p-4 rounded-xl flex items-start gap-3.5"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-primary)'
                }}
              >
                <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0 font-bold text-xs">
                  2
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-semibold text-xs" style={{ color: 'var(--text-primary)' }}>
                      <ToggleRight className="w-3.5 h-3.5 text-indigo-500" />
                      Open Extensions & Enable Developer Mode
                    </div>
                    <button
                      onClick={handleCopyUrl}
                      className="flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-700 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded transition-all"
                    >
                      {copiedUrl ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copiedUrl ? 'Copied URL!' : 'Copy URL'}
                    </button>
                  </div>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    Paste <strong className="font-mono text-[11px] select-all">chrome://extensions</strong> in your browser address bar and toggle on <strong>Developer mode</strong> (switch in the top-right corner).
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div 
                className="p-4 rounded-xl flex items-start gap-3.5"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-primary)'
                }}
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 font-bold text-xs">
                  3
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 font-semibold text-xs" style={{ color: 'var(--text-primary)' }}>
                    <FolderPlus className="w-3.5 h-3.5 text-emerald-500" />
                    Click "Load unpacked"
                  </div>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    Click the <strong>Load unpacked</strong> button in the top-left corner and select the extracted <code className="px-1.5 py-0.5 rounded text-[11px] font-mono bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300">extension</code> folder. Pin PathPrint to your toolbar!
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Features Highlights */}
          <div 
            className="p-4 rounded-xl space-y-2.5"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              border: '1px solid var(--border-primary)'
            }}
          >
            <h5 className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
              Extension Superpowers:
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>1-Click LinkedIn Ingestion</span>
              </div>
              <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                <Sparkles className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span>Live Job Match Scores</span>
              </div>
              <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Private & Secure</span>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div 
          className="px-6 py-4 flex items-center justify-between border-t"
          style={{
            borderColor: 'var(--border-primary)',
            backgroundColor: 'var(--bg-secondary)'
          }}
        >
          <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
            Official Chrome Web Store release coming soon.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            style={{ color: 'var(--text-primary)' }}
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
