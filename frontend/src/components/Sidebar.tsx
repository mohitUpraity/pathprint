import React from 'react';
import { 
  Network, 
  Target, 
  FileText, 
  Activity, 
  Cpu, 
  Database, 
  Shield, 
  ExternalLink,
  Code2,
  Compass,
  UserCog
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type ActiveTab = 'profile' | 'graph' | 'opportunities' | 'matcher' | 'resume';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { activeProfile } = useAuth();

  const navItems = [
    {
      id: 'profile' as ActiveTab,
      label: 'Candidate Profile & Data',
      sublabel: 'Resume, GitHub, LinkedIn & Target',
      icon: UserCog,
    },
    {
      id: 'graph' as ActiveTab,
      label: 'Knowledge Graph',
      sublabel: 'Skill Topology & Project Network',
      icon: Network,
    },
    {
      id: 'opportunities' as ActiveTab,
      label: 'Opportunities Radar',
      sublabel: 'Pipeline & Extension Ingestion',
      icon: Compass,
    },
    {
      id: 'matcher' as ActiveTab,
      label: 'Job Matchmaker',
      sublabel: 'Graph Skill Alignment',
      icon: Target,
    },
    {
      id: 'resume' as ActiveTab,
      label: 'Resume Studio',
      sublabel: 'ATS Dynamic Tailoring',
      icon: FileText,
    },
  ];

  return (
    <aside
      className="w-full lg:w-64 shrink-0 flex flex-col justify-between p-4 min-h-[calc(100vh-57px)]"
      style={{
        backgroundColor: 'var(--bg-primary)',
        borderRight: '1px solid var(--border-primary)',
      }}
    >
      {/* Top Section: User Profile Card & Navigation */}
      <div className="space-y-4">
        {/* Active Profile Card - Clickable to open Profile & Preferences */}
        <div
          onClick={() => setActiveTab('profile')}
          className="p-3 rounded-xl cursor-pointer hover:border-blue-500 transition-all group"
          title="Click to edit candidate profile & ingestion"
          style={{
            backgroundColor: activeTab === 'profile' ? 'var(--brand-50)' : 'var(--bg-secondary)',
            border: activeTab === 'profile' ? '1px solid var(--brand-600)' : '1px solid var(--border-primary)',
          }}
        >
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              {activeProfile.avatar ? (
                <img
                  src={activeProfile.avatar}
                  alt={activeProfile.name}
                  className="w-10 h-10 rounded-lg object-cover"
                  style={{ border: '2px solid var(--border-primary)' }}
                />
              ) : (
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm bg-blue-600 text-white"
                  style={{ border: '2px solid var(--border-primary)' }}
                >
                  {(activeProfile.name || 'P').charAt(0).toUpperCase()}
                </div>
              )}
              <span
                className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full"
                style={{
                  backgroundColor: 'var(--success-600)',
                  border: '2px solid var(--bg-primary)',
                }}
              />
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                {activeProfile.name || 'Candidate Profile'}
              </h4>
              <p className="text-[11px] truncate" style={{ color: 'var(--text-secondary)' }}>
                {activeProfile.role || 'Software Engineer'}
              </p>
              {activeProfile.githubUser ? (
                <a
                  href={`https://github.com/${activeProfile.githubUser}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 text-[10px] font-mono mt-0.5"
                  style={{ color: 'var(--brand-600)' }}
                >
                  <Code2 className="w-3 h-3" />
                  @{activeProfile.githubUser}
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono mt-0.5 text-slate-400">
                  <Code2 className="w-3 h-3" />
                  Click to Sync Sources
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-all relative"
                style={{
                  backgroundColor: isActive ? 'var(--brand-50)' : 'transparent',
                  color: isActive ? 'var(--brand-600)' : 'var(--text-secondary)',
                  fontWeight: isActive ? 600 : 500,
                }}
              >
                {isActive && (
                  <span
                    className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full"
                    style={{ backgroundColor: 'var(--brand-600)' }}
                  />
                )}

                <div
                  className="p-1.5 rounded"
                  style={{
                    backgroundColor: isActive ? 'var(--brand-100)' : 'var(--bg-tertiary)',
                    color: isActive ? 'var(--brand-600)' : 'var(--text-tertiary)',
                  }}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-xs font-semibold">{item.label}</span>
                  <span className="block text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                    {item.sublabel}
                  </span>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section: System Status */}
      <div className="pt-4 space-y-2" style={{ borderTop: '1px solid var(--border-primary)' }}>
        <div
          className="p-3 rounded-lg text-[11px] space-y-2"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-primary)',
          }}
        >
          <div className="flex items-center justify-between" style={{ color: 'var(--text-secondary)' }}>
            <span className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
              Inference LLM
            </span>
            <span className="font-mono font-medium" style={{ color: 'var(--text-primary)' }}>Groq / Gemini</span>
          </div>

          <div className="flex items-center justify-between" style={{ color: 'var(--text-secondary)' }}>
            <span className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
              Graph DB
            </span>
            <span className="font-mono font-medium" style={{ color: 'var(--text-primary)' }}>Neo4j Aura</span>
          </div>

          <div className="flex items-center justify-between" style={{ color: 'var(--text-secondary)' }}>
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
              Architecture
            </span>
            <span className="font-mono font-medium" style={{ color: 'var(--text-primary)' }}>GraphRAG</span>
          </div>
        </div>

        <div className="flex items-center justify-between px-2 text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
          <span className="flex items-center gap-1">
            <Activity className="w-3 h-3" style={{ color: 'var(--success-600)' }} />
            PathPrint Core Online
          </span>
          <span className="font-mono">Phase 1</span>
        </div>
      </div>
    </aside>
  );
};
