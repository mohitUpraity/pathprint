import React, { useState } from 'react';
import { 
  Sparkles, 
  Target, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Zap, 
  ShieldAlert, 
  Code, 
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Cpu,
  Swords
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { MatchAnalysisResponse } from '../../types';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface JobMatchmakerProps {
  onSelectTailorResume: (role: string, company: string, jd: string) => void;
  onNavigateToReferrals: (company: string) => void;
  onPrepareInterview?: (role: string, company: string, jd: string) => void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}

const PRESET_JOBS = [
  {
    id: 'apponward',
    company: 'Apponward Technologies',
    role: 'Senior Backend / Full Stack Engineer',
    badge: 'High Match',
    jd: `Looking for a strong Backend / Full Stack Engineer with experience in Python, FastAPI, React/Next.js, and Modern Databases.
Responsibilities:
- Build high-performance REST and GraphQL microservices with FastAPI.
- Architect real-time data pipelines and scalable graph/relational database schemas.
- Collaborate with frontend engineers to build responsive, interactive user interfaces.
Requirements:
- 1-3 years of experience in Python, FastAPI, PostgreSQL/Neo4j, and React.
- Strong fundamentals in data structures, algorithms, and system design.
- Hands-on experience with Docker, CI/CD, and asynchronous programming.`
  },
  {
    id: 'drdo_cyber',
    company: 'DRDO – ADRDE Agra',
    role: 'AI & Cybersecurity Research Engineer',
    badge: 'Govt / Defense',
    jd: `DRDO ADRDE is seeking an AI & Cybersecurity Research Engineer to design next-generation defense systems and intelligent packet inspection frameworks.
Responsibilities:
- Develop low-latency deep packet inspection (DPI) modules using Linux iptables and raw sockets.
- Implement anomaly detection models using PyTorch/TensorFlow for real-time network telemetry.
- Optimize high-throughput kernel-level packet capture and filtering algorithms.
Requirements:
- Proficiency in Python, Linux networking internals, iptables, and C/C++.
- Background in Intrusion Detection Systems (IDS), machine learning, and security analytics.`
  },
  {
    id: 'google_swe',
    company: 'Google',
    role: 'Software Engineer (Distributed Systems)',
    badge: 'Big Tech',
    jd: `Google is seeking a Software Engineer to work on large-scale distributed systems and graph computing infrastructure.
Responsibilities:
- Design fault-tolerant, highly available distributed services handling billions of queries.
- Build graph indexing and knowledge retrieval pipelines (GraphRAG) with low latency.
Requirements:
- Strong programming skills in Python, C++, or Go.
- Deep understanding of distributed storage, caching (Redis), and graph algorithms.`
  },
  {
    id: 'sharda_ml',
    company: 'Sharda / HCST Research Lab',
    role: 'Applied ML & Graph Neural Network Researcher',
    badge: 'Research Lab',
    jd: `Research laboratory seeking an Applied ML Engineer to work on Knowledge Graph embeddings and Graph Retrieval-Augmented Generation (GraphRAG).
Responsibilities:
- Implement GNN models for knowledge extraction and link prediction.
- Extract structured ontologies from unstructured text streams.`
  }
];

export const JobMatchmaker: React.FC<JobMatchmakerProps> = ({
  onSelectTailorResume,
  onNavigateToReferrals,
  onPrepareInterview,
  onError,
  onSuccess,
}) => {
  const { getAuthHeaders, activeProfile } = useAuth();
  const [selectedPreset, setSelectedPreset] = useState<string>('apponward');
  const [company, setCompany] = useState<string>(PRESET_JOBS[0].company);
  const [role, setRole] = useState<string>(PRESET_JOBS[0].role);
  const [jobDescription, setJobDescription] = useState<string>(PRESET_JOBS[0].jd);
  
  const [loading, setLoading] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<MatchAnalysisResponse | null>(null);

  const handleSelectPreset = (presetId: string) => {
    const preset = PRESET_JOBS.find(p => p.id === presetId);
    if (preset) {
      setSelectedPreset(preset.id);
      setCompany(preset.company);
      setRole(preset.role);
      setJobDescription(preset.jd);
    }
  };

  const handleRunMatch = async () => {
    if (!jobDescription.trim()) {
      onError('Please provide a job description or select a preset');
      return;
    }

    setLoading(true);
    try {
      const result = await apiService.analyzeMatch(
        {
          target_company: company,
          target_role: role,
          job_description: jobDescription,
        },
        getAuthHeaders()
      );
      setAnalysisResult(result);
      onSuccess(`Match score calculated: ${result.match_score}%`);

      if (result.match_score >= 70) {
        confetti({
          particleCount: 60,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#2563EB', '#059669', '#7C3AED']
        });
      }
    } catch (err: any) {
      onError(err.message || 'Failed to analyze job match');
    } finally {
      setLoading(false);
    }
  };

  // Score circular calculation
  const score = analysisResult ? analysisResult.match_score : 0;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header & Presets */}
      <div
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl card"
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg" style={{ backgroundColor: 'var(--brand-50)', color: 'var(--brand-600)' }}>
              <Zap className="w-4 h-4" />
            </span>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Job Matchmaker</h2>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            AI-powered skill topology matching against job descriptions
          </p>
        </div>

        {/* Preset Selector */}
        <div className="flex flex-wrap items-center gap-2">
          {PRESET_JOBS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleSelectPreset(preset.id)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                backgroundColor: selectedPreset === preset.id ? 'var(--brand-50)' : 'transparent',
                color: selectedPreset === preset.id ? 'var(--brand-600)' : 'var(--text-secondary)',
                border: `1px solid ${selectedPreset === preset.id ? 'var(--brand-100)' : 'var(--border-primary)'}`,
                fontWeight: selectedPreset === preset.id ? 600 : 500,
              }}
            >
              {preset.company.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Input Panel & Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Job Input Card */}
        <div className="lg:col-span-5 p-5 rounded-xl card space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Target Company</label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="input-base w-full text-sm"
                placeholder="e.g. Google, Apponward"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Target Role / Title</label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="input-base w-full text-sm"
                placeholder="e.g. Senior Backend Engineer"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                Job Description / Requirements
              </label>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                rows={10}
                className="w-full px-3 py-2.5 text-sm font-mono leading-relaxed rounded-lg"
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-primary)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
                placeholder="Paste the full job description here..."
              />
            </div>
          </div>

          <button
            onClick={handleRunMatch}
            disabled={loading}
            className="w-full py-3 px-4 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all"
            style={{ backgroundColor: 'var(--brand-600)' }}
          >
            {loading ? (
              <>
                <Cpu className="w-4 h-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Run Match Analysis
              </>
            )}
          </button>
        </div>

        {/* Right: Analysis Dashboard */}
        <div className="lg:col-span-7 space-y-6">
          {analysisResult ? (
            <div className="space-y-6 animate-fade-in">
              {/* Score Card */}
              <div
                className="p-6 rounded-xl card flex flex-col sm:flex-row items-center justify-between gap-6"
              >
                <div className="space-y-2 text-center sm:text-left">
                  <span className="badge-brand text-[10px] font-mono uppercase tracking-widest font-semibold">
                    Compatibility Score
                  </span>
                  <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{analysisResult.job_title}</h3>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{analysisResult.company}</p>
                  <p className="text-xs max-w-md mt-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {analysisResult.summary}
                  </p>
                </div>

                {/* Circular SVG Match Gauge */}
                <div className="relative flex items-center justify-center shrink-0">
                  <svg className="w-36 h-36 transform -rotate-90">
                    <circle cx="72" cy="72" r={radius} stroke="var(--bg-tertiary)" strokeWidth="10" fill="transparent" />
                    <circle
                      cx="72"
                      cy="72"
                      r={radius}
                      stroke={score >= 80 ? 'var(--score-high)' : score >= 60 ? 'var(--score-mid)' : 'var(--score-low)'}
                      strokeWidth="10"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      fill="transparent"
                      className="score-circle"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-3xl font-black" style={{ color: 'var(--text-primary)' }}>{score}%</span>
                    <span className="text-[10px] uppercase font-mono font-bold" style={{
                      color: score >= 80 ? 'var(--score-high)' : score >= 60 ? 'var(--score-mid)' : 'var(--score-low)'
                    }}>
                      {score >= 80 ? 'Strong Fit' : score >= 60 ? 'Competitive' : 'Gap Found'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Matched Skills */}
              <div className="p-5 rounded-xl card space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--success-600)' }} />
                    Matching Skills ({analysisResult.matched_skills.length})
                  </h4>
                  <span className="badge-success text-[10px] font-mono">Verified</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {analysisResult.matched_skills.map((skill, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg card-hover flex items-start gap-2.5"
                      style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}
                    >
                      <Code className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--success-600)' }} />
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-semibold block truncate" style={{ color: 'var(--text-primary)' }}>
                          {skill.skill}
                        </span>
                        {skill.repo_name && (
                          <span className="text-[10px] font-mono flex items-center gap-1 mt-0.5" style={{ color: 'var(--brand-600)' }}>
                            repo: {skill.repo_name}
                          </span>
                        )}
                        {skill.code_evidence && (
                          <p className="text-[10px] mt-1 line-clamp-2" style={{ color: 'var(--text-tertiary)' }}>
                            {skill.code_evidence}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Missing Skills Gap */}
              {analysisResult.missing_skills.length > 0 && (
                <div className="p-5 rounded-xl card space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--warning-600)' }}>
                    <AlertCircle className="w-4 h-4" />
                    Skill Gaps ({analysisResult.missing_skills.length})
                  </h4>

                  <div className="flex flex-wrap gap-2">
                    {analysisResult.missing_skills.map((gap, idx) => (
                      <span key={idx} className="badge-warning text-xs font-medium px-2.5 py-1 rounded-lg">
                        {gap}
                      </span>
                    ))}
                  </div>

                  {analysisResult.gap_recommendations && analysisResult.gap_recommendations.length > 0 && (
                    <ul className="space-y-1.5 pt-2 text-xs" style={{ borderTop: '1px solid var(--border-primary)', color: 'var(--text-secondary)' }}>
                      {analysisResult.gap_recommendations.map((rec, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <ChevronRight className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: 'var(--warning-600)' }} />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Peer Benchmark */}
              {analysisResult.peer_comparison && (
                <div
                  className="p-5 rounded-xl space-y-3"
                  style={{ backgroundColor: 'var(--info-50)', border: '1px solid var(--brand-100)' }}
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--brand-600)' }}>
                      <TrendingUp className="w-4 h-4" />
                      Peer Benchmark Comparison
                    </h4>
                    <span className="text-xs font-bold" style={{ color: 'var(--brand-600)' }}>
                      Peer: {analysisResult.peer_comparison.coworker_score ?? 74}%
                    </span>
                  </div>

                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {analysisResult.peer_comparison.advantage_summary ||
                      'Your project evidence gives you a competitive edge for this role.'}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                {onPrepareInterview && (
                  <button
                    onClick={() => onPrepareInterview(role, company, jobDescription)}
                    className="w-full sm:flex-1 py-3 px-4 rounded-lg text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
                  >
                    <Swords className="w-4 h-4 text-amber-500" />
                    Prepare & Interview
                  </button>
                )}

                <button
                  onClick={() => onSelectTailorResume(role, company, jobDescription)}
                  className="w-full sm:flex-1 py-3 px-4 rounded-lg text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                  style={{ backgroundColor: 'var(--brand-600)' }}
                >
                  <Sparkles className="w-4 h-4" />
                  Tailor Resume
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => onNavigateToReferrals(company)}
                  className="w-full sm:w-auto py-3 px-4 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-primary)',
                  }}
                >
                  Find Referrals
                </button>
              </div>
            </div>
          ) : (
            <div
              className="h-full min-h-[380px] p-8 rounded-xl flex flex-col items-center justify-center text-center space-y-3"
              style={{
                backgroundColor: 'var(--bg-primary)',
                border: '2px dashed var(--border-primary)',
              }}
            >
              <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>
                <Target className="w-8 h-8" style={{ color: 'var(--text-tertiary)' }} />
              </div>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>No Active Analysis</h3>
              <p className="text-xs max-w-sm" style={{ color: 'var(--text-secondary)' }}>
                Select a preset or paste a job description to calculate your match score.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
