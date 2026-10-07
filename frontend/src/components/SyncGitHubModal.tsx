import React, { useState, useEffect } from 'react';
import { 
  Github, 
  X, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  Loader2, 
  GitBranch, 
  Cpu, 
  Database,
  Globe2,
  RefreshCw,
  Layers,
  Info,
  Check
} from 'lucide-react';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

interface SyncGitHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncSuccess: () => void;
  onSuccessToast: (msg: string) => void;
  onErrorToast: (msg: string) => void;
}

type SyncScopeType = 'all' | 'unsynced' | '50' | '25' | '10' | 'custom';

export const SyncGitHubModal: React.FC<SyncGitHubModalProps> = ({
  isOpen,
  onClose,
  onSyncSuccess,
  onSuccessToast,
  onErrorToast,
}) => {
  const { activeProfile, getAuthHeaders } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [username, setUsername] = useState<string>(activeProfile.githubUser || '');
  const [token, setToken] = useState<string>('');
  const [syncScope, setSyncScope] = useState<SyncScopeType>('unsynced');
  const [customCount, setCustomCount] = useState<number>(30);
  const [includeForks, setIncludeForks] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStep, setSyncStep] = useState<number>(0);
  const [syncResult, setSyncResult] = useState<any | null>(null);

  // Status check state
  const [statusLoading, setStatusLoading] = useState<boolean>(false);
  const [statusData, setStatusData] = useState<{
    total_github_repos: number;
    synced_projects_count: number;
    unsynced_repos_count: number;
  } | null>(null);

  useEffect(() => {
    if (isOpen && username.trim()) {
      fetchSyncStatus();
    }
  }, [isOpen, username]);

  const fetchSyncStatus = async () => {
    if (!username.trim()) return;
    setStatusLoading(true);
    try {
      const headers = getAuthHeaders();
      const data = await apiService.getGithubSyncStatus(username.trim(), headers, token.trim());
      setStatusData({
        total_github_repos: data.total_github_repos,
        synced_projects_count: data.synced_projects_count,
        unsynced_repos_count: data.unsynced_repos_count
      });
    } catch (err) {
      console.warn('Could not fetch GitHub status:', err);
    } finally {
      setStatusLoading(false);
    }
  };

  if (!isOpen) return null;

  const getEffectiveMaxRepos = (): number => {
    switch (syncScope) {
      case 'all': return 0; // 0 = unlimited / all repos
      case 'unsynced': return 0; // 0 = all repos, backend filters to unsynced
      case '50': return 50;
      case '25': return 25;
      case '10': return 10;
      case 'custom': return Math.max(1, customCount);
      default: return 0;
    }
  };

  const handleStartSync = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      onErrorToast('Please enter a valid GitHub username');
      return;
    }

    setIsSyncing(true);
    setSyncResult(null);
    setSyncStep(1); // Fetching repos

    try {
      const stepTimer1 = setTimeout(() => setSyncStep(2), 1200);
      const stepTimer2 = setTimeout(() => setSyncStep(3), 2800);

      const headers = getAuthHeaders();
      const maxReposCount = getEffectiveMaxRepos();
      const onlyUnsynced = syncScope === 'unsynced';

      const response = await apiService.ingestGithub(
        username.trim(), 
        headers, 
        maxReposCount, 
        token.trim(),
        includeForks,
        onlyUnsynced
      );

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);

      setSyncStep(4);
      setSyncResult(response);
      
      const newCount = response.new_repos_synced ?? response.repos_processed ?? 0;
      const skillsCount = response.skills_extracted ?? 0;
      
      if (newCount === 0 && onlyUnsynced) {
        onSuccessToast(`All ${response.repos_total_found || 0} repositories are already up-to-date in your Knowledge Graph!`);
      } else {
        onSuccessToast(`Successfully synced ${newCount} new repositories & ${skillsCount} verified skills into Neo4j!`);
      }
      
      onSyncSuccess();
      fetchSyncStatus();
    } catch (err: any) {
      console.error(err);
      onErrorToast(err.message || 'Failed to sync GitHub repositories');
      setSyncStep(0);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className={`relative w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden transition-all duration-200 ${
          isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50/50'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl border ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
              <Github className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">Sync GitHub Footprint</h3>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Full repository crawl & AST knowledge graph synthesis
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSyncing}
            className={`p-1.5 rounded-lg transition-colors ${
              isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-slate-200' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-700'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {syncResult ? (
            /* Success View */
            <div className="space-y-5 text-center py-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center justify-center mx-auto ring-8 ring-emerald-50 dark:ring-emerald-950/30">
                <CheckCircle2 className="w-6 h-6" />
              </div>

              <div>
                <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Knowledge Graph Synchronized!
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  {syncResult.new_repos_synced > 0 
                    ? `Imported ${syncResult.new_repos_synced} repositories and extracted AST skill evidence into Neo4j.`
                    : `All ${syncResult.repos_total_found ?? syncResult.already_synced_count ?? 0} repositories are completely synchronized with the Knowledge Graph.`}
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-left">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Total on GitHub</p>
                  <p className="text-lg font-bold tabular-nums text-slate-900 dark:text-slate-100">
                    {syncResult.repos_total_found ?? syncResult.repos_processed ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">New Synced</p>
                  <p className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                    {syncResult.new_repos_synced ?? syncResult.repos_processed ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Skills Extracted</p>
                  <p className="text-lg font-bold tabular-nums text-blue-600 dark:text-blue-400">
                    {syncResult.skills_extracted ?? 0}
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all"
                >
                  View in Knowledge Graph &rarr;
                </button>
              </div>
            </div>
          ) : (
            /* Ingestion Form */
            <form onSubmit={handleStartSync} className="space-y-4">
              {/* Username Input with Live Status */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    GitHub Username <span className="text-rose-500">*</span>
                  </label>
                  {statusData && (
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span>{statusData.synced_projects_count} in Graph</span>
                      <span>&bull;</span>
                      <span className="text-blue-600 dark:text-blue-400 font-semibold">{statusData.unsynced_repos_count} Unsynced</span>
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">
                    github.com/
                  </span>
                  <input
                    type="text"
                    required
                    disabled={isSyncing}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. torvalds"
                    className={`w-full pl-24 pr-4 py-2.5 text-xs rounded-xl border font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all ${
                      isDark 
                        ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500' 
                        : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'
                    }`}
                  />
                </div>
              </div>

              {/* Sync Mode Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Synchronization Scope
                  </label>
                  <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                    {syncScope === 'unsynced' && 'Sync All Unsynced Repos (Recommended)'}
                    {syncScope === 'all' && 'Sync All Repositories (Complete Crawl)'}
                    {syncScope === '50' && 'Up to 50 Repositories'}
                    {syncScope === '25' && 'Up to 25 Repositories'}
                    {syncScope === '10' && 'Up to 10 Repositories'}
                    {syncScope === 'custom' && `Custom (${customCount} Repos)`}
                  </span>
                </div>

                {/* Primary Mode Cards */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={isSyncing}
                    onClick={() => setSyncScope('unsynced')}
                    className={`p-3 text-left rounded-xl text-xs font-medium border transition-all ${
                      syncScope === 'unsynced'
                        ? 'bg-blue-50/80 dark:bg-blue-950/70 border-blue-500 ring-2 ring-blue-500/20 text-blue-900 dark:text-blue-200 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold flex items-center gap-1.5">
                        <RefreshCw className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        Sync Unsynced Repos
                      </span>
                      {syncScope === 'unsynced' && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                      Crawls all pages and imports only repos not yet in Neo4j
                    </p>
                  </button>

                  <button
                    type="button"
                    disabled={isSyncing}
                    onClick={() => setSyncScope('all')}
                    className={`p-3 text-left rounded-xl text-xs font-medium border transition-all ${
                      syncScope === 'all'
                        ? 'bg-blue-50/80 dark:bg-blue-950/70 border-blue-500 ring-2 ring-blue-500/20 text-blue-900 dark:text-blue-200 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        Sync All Repos
                      </span>
                      {syncScope === 'all' && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                      Full library crawl across all pages without limits
                    </p>
                  </button>
                </div>

                {/* Sub-presets */}
                <div className="grid grid-cols-4 gap-1.5 pt-1">
                  {(['50', '25', '10', 'custom'] as const).map((scope) => (
                    <button
                      key={scope}
                      type="button"
                      disabled={isSyncing}
                      onClick={() => setSyncScope(scope)}
                      className={`py-1.5 px-2 text-center rounded-lg text-xs font-semibold border transition-all ${
                        syncScope === scope
                          ? 'bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border-blue-500 ring-1 ring-blue-500/20'
                          : 'bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700/70 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {scope === 'custom' ? 'Custom...' : `Top ${scope}`}
                    </button>
                  ))}
                </div>

                {/* Custom input if custom selected */}
                {syncScope === 'custom' && (
                  <div className="flex items-center gap-2 pt-1 animate-in fade-in duration-150">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Max Repos:</span>
                    <input
                      type="number"
                      min={1}
                      max={500}
                      disabled={isSyncing}
                      value={customCount}
                      onChange={(e) => setCustomCount(parseInt(e.target.value) || 10)}
                      className={`w-24 px-3 py-1.5 text-xs rounded-lg border font-semibold ${
                        isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
                      }`}
                    />
                    <span className="text-[11px] text-slate-400">repositories</span>
                  </div>
                )}
              </div>

              {/* Include Forks Checkbox */}
              <div className="flex items-start gap-2.5 pt-1">
                <input
                  type="checkbox"
                  id="include-forks"
                  disabled={isSyncing}
                  checked={includeForks}
                  onChange={(e) => setIncludeForks(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="include-forks" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                  <span className="font-semibold">Include forked repositories</span>
                  <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                    Also crawl repositories forked to your profile where you contributed
                  </span>
                </label>
              </div>

              {/* Optional Token */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  GitHub Personal Access Token <span className="text-[10px] text-slate-400 font-normal">(Optional for private repos & 5,000 req/hr limit)</span>
                </label>
                <input
                  type="password"
                  disabled={isSyncing}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  className={`w-full px-3.5 py-2 text-xs rounded-xl border font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                    isDark 
                      ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500' 
                      : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'
                  }`}
                />
              </div>

              {/* Active Sync Progress Indicator */}
              {isSyncing && (
                <div className={`p-3.5 rounded-xl border text-xs space-y-2 animate-pulse ${
                  isDark ? 'bg-blue-950/40 border-blue-900 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-800'
                }`}>
                  <div className="flex items-center gap-2 font-medium">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
                    <span>
                      {syncStep === 1 && `Fetching all public repositories for @${username}...`}
                      {syncStep === 2 && 'Comparing with Neo4j graph & isolating unsynced repositories...'}
                      {syncStep === 3 && 'Parallel AST code parsing & extracting verified technical skills...'}
                      {syncStep === 4 && 'Synthesizing BUILT and USES_TECH relations in Neo4j...'}
                    </span>
                  </div>
                </div>
              )}

              {/* Modal Footer / Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSyncing}
                  className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                    isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSyncing || !username.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm disabled:opacity-50 transition-all"
                >
                  {isSyncing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Syncing Repositories...
                    </>
                  ) : (
                    <>
                      <Github className="w-3.5 h-3.5" />
                      {syncScope === 'unsynced' && 'Sync All Unsynced Repos'}
                      {syncScope === 'all' && 'Sync All Repositories'}
                      {syncScope === 'custom' && `Sync ${customCount} Repositories`}
                      {['10', '25', '50'].includes(syncScope) && `Sync Top ${syncScope} Repositories`}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

