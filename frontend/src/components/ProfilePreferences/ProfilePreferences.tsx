import React, { useState, useEffect } from 'react';
import { 
  User, 
  Sliders, 
  MapPin, 
  Target, 
  Briefcase, 
  GraduationCap, 
  Code2, 
  Save, 
  Sparkles, 
  Plus, 
  X, 
  Check, 
  CheckCircle2, 
  ExternalLink, 
  Linkedin, 
  Github, 
  Globe, 
  Mail, 
  Phone, 
  Building2, 
  Calendar, 
  Award, 
  Zap, 
  RefreshCw, 
  Layers, 
  Trash2, 
  Edit3, 
  Compass, 
  FileText,
  SlidersHorizontal,
  ChevronRight,
  ShieldCheck,
  Flame,
  Star,
  FolderGit2,
  Trophy,
  BadgeCheck,
  TrendingUp,
  Rocket,
  DollarSign,
  Clock,
  CheckSquare,
  Eye,
  Lock,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Lightbulb,
  Ban
} from 'lucide-react';
import { 
  UserProfileDetails, 
  UserPreferences, 
  EducationEntry, 
  ExperienceEntry,
  MarketIntelligenceResponse 
} from '../../types';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface ProfilePreferencesProps {
  onSuccessToast: (msg: string) => void;
  onErrorToast: (msg: string) => void;
  onNavigateToTab?: (tab: string) => void;
  onOpenSyncResume?: () => void;
  onOpenSyncGitHub?: () => void;
  onOpenSyncLinkedIn?: () => void;
}

type SectionTab = 
  | 'preferences' 
  | 'goals_companies' 
  | 'identity' 
  | 'skills' 
  | 'projects' 
  | 'education' 
  | 'experience' 
  | 'honors';

const DEFAULT_PREFERENCES: UserPreferences = {
  primary_role: 'Backend Engineer',
  priority_domain: 'Distributed Systems & Cloud',
  target_country: 'India',
  preferred_cities: ['Bengaluru', 'Noida / Delhi NCR', 'Hyderabad', 'Pune', 'Mumbai', 'Remote India'],
  work_modes: ['Remote', 'Hybrid', 'Onsite'],
  preferred_roles: ['Backend Engineer', 'Full Stack Developer', 'Software Engineer', 'AI/ML Engineer'],
  opportunity_types: ['jobs', 'internships', 'hackathons', 'opensource'],
  experience_level: 'Fresher / 0-3 yrs',
  min_salary: '₹8-18 LPA / $30k+ Remote',
  priority_factor: 'best_fit',
  dream_companies: ['Google', 'Razorpay', 'CRED', 'Stripe', 'Zepto'],
  blocked_companies: [],
  notice_period: 'Immediate (0-15 days)',
  work_authorization: 'Authorized in India & Remote Worldwide',
  spoken_languages: ['English (Professional)', 'Hindi (Native)'],
  career_goals: {
    target_milestone: 'Targeting SDE-1 / SDE-2 High-Growth Role',
    target_timeline: 'Next 30-90 Days',
    target_ctc: '₹15-28 LPA',
    focus_areas: ['Distributed Systems', 'Graph Databases', 'Agentic AI', 'High-Throughput APIs']
  },
  in_progress_skills: ['Kafka', 'Kubernetes', 'Vector Databases'],
  custom_locations: []
};

const DEFAULT_PROFILE: UserProfileDetails = {
  full_name: 'Candidate',
  email: '',
  phone: '',
  headline: 'Software Engineer | Python, FastAPI, React & Graph Systems',
  location: 'Bengaluru, India',
  bio: 'Software engineer passionate about building high-throughput backends, graph algorithms, and AI-powered developer workflows.',
  github_username: '',
  github_url: '',
  linkedin_url: '',
  portfolio_url: '',
  education: [
    {
      university: 'Anand Engineering College',
      degree: 'B.Tech in Computer Science & Engineering',
      field_of_study: 'Computer Science',
      start_date: '2021',
      end_date: '2025',
      gpa: '8.5'
    }
  ],
  experience: [
    {
      company: 'DRDO ADRDE',
      role: 'Cybersecurity & Software Engineering Intern',
      location: 'Agra, India',
      start_date: 'Jun 2024',
      end_date: 'Aug 2024',
      is_current: false,
      description: 'Engineered real-time anomalous network socket detection and automated packet analysis pipelines using Python and C++.'
    }
  ],
  projects: [
    {
      name: 'PathPrint Navigation Engine',
      description: 'Autonomous GraphRAG career copilot with Neo4j AST project verification and ATS scoring.',
      repo_url: 'https://github.com/mohitupraity/pathprint',
      live_url: '',
      primary_language: 'Python',
      tech_stack: ['Python', 'FastAPI', 'Neo4j', 'React', 'TypeScript', 'Docker'],
      stars: 4
    },
    {
      name: 'RecoverIQ Incident Platform',
      description: 'Automated cybersecurity threat intelligence and network socket analysis system.',
      repo_url: '',
      live_url: '',
      primary_language: 'Python',
      tech_stack: ['Python', 'C++', 'Docker', 'PostgreSQL'],
      stars: 2
    }
  ],
  certifications: [
    {
      name: 'Neo4j Certified Professional',
      issuer: 'Neo4j GraphAcademy',
      date: '2024',
      url: ''
    }
  ],
  achievements: [
    {
      title: 'Smart India Hackathon Finalist',
      organization: 'AICTE & Ministry of Education',
      date: '2024',
      description: 'Built distributed intelligence solution selected among top national teams.'
    }
  ],
  skills: [
    'Python', 'FastAPI', 'Neo4j', 'React', 'Docker', 'PostgreSQL', 
    'TypeScript', 'Redis', 'Git', 'REST APIs', 'System Design', 'GraphRAG'
  ],
  preferences: DEFAULT_PREFERENCES
};

const POPULAR_INDIAN_CITIES = [
  'Bengaluru',
  'Noida / Delhi NCR',
  'Gurugram',
  'Hyderabad',
  'Pune',
  'Mumbai',
  'Chennai',
  'Kolkata',
  'Remote India'
];

const POPULAR_ROLES = [
  'Backend Engineer',
  'Full Stack Developer',
  'Software Engineer',
  'AI/ML Engineer',
  'Graph Intelligence Engineer',
  'Frontend Developer',
  'DevOps & Cloud Engineer',
  'Systems & Security Engineer',
  'Data Engineer'
];

const DOMAIN_FOCUS_OPTIONS = [
  { id: 'Distributed Systems & Cloud', label: 'Distributed Systems & Cloud', desc: 'High-scale backends, microservices, Docker & Kubernetes' },
  { id: 'AI / LLM & Graph Intelligence', label: 'AI, LLMs & Graph Intelligence', desc: 'Generative AI, GraphRAG, Neo4j, PyTorch & Vector DBs' },
  { id: 'Full Stack Web & Mobile', label: 'Full Stack Web & Mobile', desc: 'React, Next.js, Node.js, TypeScript & Modern UI' },
  { id: 'Cybersecurity & Systems', label: 'Cybersecurity & Low-Level Systems', desc: 'Packet inspection, socket programming, C++, Linux & eBPF' },
  { id: 'Fintech & Transactional Scale', label: 'Fintech & High-Reliability', desc: 'Payment gateways, ACID compliance, Kafka & low-latency engines' },
  { id: 'Open Source & Developer Tooling', label: 'Open Source & Dev Tools', desc: 'Compilers, CLI tools, developer frameworks & SDKs' }
];

const POPULAR_DREAM_COMPANIES = [
  'Google', 'Razorpay', 'CRED', 'Stripe', 'Zepto', 'Uber', 'Atlassian', 
  'Microsoft', 'Flipkart', 'Postman', 'Blinkit', 'Zomato', 'Swiggy', 'PhonePe', 'Amazon'
];

const NOTICE_PERIOD_OPTIONS = [
  'Immediate (0-15 days)',
  '15 - 30 Days',
  '30 - 60 Days',
  '60+ Days',
  'Currently Studying / Student Intern'
];

const WORK_AUTH_OPTIONS = [
  'Authorized in India & Remote Worldwide',
  'Indian Citizen (Requires International Sponsorship)',
  'US Citizen / Green Card Holder',
  'EU / UK Work Permit Holder',
  'Open to Relocation'
];

const POPULAR_SKILLS_SUGGESTIONS = [
  'Python', 'FastAPI', 'React', 'TypeScript', 'Node.js', 'Go', 'Java', 'C++',
  'Docker', 'Kubernetes', 'AWS', 'PostgreSQL', 'MongoDB', 'Redis', 'Neo4j',
  'GraphQL', 'Next.js', 'TailwindCSS', 'Kafka', 'System Design', 'Git', 'Linux'
];

const normalizeArray = (val: any): string[] => {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter(Boolean).map(String);
  if (typeof val === 'string') {
    return val.split(/[,|/]/).map(s => s.trim()).filter(Boolean);
  }
  return [];
};

export const ProfilePreferences: React.FC<ProfilePreferencesProps> = ({
  onSuccessToast,
  onErrorToast,
  onNavigateToTab,
  onOpenSyncResume,
  onOpenSyncGitHub,
  onOpenSyncLinkedIn
}) => {
  const { getAuthHeaders, activeProfile, updateActiveProfile } = useAuth();
  const [activeSection, setActiveSection] = useState<SectionTab>('preferences');
  const [profile, setProfile] = useState<UserProfileDetails>(DEFAULT_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Inputs for adding items
  const [newSkillInput, setNewSkillInput] = useState('');
  const [newCityInput, setNewCityInput] = useState('');
  const [newRoleInput, setNewRoleInput] = useState('');
  const [newDreamCompanyInput, setNewDreamCompanyInput] = useState('');
  const [newBlockedCompanyInput, setNewBlockedCompanyInput] = useState('');
  const [newLanguageInput, setNewLanguageInput] = useState('');
  const [newFocusAreaInput, setNewFocusAreaInput] = useState('');

  // Modals for adding Education / Experience / Projects / Certs / Achievements
  const [isAddingEdu, setIsAddingEdu] = useState(false);
  const [newEdu, setNewEdu] = useState<EducationEntry>({
    university: '',
    degree: '',
    field_of_study: '',
    start_date: '',
    end_date: '',
    gpa: ''
  });

  const [isAddingExp, setIsAddingExp] = useState(false);
  const [newExp, setNewExp] = useState<ExperienceEntry>({
    company: '',
    role: '',
    location: '',
    start_date: '',
    end_date: '',
    is_current: false,
    description: '',
    bullets: []
  });

  const [isAddingProj, setIsAddingProj] = useState(false);
  const [newProj, setNewProj] = useState<{
    name: string;
    description: string;
    repo_url: string;
    live_url: string;
    primary_language: string;
    tech_stack: string[];
    stars: number;
  }>({
    name: '',
    description: '',
    repo_url: '',
    live_url: '',
    primary_language: 'Python',
    tech_stack: [],
    stars: 0
  });
  const [projTechInput, setProjTechInput] = useState('');

  const [isAddingCert, setIsAddingCert] = useState(false);
  const [newCert, setNewCert] = useState({ name: '', issuer: '', date: '', url: '' });

  const [isAddingAch, setIsAddingAch] = useState(false);
  const [newAch, setNewAch] = useState({ title: '', organization: '', date: '', description: '' });

  useEffect(() => {
    loadProfileDetails();
  }, [activeProfile.id]);

  const loadProfileDetails = async () => {
    setLoading(true);
    try {
      const res = await apiService.getProfileDetails(getAuthHeaders());
      if (res.profile) {
        const mergedPrefs = {
          ...DEFAULT_PREFERENCES,
          ...(res.profile.preferences || {})
        };
        setProfile({
          ...DEFAULT_PROFILE,
          ...res.profile,
          preferences: mergedPrefs
        });
      }
    } catch (err: any) {
      console.warn('Could not load profile from backend, using defaults:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const res = await apiService.updateProfileDetails(profile, getAuthHeaders());
      if (res.profile) {
        setProfile(res.profile);
      }
      // Update AuthContext active profile display
      updateActiveProfile({
        name: profile.full_name || 'Candidate',
        role: profile.headline || profile.preferences.primary_role || 'Software Engineer',
        githubUser: profile.github_username || ''
      });
      setHasUnsavedChanges(false);
      onSuccessToast('Profile & Career Preferences saved successfully! Recommendations updated.');
    } catch (err: any) {
      onErrorToast(err.message || 'Failed to save profile changes');
    } finally {
      setSaving(false);
    }
  };

  // Preference Mutation Helpers
  const updatePreferenceField = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    setProfile(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [key]: value
      }
    }));
    setHasUnsavedChanges(true);
  };

  const toggleCity = (city: string) => {
    const current = profile.preferences.preferred_cities || [];
    const exists = current.includes(city);
    const updated = exists ? current.filter(c => c !== city) : [...current, city];
    updatePreferenceField('preferred_cities', updated);
  };

  const addCustomCity = () => {
    const c = newCityInput.trim();
    if (!c) return;
    const current = profile.preferences.preferred_cities || [];
    if (!current.includes(c)) {
      updatePreferenceField('preferred_cities', [...current, c]);
    }
    setNewCityInput('');
  };

  const toggleRole = (role: string) => {
    const current = profile.preferences.preferred_roles || [];
    const exists = current.includes(role);
    const updated = exists ? current.filter(r => r !== role) : [...current, role];
    updatePreferenceField('preferred_roles', updated);
  };

  const addCustomRole = () => {
    const r = newRoleInput.trim();
    if (!r) return;
    const current = profile.preferences.preferred_roles || [];
    if (!current.includes(r)) {
      updatePreferenceField('preferred_roles', [...current, r]);
    }
    setNewRoleInput('');
  };

  const toggleWorkMode = (mode: string) => {
    const current = profile.preferences.work_modes || [];
    const exists = current.includes(mode);
    const updated = exists ? current.filter(m => m !== mode) : [...current, mode];
    updatePreferenceField('work_modes', updated);
  };

  const toggleOpportunityType = (type: string) => {
    const current = profile.preferences.opportunity_types || [];
    const exists = current.includes(type);
    const updated = exists ? current.filter(t => t !== type) : [...current, type];
    updatePreferenceField('opportunity_types', updated);
  };

  // Skill Mutation Helpers
  const addSkill = (skillName: string) => {
    const s = skillName.trim();
    if (!s) return;
    const current = profile.skills || [];
    if (!current.some(item => item.toLowerCase() === s.toLowerCase())) {
      setProfile(prev => ({
        ...prev,
        skills: [...(prev.skills || []), s]
      }));
      setHasUnsavedChanges(true);
    }
    setNewSkillInput('');
  };

  const removeSkill = (skillName: string) => {
    setProfile(prev => ({
      ...prev,
      skills: (prev.skills || []).filter(s => s.toLowerCase() !== skillName.toLowerCase())
    }));
    setHasUnsavedChanges(true);
  };

  // Education Helpers
  const handleAddEdu = () => {
    if (!newEdu.university) {
      onErrorToast('Please enter a university or college name');
      return;
    }
    setProfile(prev => ({
      ...prev,
      education: [...(prev.education || []), newEdu]
    }));
    setNewEdu({ university: '', degree: '', field_of_study: '', start_date: '', end_date: '', gpa: '' });
    setIsAddingEdu(false);
    setHasUnsavedChanges(true);
  };

  const removeEdu = (index: number) => {
    setProfile(prev => ({
      ...prev,
      education: (prev.education || []).filter((_, i) => i !== index)
    }));
    setHasUnsavedChanges(true);
  };

  // Experience Helpers
  const handleAddExp = () => {
    if (!newExp.company) {
      onErrorToast('Please enter a company name');
      return;
    }
    setProfile(prev => ({
      ...prev,
      experience: [...(prev.experience || []), newExp]
    }));
    setNewExp({ company: '', role: '', location: '', start_date: '', end_date: '', is_current: false, description: '', bullets: [] });
    setIsAddingExp(false);
    setHasUnsavedChanges(true);
  };

  const removeExp = (index: number) => {
    setProfile(prev => ({
      ...prev,
      experience: (prev.experience || []).filter((_, i) => i !== index)
    }));
    setHasUnsavedChanges(true);
  };

  // Projects Helpers
  const handleAddProj = () => {
    if (!newProj.name) {
      onErrorToast('Please enter a project title');
      return;
    }
    setProfile(prev => ({
      ...prev,
      projects: [...(prev.projects || []), newProj]
    }));
    setNewProj({ name: '', description: '', repo_url: '', live_url: '', primary_language: 'Python', tech_stack: [], stars: 0 });
    setIsAddingProj(false);
    setHasUnsavedChanges(true);
  };

  const removeProj = (index: number) => {
    setProfile(prev => ({
      ...prev,
      projects: (prev.projects || []).filter((_, i) => i !== index)
    }));
    setHasUnsavedChanges(true);
  };

  // Certifications Helpers
  const handleAddCert = () => {
    if (!newCert.name) {
      onErrorToast('Please enter certification name');
      return;
    }
    setProfile(prev => ({
      ...prev,
      certifications: [...(prev.certifications || []), newCert]
    }));
    setNewCert({ name: '', issuer: '', date: '', url: '' });
    setIsAddingCert(false);
    setHasUnsavedChanges(true);
  };

  const removeCert = (index: number) => {
    setProfile(prev => ({
      ...prev,
      certifications: (prev.certifications || []).filter((_, i) => i !== index)
    }));
    setHasUnsavedChanges(true);
  };

  // Achievements Helpers
  const handleAddAch = () => {
    if (!newAch.title) {
      onErrorToast('Please enter achievement title');
      return;
    }
    setProfile(prev => ({
      ...prev,
      achievements: [...(prev.achievements || []), newAch]
    }));
    setNewAch({ title: '', organization: '', date: '', description: '' });
    setIsAddingAch(false);
    setHasUnsavedChanges(true);
  };

  const removeAch = (index: number) => {
    setProfile(prev => ({
      ...prev,
      achievements: (prev.achievements || []).filter((_, i) => i !== index)
    }));
    setHasUnsavedChanges(true);
  };

  // Calculate completeness score
  const calculateCompleteness = () => {
    let score = 20;
    if (profile.full_name && profile.full_name !== 'Candidate') score += 10;
    if (profile.headline) score += 10;
    if (profile.location) score += 5;
    if (profile.skills && profile.skills.length >= 5) score += 15;
    if (profile.projects && profile.projects.length > 0) score += 15;
    if (profile.education && profile.education.length > 0) score += 10;
    if (profile.experience && profile.experience.length > 0) score += 10;
    if (profile.github_username || profile.github_url) score += 5;
    return Math.min(score, 100);
  };

  const completeness = calculateCompleteness();

  if (loading) {
    return (
      <div className="p-16 text-center space-y-3 rounded-2xl border" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-primary)' }}>
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600" />
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Loading your PathPrint Profile & Preferences...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20 animate-in fade-in duration-200">
      {/* Top Header Card */}
      <div 
        className="p-6 rounded-3xl border shadow-sm relative overflow-hidden"
        style={{ 
          backgroundColor: 'var(--bg-primary)', 
          borderColor: 'var(--border-primary)'
        }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* User Info Avatar & Title */}
          <div className="flex items-start sm:items-center gap-4">
            <div className="relative shrink-0">
              <div 
                className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-2xl font-black shadow-lg"
                style={{ border: '3px solid var(--bg-primary)' }}
              >
                {(profile.full_name || 'U').charAt(0).toUpperCase()}
              </div>
              <span 
                className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2"
                style={{ borderColor: 'var(--bg-primary)' }}
                title="Knowledge Graph Synced"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  {profile.full_name || 'Candidate Profile'}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-blue-600" />
                  Live Graph Synced
                </span>
                {hasUnsavedChanges && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 animate-pulse">
                    Unsaved Changes
                  </span>
                )}
              </div>
              <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                {profile.headline || 'Software Engineer'}
              </p>
              <div className="flex items-center gap-3 text-[11px] pt-1" style={{ color: 'var(--text-tertiary)' }}>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-blue-600" />
                  {profile.location || 'Location Not Set'}
                </span>
                <span className="flex items-center gap-1">
                  <Target className="w-3 h-3 text-indigo-600" />
                  1st Choice: <strong>{profile.preferences.primary_role || 'Backend Engineer'}</strong>
                </span>
                <span className="flex items-center gap-1">
                  <FolderGit2 className="w-3 h-3 text-purple-600" />
                  {(profile.projects || []).length} Projects
                </span>
              </div>
            </div>
          </div>

          {/* Quick Metrics & Actions */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Completeness Meter */}
            <div 
              className="p-3 px-4 rounded-2xl border flex items-center gap-3 shadow-sm"
              style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-primary)' }}
            >
              <div className="relative w-10 h-10 flex items-center justify-center">
                <svg className="w-10 h-10 -rotate-90">
                  <circle
                    cx="20"
                    cy="20"
                    r="16"
                    className="stroke-gray-200 dark:stroke-gray-700"
                    strokeWidth="3.5"
                    fill="transparent"
                  />
                  <circle
                    cx="20"
                    cy="20"
                    r="16"
                    className="stroke-blue-600 transition-all duration-500"
                    strokeWidth="3.5"
                    strokeDasharray="100"
                    strokeDashoffset={100 - completeness}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>
                <span className="absolute text-[10px] font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
                  {completeness}%
                </span>
              </div>
              <div>
                <span className="block text-[10px] uppercase font-bold tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                  Profile Strength
                </span>
                <span className="block text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {completeness >= 80 ? 'Ready for Matching' : 'Needs More Info'}
                </span>
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveAll}
              disabled={saving}
              className="px-5 py-2.5 rounded-2xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-98 shadow-md flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Syncing to Graph...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Profile & Preferences</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Sync Quick Launch Tray */}
        <div className="mt-5 pt-4 border-t flex flex-wrap items-center justify-between gap-3 text-xs" style={{ borderColor: 'var(--border-primary)' }}>
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Auto-populate from external sources:</span>
          </div>

          <div className="flex items-center gap-2">
            {onOpenSyncResume && (
              <button
                onClick={onOpenSyncResume}
                className="px-3 py-1.5 rounded-xl border font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 transition-all flex items-center gap-1.5"
                style={{ borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
              >
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>Upload Resume</span>
              </button>
            )}

            {onOpenSyncGitHub && (
              <button
                onClick={onOpenSyncGitHub}
                className="px-3 py-1.5 rounded-xl border font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 transition-all flex items-center gap-1.5"
                style={{ borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
              >
                <Github className="w-3.5 h-3.5 text-slate-800 dark:text-slate-200" />
                <span>Sync GitHub Repos</span>
              </button>
            )}

            {onOpenSyncLinkedIn && (
              <button
                onClick={onOpenSyncLinkedIn}
                className="px-3 py-1.5 rounded-xl border font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 transition-all flex items-center gap-1.5"
                style={{ borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
              >
                <Linkedin className="w-3.5 h-3.5 text-blue-600" />
                <span>Import Connections</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b pb-3" style={{ borderColor: 'var(--border-primary)' }}>
        {[
          { id: 'preferences' as SectionTab, label: '🎯 Recommendations & Preferences', icon: SlidersHorizontal },
          { id: 'goals_companies' as SectionTab, label: '🚀 Career Goals & Dream Companies', icon: Target },
          { id: 'identity' as SectionTab, label: '👤 Personal Info & Socials', icon: User },
          { id: 'skills' as SectionTab, label: '⚡ Skills & Tech Stack', icon: Code2 },
          { id: 'projects' as SectionTab, label: '🚀 Featured Projects', icon: FolderGit2 },
          { id: 'education' as SectionTab, label: '🎓 Education', icon: GraduationCap },
          { id: 'experience' as SectionTab, label: '💼 Experience', icon: Briefcase },
          { id: 'honors' as SectionTab, label: '🏆 Achievements & Certs', icon: Trophy }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border ${
                isActive
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-102'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800 border-gray-200 dark:border-gray-800'
              }`}
              style={{
                backgroundColor: isActive ? undefined : 'var(--bg-primary)',
                color: isActive ? '#ffffff' : 'var(--text-secondary)'
              }}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SECTION 1: Career & Match Preferences */}
      {activeSection === 'preferences' && (
        <div className="space-y-6">
          {/* Live Impact Explanation Box */}
          <div 
            className="p-4 rounded-2xl border flex items-start gap-3.5 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-900"
          >
            <Zap className="w-5 h-5 text-blue-600 shrink-0 mt-0.5 fill-blue-600" />
            <div className="space-y-1 text-xs">
              <h4 className="font-bold text-blue-900 dark:text-blue-200">
                How your preferences power your recommendations
              </h4>
              <p className="text-blue-800/90 dark:text-blue-300">
                PathPrint prioritizes <strong>{profile.preferences.primary_role || 'your target role'}</strong> opportunities matching <strong>{profile.preferences.priority_domain || 'your domain'}</strong> in <strong>{(profile.preferences.preferred_cities || []).slice(0, 3).join(', ')}</strong> across <strong>{profile.preferences.target_country}</strong>. Nothing is hardcoded — edits take effect across Opportunities Radar, Job Matchmaker, and Referral Hub immediately upon saving.
              </p>
            </div>
          </div>

          {/* Quick link to Career Growth Hub */}
          <div className="p-4 rounded-2xl border flex items-center justify-between gap-3 bg-gradient-to-r from-blue-50/60 via-indigo-50/60 to-purple-50/60 dark:from-blue-950/20 dark:via-indigo-950/20 dark:to-purple-950/20" style={{ borderColor: 'var(--border-primary)' }}>
            <div className="flex items-center gap-2.5">
              <TrendingUp className="w-4 h-4 text-blue-600 shrink-0" />
              <div className="text-xs">
                <span className="font-bold text-gray-900 dark:text-gray-100">Want to discover high-ROI skill gaps & start 2-week project sprints?</span>
                <span className="block text-gray-500 dark:text-gray-400">See which missing skills unlock the most high-paying opportunities.</span>
              </div>
            </div>
            {onNavigateToTab && (
              <button
                type="button"
                onClick={() => onNavigateToTab('growth')}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shrink-0 flex items-center gap-1 shadow-xs transition-all"
              >
                <span>Open Growth Hub</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. 1st Choice Target Role (Primary Priority) */}
            <div 
              className="p-6 rounded-3xl border space-y-4 shadow-sm"
              style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-primary)' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600">
                    <Target className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                      1. Primary Target Role (1st Choice)
                    </h3>
                    <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                      The #1 role PathPrint will prioritize above all else in job matching.
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  Priority 1
                </span>
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  value={profile.preferences.primary_role || ''}
                  onChange={(e) => updatePreferenceField('primary_role', e.target.value)}
                  placeholder="e.g. Backend Engineer, AI/ML Engineer, Full Stack Developer..."
                  className="input-base w-full text-sm font-bold"
                />

                {/* Quick Select Popular Roles */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-semibold text-gray-400">Quick Select:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {POPULAR_ROLES.map(role => {
                      const isCurrent = profile.preferences.primary_role === role;
                      return (
                        <button
                          key={role}
                          type="button"
                          onClick={() => updatePreferenceField('primary_role', role)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all border ${
                            isCurrent
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                              : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100'
                          }`}
                        >
                          {role}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Priority Domain / Engineering Focus */}
            <div 
              className="p-6 rounded-3xl border space-y-4 shadow-sm"
              style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-primary)' }}
            >
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                    2. Priority Domain & Industry Focus
                  </h3>
                  <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                    Which tech specialization do you want to highlight in ATS tailoring & recommendations?
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {DOMAIN_FOCUS_OPTIONS.map(dom => {
                  const isSelected = profile.preferences.priority_domain === dom.id;
                  return (
                    <button
                      key={dom.id}
                      type="button"
                      onClick={() => updatePreferenceField('priority_domain', dom.id)}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 font-bold shadow-sm ring-1 ring-purple-500'
                          : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      <div className="text-xs font-bold flex items-center justify-between">
                        <span>{dom.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-purple-600" />}
                      </div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 pt-1">
                        {dom.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Geographic Scope & Target Country */}
            <div 
              className="p-6 rounded-3xl border space-y-4 shadow-sm"
              style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-primary)' }}
            >
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                    3. Target Country & Location Mode
                  </h3>
                  <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                    Filter opportunities strictly according to geographic availability.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { id: 'India', label: '🇮🇳 India & Remote', desc: 'Bengaluru, NCR, Pune + Remote' },
                  { id: 'Remote Worldwide', label: '🌐 100% Remote', desc: 'Global & Remote-First' },
                  { id: 'All', label: '🌍 All Locations', desc: 'India, US, Europe & Global' }
                ].map(loc => {
                  const isSelected = profile.preferences.target_country === loc.id;
                  return (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => updatePreferenceField('target_country', loc.id)}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-bold shadow-sm ring-1 ring-blue-500'
                          : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-850'
                      }`}
                    >
                      <div className="text-xs font-bold">{loc.label}</div>
                      <div className="text-[10px] text-gray-500 pt-0.5">{loc.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Preferred Cities & Tech Hubs */}
            <div 
              className="p-6 rounded-3xl border space-y-4 shadow-sm"
              style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-primary)' }}
            >
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                    4. Preferred Cities / Tech Hubs
                  </h3>
                  <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                    Select or add cities you are open to working in.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {POPULAR_INDIAN_CITIES.map(city => {
                  const isSelected = (profile.preferences.preferred_cities || []).includes(city);
                  return (
                    <button
                      key={city}
                      type="button"
                      onClick={() => toggleCity(city)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                      <span>{city}</span>
                    </button>
                  );
                })}

                {/* Custom Cities */}
                {(profile.preferences.preferred_cities || [])
                  .filter(c => !POPULAR_INDIAN_CITIES.includes(c))
                  .map(c => (
                    <span
                      key={c}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 text-white border border-emerald-600 flex items-center gap-1.5"
                    >
                      <Check className="w-3 h-3" />
                      <span>{c}</span>
                      <button onClick={() => toggleCity(c)} className="hover:text-emerald-200">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
              </div>

              {/* Add Custom City */}
              <div className="flex items-center gap-2 pt-1 max-w-sm">
                <input
                  type="text"
                  placeholder="Add custom city (e.g. Chandigarh, Ahmedabad)..."
                  value={newCityInput}
                  onChange={(e) => setNewCityInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomCity(); } }}
                  className="input-base flex-1 text-xs"
                />
                <button
                  type="button"
                  onClick={addCustomCity}
                  className="px-3 py-1.5 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-semibold hover:bg-gray-300"
                >
                  Add
                </button>
              </div>
            </div>

            {/* 5. Additional Target Roles */}
            <div 
              className="p-6 rounded-3xl border space-y-4 shadow-sm"
              style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-primary)' }}
            >
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600">
                  <Compass className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                    5. Secondary Target Roles
                  </h3>
                  <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                    Other positions you want included in your Opportunity Radar feeds.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {POPULAR_ROLES.map(role => {
                  const isSelected = (profile.preferences.preferred_roles || []).includes(role);
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => toggleRole(role)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                      <span>{role}</span>
                    </button>
                  );
                })}

                {/* Custom Roles */}
                {(profile.preferences.preferred_roles || [])
                  .filter(r => !POPULAR_ROLES.includes(r))
                  .map(r => (
                    <span
                      key={r}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 text-white border border-indigo-600 flex items-center gap-1.5"
                    >
                      <Check className="w-3 h-3" />
                      <span>{r}</span>
                      <button onClick={() => toggleRole(r)} className="hover:text-indigo-200">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
              </div>

              <div className="flex items-center gap-2 pt-1 max-w-sm">
                <input
                  type="text"
                  placeholder="Add role (e.g. Site Reliability Engineer)..."
                  value={newRoleInput}
                  onChange={(e) => setNewRoleInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomRole(); } }}
                  className="input-base flex-1 text-xs"
                />
                <button
                  type="button"
                  onClick={addCustomRole}
                  className="px-3 py-1.5 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-semibold hover:bg-gray-300"
                >
                  Add
                </button>
              </div>
            </div>

            {/* 6. Work Modes & Compensation Expectation */}
            <div 
              className="p-6 rounded-3xl border space-y-4 shadow-sm"
              style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-primary)' }}
            >
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                    6. Work Modes & Target CTC / Stipend
                  </h3>
                  <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                    Set your minimum compensation threshold & allowed work arrangements.
                  </p>
                </div>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Accepted Work Modes:
                  </label>
                  <div className="flex items-center gap-2">
                    {['Remote', 'Hybrid', 'Onsite'].map(mode => {
                      const isSelected = (profile.preferences.work_modes || []).includes(mode);
                      return (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => toggleWorkMode(mode)}
                          className={`px-3.5 py-1.5 rounded-xl border font-semibold flex items-center gap-1.5 transition-all ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                              : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                          <span>{mode}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Target Minimum Compensation / Stipend:
                  </label>
                  <input
                    type="text"
                    value={profile.preferences.min_salary || ''}
                    onChange={(e) => updatePreferenceField('min_salary', e.target.value)}
                    placeholder="e.g. ₹8 - 20 LPA / $30k+ Remote"
                    className="input-base w-full text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Opportunity Types:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'jobs', label: 'Full-time Jobs' },
                      { id: 'internships', label: 'Paid Internships' },
                      { id: 'hackathons', label: 'Hackathons & Challenges' },
                      { id: 'opensource', label: 'Open Source Programs' }
                    ].map(type => {
                      const isSelected = (profile.preferences.opportunity_types || []).includes(type.id);
                      return (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => toggleOpportunityType(type.id)}
                          className={`px-3 py-1.5 rounded-xl border font-medium flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                              : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                          <span>{type.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION: Career Goals & Target Companies */}
      {activeSection === 'goals_companies' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div 
            className="p-5 rounded-3xl border flex items-start gap-3.5 bg-gradient-to-r from-purple-50/80 via-indigo-50/80 to-blue-50/80 dark:from-purple-950/30 dark:via-indigo-950/30 dark:to-blue-950/30 border-purple-200 dark:border-purple-900 shadow-sm"
          >
            <div className="p-2.5 rounded-2xl bg-purple-600 text-white shrink-0 mt-0.5 shadow-md">
              <Rocket className="w-5 h-5" />
            </div>
            <div className="space-y-1 text-xs">
              <h4 className="font-bold text-sm text-purple-950 dark:text-purple-200">
                Career Vision, Target Companies & Notice Period Matrix
              </h4>
              <p className="text-purple-900/90 dark:text-purple-300 leading-relaxed">
                Define your ambitious target milestones, pin dream companies for priority matching, block unwanted recruiters, and set your availability date. PathPrint syncs these parameters directly with live opportunity scoring.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. Career Goals & Milestone */}
            <div 
              className="p-6 rounded-3xl border space-y-4 shadow-sm"
              style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-primary)' }}
            >
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                    1. Target Milestone & Timeline
                  </h3>
                  <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                    Your primary ambition and expected transition timeframe.
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                    Target Role / Transition Milestone:
                  </label>
                  <input
                    type="text"
                    value={profile.preferences.career_goals?.target_milestone || ''}
                    onChange={(e) => {
                      const currentGoals = profile.preferences.career_goals || {};
                      updatePreferenceField('career_goals', { ...currentGoals, target_milestone: e.target.value });
                    }}
                    placeholder="e.g. SDE-1 to SDE-2 High-Growth Role, Backend to AI Engineer..."
                    className="input-base w-full text-xs font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                      Target Timeline:
                    </label>
                    <select
                      value={profile.preferences.career_goals?.target_timeline || 'Next 30-90 Days'}
                      onChange={(e) => {
                        const currentGoals = profile.preferences.career_goals || {};
                        updatePreferenceField('career_goals', { ...currentGoals, target_timeline: e.target.value });
                      }}
                      className="input-base w-full text-xs"
                    >
                      <option value="Immediate (Next 30 Days)">Immediate (Next 30 Days)</option>
                      <option value="Next 30-90 Days">Next 30-90 Days</option>
                      <option value="3 - 6 Months">3 - 6 Months</option>
                      <option value="6 - 12 Months">6 - 12 Months</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                      Target CTC / Compensation:
                    </label>
                    <input
                      type="text"
                      value={profile.preferences.career_goals?.target_ctc || ''}
                      onChange={(e) => {
                        const currentGoals = profile.preferences.career_goals || {};
                        updatePreferenceField('career_goals', { ...currentGoals, target_ctc: e.target.value });
                      }}
                      placeholder="e.g. ₹15 - 28 LPA / $40k+ Remote"
                      className="input-base w-full text-xs"
                    />
                  </div>
                </div>

                {/* Focus Core Areas */}
                <div className="pt-2">
                  <label className="block font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Core Technical Focus Areas:
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {(profile.preferences.career_goals?.focus_areas || []).map((area, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center gap-1.5"
                      >
                        <span>{area}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const current = profile.preferences.career_goals?.focus_areas || [];
                            const updated = current.filter((_, i) => i !== idx);
                            updatePreferenceField('career_goals', { ...(profile.preferences.career_goals || {}), focus_areas: updated });
                          }}
                          className="hover:text-purple-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Add focus area (e.g. Distributed Consensus, GraphRAG)..."
                      value={newFocusAreaInput}
                      onChange={(e) => setNewFocusAreaInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const val = newFocusAreaInput.trim();
                          if (val) {
                            const current = profile.preferences.career_goals?.focus_areas || [];
                            if (!current.includes(val)) {
                              updatePreferenceField('career_goals', { ...(profile.preferences.career_goals || {}), focus_areas: [...current, val] });
                            }
                            setNewFocusAreaInput('');
                          }
                        }
                      }}
                      className="input-base flex-1 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = newFocusAreaInput.trim();
                        if (val) {
                          const current = profile.preferences.career_goals?.focus_areas || [];
                          if (!current.includes(val)) {
                            updatePreferenceField('career_goals', { ...(profile.preferences.career_goals || {}), focus_areas: [...current, val] });
                          }
                          setNewFocusAreaInput('');
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Dream Companies (Wishlist) */}
            <div 
              className="p-6 rounded-3xl border space-y-4 shadow-sm"
              style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-primary)' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                      2. Dream Target Companies (Wishlist)
                    </h3>
                    <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                      Jobs from these companies get a +6% score boost & glowing badge.
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  +6% Priority Boost
                </span>
              </div>

              {/* Active Dream Companies Tags */}
              <div className="flex flex-wrap gap-1.5 min-h-[42px] p-2.5 rounded-2xl border bg-gray-50/50 dark:bg-gray-900/30" style={{ borderColor: 'var(--border-primary)' }}>
                {(profile.preferences.dream_companies || []).map((comp) => (
                  <span
                    key={comp}
                    className="px-3 py-1 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1.5 shadow-sm"
                  >
                    <Building2 className="w-3 h-3 text-emerald-600" />
                    <span>{comp}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const current = profile.preferences.dream_companies || [];
                        updatePreferenceField('dream_companies', current.filter(c => c.toLowerCase() !== comp.toLowerCase()));
                      }}
                      className="hover:text-emerald-600 ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {(!profile.preferences.dream_companies || profile.preferences.dream_companies.length === 0) && (
                  <span className="text-xs text-gray-400 italic flex items-center gap-1">
                    No dream companies pinned yet. Pick below or type to add.
                  </span>
                )}
              </div>

              {/* Add Custom Dream Company */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Type company name (e.g. Google, Stripe, CRED)..."
                  value={newDreamCompanyInput}
                  onChange={(e) => setNewDreamCompanyInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const c = newDreamCompanyInput.trim();
                      if (c) {
                        const current = profile.preferences.dream_companies || [];
                        if (!current.some(x => x.toLowerCase() === c.toLowerCase())) {
                          updatePreferenceField('dream_companies', [...current, c]);
                        }
                        setNewDreamCompanyInput('');
                      }
                    }
                  }}
                  className="input-base flex-1 text-xs font-medium"
                />
                <button
                  type="button"
                  onClick={() => {
                    const c = newDreamCompanyInput.trim();
                    if (c) {
                      const current = profile.preferences.dream_companies || [];
                      if (!current.some(x => x.toLowerCase() === c.toLowerCase())) {
                        updatePreferenceField('dream_companies', [...current, c]);
                      }
                      setNewDreamCompanyInput('');
                    }
                  }}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-sm"
                >
                  Pin Company
                </button>
              </div>

              {/* Quick Suggestions */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-semibold text-gray-400">Popular Tech Unicorns:</span>
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_DREAM_COMPANIES.map(comp => {
                    const isPinned = (profile.preferences.dream_companies || []).some(x => x.toLowerCase() === comp.toLowerCase());
                    return (
                      <button
                        key={comp}
                        type="button"
                        onClick={() => {
                          const current = profile.preferences.dream_companies || [];
                          if (isPinned) {
                            updatePreferenceField('dream_companies', current.filter(x => x.toLowerCase() !== comp.toLowerCase()));
                          } else {
                            updatePreferenceField('dream_companies', [...current, comp]);
                          }
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all border ${
                          isPinned
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100'
                        }`}
                      >
                        {isPinned ? `✓ ${comp}` : `+ ${comp}`}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 3. Availability & Notice Period */}
            <div 
              className="p-6 rounded-3xl border space-y-4 shadow-sm"
              style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-primary)' }}
            >
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                    3. Notice Period & Work Authorization
                  </h3>
                  <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                    Recruiters filter aggressively on immediate joining and work permits.
                  </p>
                </div>
              </div>

              <div className="space-y-3.5 text-xs">
                {/* Notice Period */}
                <div>
                  <label className="block font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Notice Period / Availability:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {NOTICE_PERIOD_OPTIONS.map((opt) => {
                      const isSelected = profile.preferences.notice_period === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => updatePreferenceField('notice_period', opt)}
                          className={`p-2.5 rounded-xl border text-left font-medium transition-all ${
                            isSelected
                              ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                              : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{opt}</span>
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Work Authorization */}
                <div>
                  <label className="block font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                    Work Authorization / Visa Status:
                  </label>
                  <select
                    value={profile.preferences.work_authorization || WORK_AUTH_OPTIONS[0]}
                    onChange={(e) => updatePreferenceField('work_authorization', e.target.value)}
                    className="input-base w-full text-xs font-medium"
                  >
                    {WORK_AUTH_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                {/* Spoken Languages */}
                <div>
                  <label className="block font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Spoken Languages:
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {(profile.preferences.spoken_languages || []).map((lang, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 flex items-center gap-1.5"
                      >
                        <Globe className="w-3 h-3 text-blue-500" />
                        <span>{lang}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const current = profile.preferences.spoken_languages || [];
                            updatePreferenceField('spoken_languages', current.filter((_, i) => i !== idx));
                          }}
                          className="hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Add language (e.g. English - Professional, Hindi - Native)..."
                      value={newLanguageInput}
                      onChange={(e) => setNewLanguageInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const val = newLanguageInput.trim();
                          if (val) {
                            const current = profile.preferences.spoken_languages || [];
                            if (!current.includes(val)) {
                              updatePreferenceField('spoken_languages', [...current, val]);
                            }
                            setNewLanguageInput('');
                          }
                        }
                      }}
                      className="input-base flex-1 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = newLanguageInput.trim();
                        if (val) {
                          const current = profile.preferences.spoken_languages || [];
                          if (!current.includes(val)) {
                            updatePreferenceField('spoken_languages', [...current, val]);
                          }
                          setNewLanguageInput('');
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-semibold hover:bg-gray-300"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Excluded / Blocked Companies */}
            <div 
              className="p-6 rounded-3xl border space-y-4 shadow-sm"
              style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-primary)' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-red-100 dark:bg-red-950 text-red-600">
                    <Ban className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                      4. Excluded Companies (Blocklist)
                    </h3>
                    <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                      Organizations you never want to see in your Radar feeds.
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
                  Muted
                </span>
              </div>

              {/* Active Blocked Companies Tags */}
              <div className="flex flex-wrap gap-1.5 min-h-[42px] p-2.5 rounded-2xl border bg-gray-50/50 dark:bg-gray-900/30" style={{ borderColor: 'var(--border-primary)' }}>
                {(profile.preferences.blocked_companies || []).map((comp) => (
                  <span
                    key={comp}
                    className="px-3 py-1 rounded-xl text-xs font-bold bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200 border border-red-300 dark:border-red-800 flex items-center gap-1.5 shadow-sm"
                  >
                    <Ban className="w-3 h-3 text-red-600" />
                    <span>{comp}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const current = profile.preferences.blocked_companies || [];
                        updatePreferenceField('blocked_companies', current.filter(c => c.toLowerCase() !== comp.toLowerCase()));
                      }}
                      className="hover:text-red-600 ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {(!profile.preferences.blocked_companies || profile.preferences.blocked_companies.length === 0) && (
                  <span className="text-xs text-gray-400 italic flex items-center gap-1">
                    No blocked companies. Add any companies you want automatically filtered out.
                  </span>
                )}
              </div>

              {/* Add Custom Blocked Company */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Type company or agency to block..."
                  value={newBlockedCompanyInput}
                  onChange={(e) => setNewBlockedCompanyInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const c = newBlockedCompanyInput.trim();
                      if (c) {
                        const current = profile.preferences.blocked_companies || [];
                        if (!current.some(x => x.toLowerCase() === c.toLowerCase())) {
                          updatePreferenceField('blocked_companies', [...current, c]);
                        }
                        setNewBlockedCompanyInput('');
                      }
                    }
                  }}
                  className="input-base flex-1 text-xs font-medium"
                />
                <button
                  type="button"
                  onClick={() => {
                    const c = newBlockedCompanyInput.trim();
                    if (c) {
                      const current = profile.preferences.blocked_companies || [];
                      if (!current.some(x => x.toLowerCase() === c.toLowerCase())) {
                        updatePreferenceField('blocked_companies', [...current, c]);
                      }
                      setNewBlockedCompanyInput('');
                    }
                  }}
                  className="px-3.5 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 shadow-sm"
                >
                  Block
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: Personal Information & Socials */}
      {activeSection === 'identity' && (
        <div 
          className="p-6 rounded-3xl border space-y-6 shadow-sm"
          style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-primary)' }}
        >
          <div>
            <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
              Personal Identity & Professional Bio
            </h3>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Used in AI Outreach Pitches, Resume Generation, and Knowledge Graph user identity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                Full Name
              </label>
              <input
                type="text"
                value={profile.full_name || ''}
                onChange={(e) => {
                  setProfile(prev => ({ ...prev, full_name: e.target.value }));
                  setHasUnsavedChanges(true);
                }}
                placeholder="e.g. Jane Doe"
                className="input-base w-full text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                Professional Headline / Tagline
              </label>
              <input
                type="text"
                value={profile.headline || ''}
                onChange={(e) => {
                  setProfile(prev => ({ ...prev, headline: e.target.value }));
                  setHasUnsavedChanges(true);
                }}
                placeholder="e.g. Senior Backend Engineer | Python, FastAPI, Neo4j"
                className="input-base w-full text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={profile.email || ''}
                  onChange={(e) => {
                    setProfile(prev => ({ ...prev, email: e.target.value }));
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="e.g. candidate@example.com"
                  className="input-base w-full pl-9 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                Phone Number
              </label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="tel"
                  value={profile.phone || ''}
                  onChange={(e) => {
                    setProfile(prev => ({ ...prev, phone: e.target.value }));
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="e.g. +91 98765 43210"
                  className="input-base w-full pl-9 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                Current Location (City, State, Country)
              </label>
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={profile.location || ''}
                  onChange={(e) => {
                    setProfile(prev => ({ ...prev, location: e.target.value }));
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="e.g. Bengaluru, Karnataka, India"
                  className="input-base w-full pl-9 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                LinkedIn Profile URL
              </label>
              <div className="relative">
                <Linkedin className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-blue-600" />
                <input
                  type="url"
                  value={profile.linkedin_url || ''}
                  onChange={(e) => {
                    setProfile(prev => ({ ...prev, linkedin_url: e.target.value }));
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="https://linkedin.com/in/username"
                  className="input-base w-full pl-9 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                GitHub Username
              </label>
              <div className="relative">
                <Github className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={profile.github_username || ''}
                  onChange={(e) => {
                    setProfile(prev => ({ 
                      ...prev, 
                      github_username: e.target.value,
                      github_url: e.target.value ? `https://github.com/${e.target.value}` : ''
                    }));
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="e.g. mohitupraity"
                  className="input-base w-full pl-9 text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                Portfolio / Website URL
              </label>
              <div className="relative">
                <Globe className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-purple-600" />
                <input
                  type="url"
                  value={profile.portfolio_url || ''}
                  onChange={(e) => {
                    setProfile(prev => ({ ...prev, portfolio_url: e.target.value }));
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="https://myportfolio.dev"
                  className="input-base w-full pl-9 text-xs"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
              Professional Summary & Bio
            </label>
            <textarea
              rows={4}
              value={profile.bio || ''}
              onChange={(e) => {
                setProfile(prev => ({ ...prev, bio: e.target.value }));
                setHasUnsavedChanges(true);
              }}
              placeholder="Write a brief overview of your technical background, impact projects, and career milestones..."
              className="input-base w-full text-xs font-normal"
            />
          </div>
        </div>
      )}

      {/* SECTION 3: Skills & Tech Stack */}
      {activeSection === 'skills' && (
        <div 
          className="p-6 rounded-3xl border space-y-6 shadow-sm"
          style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-primary)' }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                Verified Skills & Technical Competencies
              </h3>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Add, remove, or customize technical skills. All skills are indexed into your personal Neo4j knowledge graph and used in ATS matching.
              </p>
            </div>
            <span className="px-3 py-1 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono text-xs font-bold border border-blue-200 dark:border-blue-800">
              {(profile.skills || []).length} Skills Active
            </span>
          </div>

          {/* Add New Skill Input */}
          <div className="flex items-center gap-2 max-w-md">
            <input
              type="text"
              placeholder="Type a skill and press Enter (e.g. Next.js, Kafka, Redis)..."
              value={newSkillInput}
              onChange={(e) => setNewSkillInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addSkill(newSkillInput);
                }
              }}
              className="input-base flex-1 text-xs"
            />
            <button
              type="button"
              onClick={() => addSkill(newSkillInput)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 flex items-center gap-1 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>

          {/* Active Skills Tag Cloud */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Your Current Active Skills:
            </h4>
            <div className="flex flex-wrap gap-2 p-4 rounded-2xl border min-h-[100px]" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-primary)' }}>
              {(profile.skills || []).map((skill) => (
                <span
                  key={skill}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-gray-800 border shadow-sm flex items-center gap-2 group animate-in fade-in"
                  style={{ borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
                >
                  <Code2 className="w-3 h-3 text-blue-600" />
                  <span>{skill}</span>
                  <button
                    type="button"
                    onClick={() => removeSkill(skill)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                    title={`Remove ${skill}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {(!profile.skills || profile.skills.length === 0) && (
                <div className="p-4 text-center text-xs text-gray-400 w-full">
                  No skills added yet. Type a skill above or click from suggestions below.
                </div>
              )}
            </div>
          </div>

          {/* Quick Add Suggestions */}
          <div className="space-y-2 pt-2">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Quick Add Popular Technologies:
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {POPULAR_SKILLS_SUGGESTIONS.map((sug) => {
                const alreadyHas = (profile.skills || []).some(s => s.toLowerCase() === sug.toLowerCase());
                return (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => alreadyHas ? removeSkill(sug) : addSkill(sug)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border flex items-center gap-1.5 ${
                      alreadyHas
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-gray-50 dark:bg-gray-850 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    {alreadyHas ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                    <span>{sug}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: Featured Projects & Proof of Work */}
      {activeSection === 'projects' && (
        <div 
          className="p-6 rounded-3xl border space-y-6 shadow-sm"
          style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-primary)' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                Featured Projects & Code Proof-of-Work
              </h3>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Projects built by you. Used for AST code verification in Job Matchmaker and automated referral pitches.
              </p>
            </div>
            <button
              onClick={() => setIsAddingProj(true)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Project</span>
            </button>
          </div>

          {/* Project Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(profile.projects || []).map((proj, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl border flex flex-col justify-between gap-3 shadow-sm card-hover"
                style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-primary)' }}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600">
                        <FolderGit2 className="w-4 h-4" />
                      </div>
                      <h4 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                        {proj.name}
                      </h4>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeProj(idx)}
                      className="text-gray-400 hover:text-red-500 p-1"
                      title="Delete Project"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {proj.description || 'No description provided.'}
                  </p>

                  {/* Tech Stack Chips */}
                  {normalizeArray(proj.tech_stack).length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {normalizeArray(proj.tech_stack).map((t, tIdx) => (
                        <span
                          key={tIdx}
                          className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-white dark:bg-gray-800 border"
                          style={{ borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Links */}
                <div className="flex items-center justify-between pt-2 border-t text-xs" style={{ borderColor: 'var(--border-primary)' }}>
                  <div className="flex items-center gap-2">
                    {proj.repo_url && (
                      <a
                        href={proj.repo_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-mono text-[11px] text-blue-600 hover:underline"
                      >
                        <Github className="w-3 h-3" />
                        <span>Code</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                    {proj.live_url && (
                      <a
                        href={proj.live_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-emerald-600 hover:underline"
                      >
                        <Globe className="w-3 h-3" />
                        <span>Live Demo</span>
                      </a>
                    )}
                  </div>
                  {proj.stars !== undefined && proj.stars > 0 && (
                    <span className="flex items-center gap-1 text-[11px] font-mono text-amber-500">
                      <Star className="w-3 h-3 fill-amber-500" />
                      {proj.stars}
                    </span>
                  )}
                </div>
              </div>
            ))}

            {(!profile.projects || profile.projects.length === 0) && (
              <div className="p-8 text-center border rounded-2xl border-dashed text-xs text-gray-400 col-span-2">
                No projects added yet. Click "Add Project" or sync your GitHub account.
              </div>
            )}
          </div>

          {/* Add Project Form */}
          {isAddingProj && (
            <div className="p-5 rounded-2xl border space-y-3 bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900">
              <h4 className="text-xs font-bold text-purple-900 dark:text-purple-200">Add New Project</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold mb-1">Project Title *</label>
                  <input
                    type="text"
                    placeholder="e.g. Distributed Task Queue"
                    value={newProj.name}
                    onChange={(e) => setNewProj(prev => ({ ...prev, name: e.target.value }))}
                    className="input-base w-full text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Primary Language</label>
                  <input
                    type="text"
                    placeholder="e.g. Python, TypeScript, Go"
                    value={newProj.primary_language}
                    onChange={(e) => setNewProj(prev => ({ ...prev, primary_language: e.target.value }))}
                    className="input-base w-full text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">GitHub Repo URL</label>
                  <input
                    type="url"
                    placeholder="https://github.com/username/project"
                    value={newProj.repo_url}
                    onChange={(e) => setNewProj(prev => ({ ...prev, repo_url: e.target.value }))}
                    className="input-base w-full text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Live Demo / Product URL</label>
                  <input
                    type="url"
                    placeholder="https://myproject.dev"
                    value={newProj.live_url}
                    onChange={(e) => setNewProj(prev => ({ ...prev, live_url: e.target.value }))}
                    className="input-base w-full text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-xs">Description & Architecture</label>
                <textarea
                  rows={2}
                  placeholder="Explain what the project solves, throughput metrics, or key innovations..."
                  value={newProj.description}
                  onChange={(e) => setNewProj(prev => ({ ...prev, description: e.target.value }))}
                  className="input-base w-full text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-xs">Technologies Used (comma separated)</label>
                <input
                  type="text"
                  placeholder="e.g. FastAPI, Neo4j, Redis, Docker, React"
                  value={projTechInput}
                  onChange={(e) => {
                    setProjTechInput(e.target.value);
                    setNewProj(prev => ({
                      ...prev,
                      tech_stack: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    }));
                  }}
                  className="input-base w-full text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingProj(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddProj}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700"
                >
                  Save Project
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 5: Education History */}
      {activeSection === 'education' && (
        <div 
          className="p-6 rounded-3xl border space-y-6 shadow-sm"
          style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-primary)' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                Educational Background & Alma Mater
              </h3>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                College & degree details used for finding direct University & Alumni referral bridges.
              </p>
            </div>
            <button
              onClick={() => setIsAddingEdu(true)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Education</span>
            </button>
          </div>

          {/* Education List */}
          <div className="space-y-3">
            {(profile.education || []).map((edu, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
                style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-primary)' }}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 shrink-0 mt-0.5">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                      {edu.university}
                    </h4>
                    <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                      {edu.degree} {edu.field_of_study ? `in ${edu.field_of_study}` : ''}
                    </p>
                    <div className="flex items-center gap-3 text-[11px] text-gray-500 pt-1">
                      <span>{edu.start_date || '2021'} - {edu.end_date || '2025'}</span>
                      {edu.gpa && <span>GPA / Score: <strong>{edu.gpa}</strong></span>}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => removeEdu(idx)}
                  className="px-3 py-1.5 rounded-lg text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-1 self-start sm:self-center"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            ))}

            {(!profile.education || profile.education.length === 0) && (
              <div className="p-8 text-center border rounded-2xl border-dashed text-xs text-gray-400">
                No education history added yet. Click "Add Education" to add your college.
              </div>
            )}
          </div>

          {/* Add Education Modal/Form */}
          {isAddingEdu && (
            <div className="p-5 rounded-2xl border space-y-3 bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
              <h4 className="text-xs font-bold text-blue-900 dark:text-blue-200">Add Educational Institution</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold mb-1">University / College Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Anand Engineering College"
                    value={newEdu.university}
                    onChange={(e) => setNewEdu(prev => ({ ...prev, university: e.target.value }))}
                    className="input-base w-full text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Degree</label>
                  <input
                    type="text"
                    placeholder="e.g. B.Tech, M.Tech, BCA, MCA"
                    value={newEdu.degree}
                    onChange={(e) => setNewEdu(prev => ({ ...prev, degree: e.target.value }))}
                    className="input-base w-full text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Field of Study / Major</label>
                  <input
                    type="text"
                    placeholder="e.g. Computer Science & Engineering"
                    value={newEdu.field_of_study}
                    onChange={(e) => setNewEdu(prev => ({ ...prev, field_of_study: e.target.value }))}
                    className="input-base w-full text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold mb-1">Start Year</label>
                    <input
                      type="text"
                      placeholder="e.g. 2021"
                      value={newEdu.start_date}
                      onChange={(e) => setNewEdu(prev => ({ ...prev, start_date: e.target.value }))}
                      className="input-base w-full text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">End Year</label>
                    <input
                      type="text"
                      placeholder="e.g. 2025"
                      value={newEdu.end_date}
                      onChange={(e) => setNewEdu(prev => ({ ...prev, end_date: e.target.value }))}
                      className="input-base w-full text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingEdu(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddEdu}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700"
                >
                  Save Education
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 6: Work Experience */}
      {activeSection === 'experience' && (
        <div 
          className="p-6 rounded-3xl border space-y-6 shadow-sm"
          style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-primary)' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                Work Experience & Internships
              </h3>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Past and current roles to calculate ex-colleague bridges and ATS experience relevance.
              </p>
            </div>
            <button
              onClick={() => setIsAddingExp(true)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Experience</span>
            </button>
          </div>

          {/* Experience List */}
          <div className="space-y-3">
            {(profile.experience || []).map((exp, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl border space-y-2 shadow-sm"
                style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-primary)' }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 shrink-0 mt-0.5">
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                        {exp.role || 'Software Engineer'}
                      </h4>
                      <div className="text-xs font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5" />
                        <span>{exp.company}</span>
                        {exp.location && <span>• {exp.location}</span>}
                      </div>
                      <div className="text-[11px] text-gray-500 pt-0.5">
                        {exp.start_date} - {exp.is_current ? 'Present' : (exp.end_date || 'Present')}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeExp(idx)}
                    className="px-3 py-1.5 rounded-lg text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-1 self-start sm:self-center"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>

                {exp.description && (
                  <p className="text-xs text-gray-600 dark:text-gray-300 pt-1 pl-11">
                    {exp.description}
                  </p>
                )}
              </div>
            ))}

            {(!profile.experience || profile.experience.length === 0) && (
              <div className="p-8 text-center border rounded-2xl border-dashed text-xs text-gray-400">
                No work experience added yet. Click "Add Experience" to add past or current positions.
              </div>
            )}
          </div>

          {/* Add Experience Modal/Form */}
          {isAddingExp && (
            <div className="p-5 rounded-2xl border space-y-3 bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900">
              <h4 className="text-xs font-bold text-purple-900 dark:text-purple-200">Add Work Position</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold mb-1">Company / Organization *</label>
                  <input
                    type="text"
                    placeholder="e.g. Google, DRDO ADRDE, Razorpay"
                    value={newExp.company}
                    onChange={(e) => setNewExp(prev => ({ ...prev, company: e.target.value }))}
                    className="input-base w-full text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Role / Job Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Backend Engineering Intern"
                    value={newExp.role}
                    onChange={(e) => setNewExp(prev => ({ ...prev, role: e.target.value }))}
                    className="input-base w-full text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Bengaluru, India or Remote"
                    value={newExp.location}
                    onChange={(e) => setNewExp(prev => ({ ...prev, location: e.target.value }))}
                    className="input-base w-full text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold mb-1">Start Date</label>
                    <input
                      type="text"
                      placeholder="e.g. Jun 2024"
                      value={newExp.start_date}
                      onChange={(e) => setNewExp(prev => ({ ...prev, start_date: e.target.value }))}
                      className="input-base w-full text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">End Date</label>
                    <input
                      type="text"
                      placeholder="e.g. Aug 2024"
                      value={newExp.end_date}
                      onChange={(e) => setNewExp(prev => ({ ...prev, end_date: e.target.value }))}
                      className="input-base w-full text-xs"
                      disabled={newExp.is_current}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newExp.is_current || false}
                    onChange={(e) => setNewExp(prev => ({ ...prev, is_current: e.target.checked }))}
                    className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4"
                  />
                  <span>I currently work in this role</span>
                </label>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-xs">Responsibilities & Achievements</label>
                <textarea
                  rows={3}
                  placeholder="Describe your responsibilities, metrics, and key technologies used..."
                  value={newExp.description}
                  onChange={(e) => setNewExp(prev => ({ ...prev, description: e.target.value }))}
                  className="input-base w-full text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingExp(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddExp}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700"
                >
                  Save Experience
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 7: Achievements & Certifications */}
      {activeSection === 'honors' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Achievements & Hackathons */}
          <div 
            className="p-6 rounded-3xl border space-y-4 shadow-sm"
            style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-primary)' }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600">
                  <Trophy className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                    Hackathons & Major Achievements
                  </h3>
                  <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                    Competitive wins & national challenge awards.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddingAch(true)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 flex items-center gap-1 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {(profile.achievements || []).map((ach, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border flex items-start justify-between gap-2 text-xs"
                  style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-primary)' }}
                >
                  <div>
                    <h5 className="font-bold" style={{ color: 'var(--text-primary)' }}>{ach.title}</h5>
                    <p className="text-amber-600 font-semibold text-[11px]">{ach.organization} {ach.date ? `• ${ach.date}` : ''}</p>
                    {ach.description && <p className="text-gray-500 text-[11px] pt-0.5">{ach.description}</p>}
                  </div>
                  <button onClick={() => removeAch(idx)} className="text-gray-400 hover:text-red-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {(!profile.achievements || profile.achievements.length === 0) && (
                <div className="p-6 text-center border rounded-xl border-dashed text-xs text-gray-400">
                  No hackathons or achievements added yet.
                </div>
              )}
            </div>

            {isAddingAch && (
              <div className="p-4 rounded-xl border space-y-2.5 bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 text-xs">
                <input
                  type="text"
                  placeholder="Achievement / Hackathon Title *"
                  value={newAch.title}
                  onChange={(e) => setNewAch(prev => ({ ...prev, title: e.target.value }))}
                  className="input-base w-full text-xs"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Host / Organizer (e.g. AICTE)"
                    value={newAch.organization}
                    onChange={(e) => setNewAch(prev => ({ ...prev, organization: e.target.value }))}
                    className="input-base w-full text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Year / Date (e.g. 2024)"
                    value={newAch.date}
                    onChange={(e) => setNewAch(prev => ({ ...prev, date: e.target.value }))}
                    className="input-base w-full text-xs"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button onClick={() => setIsAddingAch(false)} className="px-3 py-1 text-xs text-gray-500">Cancel</button>
                  <button onClick={handleAddAch} className="px-3.5 py-1.5 rounded-xl bg-amber-600 text-white font-bold">Save</button>
                </div>
              </div>
            )}
          </div>

          {/* Certifications */}
          <div 
            className="p-6 rounded-3xl border space-y-4 shadow-sm"
            style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-primary)' }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600">
                  <BadgeCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                    Certifications & Licenses
                  </h3>
                  <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                    AWS, Neo4j, Google Cloud, Docker, etc.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddingCert(true)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {(profile.certifications || []).map((cert, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border flex items-start justify-between gap-2 text-xs"
                  style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-primary)' }}
                >
                  <div>
                    <h5 className="font-bold" style={{ color: 'var(--text-primary)' }}>{cert.name}</h5>
                    <p className="text-emerald-600 font-semibold text-[11px]">{cert.issuer} {cert.date ? `• ${cert.date}` : ''}</p>
                  </div>
                  <button onClick={() => removeCert(idx)} className="text-gray-400 hover:text-red-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {(!profile.certifications || profile.certifications.length === 0) && (
                <div className="p-6 text-center border rounded-xl border-dashed text-xs text-gray-400">
                  No certifications added yet.
                </div>
              )}
            </div>

            {isAddingCert && (
              <div className="p-4 rounded-xl border space-y-2.5 bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 text-xs">
                <input
                  type="text"
                  placeholder="Certification Name *"
                  value={newCert.name}
                  onChange={(e) => setNewCert(prev => ({ ...prev, name: e.target.value }))}
                  className="input-base w-full text-xs"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Issuer (e.g. AWS, Neo4j)"
                    value={newCert.issuer}
                    onChange={(e) => setNewCert(prev => ({ ...prev, issuer: e.target.value }))}
                    className="input-base w-full text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Year (e.g. 2024)"
                    value={newCert.date}
                    onChange={(e) => setNewCert(prev => ({ ...prev, date: e.target.value }))}
                    className="input-base w-full text-xs"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button onClick={() => setIsAddingCert(false)} className="px-3 py-1 text-xs text-gray-500">Cancel</button>
                  <button onClick={handleAddCert} className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white font-bold">Save</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Save Action Bar when there are unsaved changes */}
      {hasUnsavedChanges && (
        <div className="fixed bottom-6 right-6 z-40 animate-in slide-in-from-bottom duration-300">
          <div 
            className="p-3 px-5 rounded-2xl border shadow-2xl flex items-center gap-4 bg-slate-900 text-white border-blue-500 ring-2 ring-blue-500/40 backdrop-blur-md"
          >
            <div className="flex items-center gap-2 text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
              <span>You have unsaved profile changes!</span>
            </div>
            <button
              onClick={handleSaveAll}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md flex items-center gap-2"
            >
              {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Save & Sync All</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
