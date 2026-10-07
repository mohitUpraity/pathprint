import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { KnowledgeGraph } from './components/KnowledgeGraph/KnowledgeGraph';
import { OpportunitiesRadar } from './components/OpportunitiesRadar/OpportunitiesRadar';
import { JobMatchmaker } from './components/JobMatchmaker/JobMatchmaker';
import { ResumeStudio } from './components/ResumeStudio/ResumeStudio';
import { ProfilePreferences } from './components/ProfilePreferences/ProfilePreferences';
import { StartFreshModal } from './components/StartFreshModal';
import { SyncGitHubModal } from './components/SyncGitHubModal';
import { SyncResumeModal } from './components/SyncResumeModal';
import { SyncLinkedInModal } from './components/SyncLinkedInModal';
import { ExtensionDownloadModal } from './components/ExtensionDownloadModal';
import { Toast, ToastMessage } from './components/Toast';
import { LandingPage } from './components/LandingPage';
import { apiService, ProfileAnalysis } from './services/api';
import { GraphData } from './types';
import { Loader2 } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { getAuthHeaders, activeProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('profile');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isSyncGitHubModalOpen, setIsSyncGitHubModalOpen] = useState(false);
  const [isSyncResumeModalOpen, setIsSyncResumeModalOpen] = useState(false);
  const [isSyncLinkedInModalOpen, setIsSyncLinkedInModalOpen] = useState(false);
  const [isExtensionModalOpen, setIsExtensionModalOpen] = useState(false);

  // App data state
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [analysis, setAnalysis] = useState<ProfileAnalysis | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Cross-component parameters
  const [resumeParams, setResumeParams] = useState<{ role: string; company: string; jd: string }>({
    role: 'Senior Full Stack Engineer',
    company: 'Tech Innovators Inc.',
    jd: '',
  });
  const [graphFilterQuery, setGraphFilterQuery] = useState<string>('');

  const addToast = (type: 'success' | 'error' | 'info', message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const loadProfileData = async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const [graph, analysisData] = await Promise.all([
        apiService.getGraph(headers).catch(() => ({ nodes: [], links: [] })),
        apiService.getAnalysis(headers).catch(() => ({
          repos_count: 0,
          connections_count: 0,
          alumni_count: 0,
          top_skills: [],
          graph_nodes_count: 0,
        })),
      ]);
      setGraphData(graph);
      setAnalysis(analysisData);
    } catch (err: any) {
      console.error(err);
      addToast('error', 'Failed to load profile graph data');
    } finally {
      setLoading(false);
    }
  };

  // Reload when profile changes
  useEffect(() => {
    loadProfileData();
  }, [activeProfile.id]);

  const handleSelectTailorResume = (role: string, company: string, jd: string) => {
    setResumeParams({ role, company, jd });
    setActiveTab('resume');
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
      {/* Top Navigation */}
      <Navbar
        analysis={analysis}
        onOpenResetModal={() => setIsResetModalOpen(true)}
        onOpenSyncGitHub={() => setIsSyncGitHubModalOpen(true)}
        onOpenSyncResume={() => setIsSyncResumeModalOpen(true)}
        onOpenSyncLinkedIn={() => setIsSyncLinkedInModalOpen(true)}
        onOpenExtensionModal={() => setIsExtensionModalOpen(true)}
        onRefreshData={loadProfileData}
        loading={loading}
      />

      {/* Main Content Area: Sidebar + Active View */}
      <div className="flex-1 flex flex-col lg:flex-row">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="flex-1 p-4 lg:p-6 overflow-y-auto min-h-[calc(100vh-57px)]">
          {activeTab === 'profile' && (
            <ProfilePreferences
              onSuccessToast={(msg) => {
                addToast('success', msg);
                loadProfileData();
              }}
              onErrorToast={(msg) => addToast('error', msg)}
              onNavigateToTab={(tab: string) => {
                if (tab === 'growth' || tab === 'interview' || tab === 'referrals' || tab === 'benchmark' || tab === 'brain') {
                  setActiveTab('graph');
                } else {
                  setActiveTab(tab as ActiveTab);
                }
              }}
              onOpenSyncResume={() => setIsSyncResumeModalOpen(true)}
              onOpenSyncGitHub={() => setIsSyncGitHubModalOpen(true)}
              onOpenSyncLinkedIn={() => setIsSyncLinkedInModalOpen(true)}
            />
          )}

          {activeTab === 'graph' && (
            <KnowledgeGraph 
              graphData={graphData} 
              loading={loading} 
              initialNlpQuery={graphFilterQuery}
              onClearInitialQuery={() => setGraphFilterQuery('')}
              onOpenSyncGitHub={() => setIsSyncGitHubModalOpen(true)}
            />
          )}

          {activeTab === 'opportunities' && (
            <OpportunitiesRadar
              onTailorResume={handleSelectTailorResume}
              onPrepareInterview={() => setActiveTab('resume')}
              onFindReferral={() => addToast('info', 'Referral discovery will be featured in Phase 2!')}
              onError={(msg) => addToast('error', msg)}
              onSuccess={(msg) => addToast('success', msg)}
            />
          )}

          {activeTab === 'matcher' && (
            <JobMatchmaker
              onSelectTailorResume={handleSelectTailorResume}
              onPrepareInterview={() => setActiveTab('resume')}
              onNavigateToReferrals={() => addToast('info', 'Referral discovery will be featured in Phase 2!')}
              onError={(msg) => addToast('error', msg)}
              onSuccess={(msg) => addToast('success', msg)}
            />
          )}

          {activeTab === 'resume' && (
            <ResumeStudio
              initialRole={resumeParams.role}
              initialCompany={resumeParams.company}
              initialJd={resumeParams.jd}
              onError={(msg) => addToast('error', msg)}
              onSuccess={(msg) => addToast('success', msg)}
            />
          )}
        </main>
      </div>

      {/* Extension Download & Setup Guide Modal */}
      <ExtensionDownloadModal
        isOpen={isExtensionModalOpen}
        onClose={() => setIsExtensionModalOpen(false)}
      />

      {/* Sync GitHub Modal */}
      <SyncGitHubModal
        isOpen={isSyncGitHubModalOpen}
        onClose={() => setIsSyncGitHubModalOpen(false)}
        onSyncSuccess={() => {
          loadProfileData();
        }}
        onSuccessToast={(msg) => addToast('success', msg)}
        onErrorToast={(msg) => addToast('error', msg)}
      />

      {/* Sync Master Resume Modal */}
      <SyncResumeModal
        isOpen={isSyncResumeModalOpen}
        onClose={() => setIsSyncResumeModalOpen(false)}
        onUploadSuccess={() => {
          loadProfileData();
        }}
        onSuccessToast={(msg) => addToast('success', msg)}
        onErrorToast={(msg) => addToast('error', msg)}
      />

      {/* Sync LinkedIn Modal */}
      <SyncLinkedInModal
        isOpen={isSyncLinkedInModalOpen}
        onClose={() => setIsSyncLinkedInModalOpen(false)}
        onOpenExtensionModal={() => setIsExtensionModalOpen(true)}
        onSyncSuccess={() => {
          loadProfileData();
        }}
        onSuccessToast={(msg) => addToast('success', msg)}
        onErrorToast={(msg) => addToast('error', msg)}
      />

      {/* Database Reset & Fresh Start Modal */}
      <StartFreshModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onSuccess={(msg) => {
          addToast('success', msg);
          loadProfileData();
        }}
        onError={(msg) => addToast('error', msg)}
      />

      {/* Toast Notification Container */}
      <Toast toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </div>
  );
};

const RootRouter: React.FC = () => {
  const { isLoggedIn, authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center animate-pulse">
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          </div>
          <p className="text-xs font-semibold text-slate-400">Loading PathPrint Engine...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <LandingPage />;
  }

  return <MainLayout />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <RootRouter />
    </AuthProvider>
  );
};

export default App;
