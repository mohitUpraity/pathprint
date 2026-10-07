import React, { useState } from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  GitBranch, 
  Share2, 
  FileText, 
  Network, 
  ShieldCheck, 
  Compass, 
  Lock, 
  ChevronRight, 
  Loader2, 
  Download 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ThemeToggle } from './ThemeToggle';
import { ExtensionDownloadModal } from './ExtensionDownloadModal';

export const LandingPage: React.FC = () => {
  const { loginWithGoogle } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isExtensionModalOpen, setIsExtensionModalOpen] = useState(false);

  const handleLogin = async () => {
    setAuthError(null);
    try {
      setIsLoggingIn(true);
      await loginWithGoogle();
    } catch (err: any) {
      console.error(err);
      if (err?.code === 'auth/unauthorized-domain' || err?.message?.includes('unauthorized-domain')) {
        setAuthError(`Domain Authorization Needed: The domain "${window.location.hostname}" must be added to Authorized Domains in Firebase Console.`);
      } else {
        setAuthError(err?.message || 'Failed to sign in with Google. Please try again.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-200 ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50/70 text-slate-900'
    }`}>
      {/* Top Navbar */}
      <header className={`sticky top-0 z-40 border-b backdrop-blur-md transition-colors ${
        isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-white/80 border-slate-200/80'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Share2 className="w-5 h-5 transform -rotate-45" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black tracking-tight text-lg">PathPrint</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/90 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  v1.0
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Skill Topology Graph & Career Navigation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              onClick={() => setIsExtensionModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition-all hover:bg-slate-100 dark:hover:bg-slate-800"
              style={{
                borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
                color: isDark ? '#f8fafc' : '#0f172a'
              }}
            >
              <Download className="w-3.5 h-3.5 text-blue-500" />
              <span className="hidden sm:inline">Extension</span>
              <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                Sync
              </span>
            </button>
            <button
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-700 shadow-xs hover:shadow-md transition-all disabled:opacity-50"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Sign In with Google</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold mb-6 shadow-xs bg-blue-50 dark:bg-blue-950/70 border-blue-200 dark:border-blue-800/60 text-blue-700 dark:text-blue-300">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Autonomous Skill Topology & Career Navigation</span>
            <span className="w-1 h-1 rounded-full bg-blue-400"></span>
            <span className="text-[11px] font-normal opacity-80">Neo4j AuraDB &bull; Multi-Modal Ingestion</span>
          </div>

          {/* Error Alert if Domain Unauthorized or Login Issue */}
          {authError && (
            <div className="max-w-2xl mx-auto mb-6 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs text-left animate-in fade-in duration-150 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 font-bold shrink-0">
                  ⚠️
                </div>
                <div>
                  <h4 className="font-bold text-xs mb-1">Firebase Domain Authorization Required</h4>
                  <p className="leading-relaxed opacity-90 mb-2">
                    Firebase blocks authentication on new domains by default. Please add your live domain to the authorized list in Firebase Console:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 font-mono text-[11px] bg-amber-100/60 dark:bg-amber-900/30 p-2.5 rounded-xl">
                    <li>Go to Firebase Console &rarr; Authentication</li>
                    <li>Click Settings tab &rarr; Authorized domains</li>
                    <li>Add domain <code className="font-bold bg-white/70 dark:bg-black/40 px-1 py-0.5 rounded">{typeof window !== 'undefined' ? window.location.hostname : 'localhost'}</code></li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* Heading */}
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight max-w-4xl mx-auto leading-[1.15]">
            Map Your Complete Career Footprint Into an{' '}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Actionable Knowledge Graph
            </span>
          </h1>

          {/* Subheading */}
          <p className="mt-6 text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed">
            PathPrint extracts, organizes, and connects your GitHub repos, LinkedIn history, and master resume into an interconnected career topology. Sync jobs in 1-click and build ATS-tailored resumes backed by verified proof points.
          </p>

          {/* Primary & Secondary CTA Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-3.5 text-sm font-semibold rounded-2xl text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/25 hover:shadow-xl hover:-translate-y-0.5 transition-all"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Connecting to PathPrint...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Sign In with Google</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <button
              onClick={() => setIsExtensionModalOpen(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold rounded-2xl border transition-all hover:bg-slate-100 dark:hover:bg-slate-900"
              style={{
                borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
                color: isDark ? '#f8fafc' : '#0f172a'
              }}
            >
              <Download className="w-4 h-4 text-blue-500" />
              <span>Get Chrome Extension</span>
              <span className="px-1.5 py-0.2 text-[10px] font-bold rounded bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                Sync
              </span>
            </button>
          </div>

          {/* Privacy Guarantee */}
          <div className="mt-6 flex items-center justify-center gap-6 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Multi-Tenant Isolated Neo4j Graph
            </span>
            <span className="flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-blue-500" />
              Private & Encrypted Workspaces
            </span>
          </div>
        </div>
      </section>

      {/* Feature Pillars Grid */}
      <section className="py-12 sm:py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Phase 1 Core Architecture
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Four interconnected systems designed to transform messy candidate inputs into structured intelligence.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1 */}
          <div className={`p-6 rounded-2xl border transition-all hover:shadow-md ${
            isDark ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200/80 hover:border-slate-300'
          }`}>
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400 flex items-center justify-center mb-4">
              <Network className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base mb-1.5">Knowledge Graph</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
              Interactive 2D/3D force graph visualizing skills, repos, companies, and roles connected to your profile.
            </p>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
              <span>Interactive Topology Visualization</span>
              <ChevronRight className="w-3 h-3" />
            </div>
          </div>

          {/* Card 2 */}
          <div className={`p-6 rounded-2xl border transition-all hover:shadow-md ${
            isDark ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200/80 hover:border-slate-300'
          }`}>
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400 flex items-center justify-center mb-4">
              <GitBranch className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base mb-1.5">Multi-Source Ingestion</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
              Direct parsing of Master Resumes (PDF/DOCX), GitHub repos, and LinkedIn data into a unified profile.
            </p>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-1">
              <span>Resume + GitHub + LinkedIn Sync</span>
              <ChevronRight className="w-3 h-3" />
            </div>
          </div>

          {/* Card 3 */}
          <div className={`p-6 rounded-2xl border transition-all hover:shadow-md ${
            isDark ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200/80 hover:border-slate-300'
          }`}>
            <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-400 flex items-center justify-center mb-4">
              <Compass className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base mb-1.5">Opportunities Radar</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
              Capture jobs from LinkedIn via Chrome Extension, monitor your application stages, and score match compatibility.
            </p>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] font-semibold text-sky-600 dark:text-sky-400 flex items-center gap-1">
              <span>1-Click Extension Ingestion</span>
              <ChevronRight className="w-3 h-3" />
            </div>
          </div>

          {/* Card 4 */}
          <div className={`p-6 rounded-2xl border transition-all hover:shadow-md ${
            isDark ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200/80 hover:border-slate-300'
          }`}>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 flex items-center justify-center mb-4">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base mb-1.5">ATS Resume Studio</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
              Tailor ATS-optimized resumes targeted to specific job descriptions with verified skills and live PDF export.
            </p>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span>Dynamic Tailoring & Export</span>
              <ChevronRight className="w-3 h-3" />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={`mt-20 border-t py-8 text-center text-xs text-slate-500 dark:text-slate-400 ${
        isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-white'
      }`}>
        <p>&copy; {new Date().getFullYear()} PathPrint &bull; Skill Topology & Career Navigation Platform.</p>
      </footer>

      {/* Extension Download & Setup Guide Modal */}
      <ExtensionDownloadModal
        isOpen={isExtensionModalOpen}
        onClose={() => setIsExtensionModalOpen(false)}
      />
    </div>
  );
};
