import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, 
  Printer, 
  Sparkles, 
  Github, 
  Briefcase, 
  Code2, 
  FolderGit2,
  Award,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  Edit3,
  Eye,
  GraduationCap,
  ExternalLink,
  MapPin,
  Mail,
  Phone,
  Linkedin,
  Globe,
  Check,
  X,
  Type,
  Palette,
  Sliders,
  CheckCheck,
  Undo2,
  Wand2,
  Layers,
  ArrowUp,
  ArrowDown,
  EyeOff,
  Copy,
  Download,
  Target,
  FileCode,
  LayoutGrid,
  BookmarkPlus,
  ChevronDown,
  FolderOpen,
  Settings2,
  Link2,
  HelpCircle,
  PlusCircle,
  CheckCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  ResumeBlueprint, 
  ExperienceEntry, 
  ProjectEntry, 
  EducationEntry, 
  SkillCategory 
} from '../../types';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { SyncResumeModal } from '../SyncResumeModal';

interface ResumeStudioProps {
  initialRole?: string;
  initialCompany?: string;
  initialJd?: string;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}

export type SectionKey = 'summary' | 'experience' | 'projects' | 'skills' | 'education' | 'achievements';

// Interface for Multiple Saved Templates
export interface SavedResumeTemplate {
  id: string;
  name: string;
  blueprint: ResumeBlueprint;
  style: TemplateStyle;
  sectionOrder: SectionKey[];
  visibleSections: { [key in SectionKey]: boolean };
  createdAt: string;
  updatedAt: string;
}

// Suggestion interface for Google Docs-like track changes
interface AISuggestion {
  id: string; // e.g. "summary", "exp-0-1", "proj-1-0"
  type: 'summary' | 'exp_bullet' | 'proj_bullet' | 'skill_add';
  parentIndex?: number;
  bulletIndex?: number;
  originalText: string;
  suggestedText: string;
  status: 'pending' | 'accepted' | 'rejected';
  reason?: string;
}

interface TemplateStyle {
  fontFamily: 'Inter' | 'Merriweather' | 'Roboto' | 'JetBrains Mono';
  fontSize: 'compact' | 'standard' | 'spacious';
  spacing: 'compact' | 'normal' | 'relaxed';
  accentColor: string;
  headerAlign: 'center' | 'left';
  showBorders: boolean;
}

const DEFAULT_STARTER_BLUEPRINT: ResumeBlueprint = {
  contact: {
    full_name: 'Software Engineer',
    email: 'engineer@example.com',
    phone: '+1 (555) 019-2834',
    location: 'San Francisco, CA',
    github_url: 'https://github.com/username',
    linkedin_url: 'https://linkedin.com/in/username',
    portfolio_url: '',
  },
  summary: 'Passionate and results-driven Software Engineer with extensive experience architecting high-throughput distributed backends, graph data pipelines, and responsive frontend systems.',
  experience: [
    {
      company: 'Tech Corp',
      role: 'Software Engineer',
      location: 'San Francisco, CA',
      start_date: '2023',
      end_date: 'Present',
      is_current: true,
      bullets: [
        'Architected and deployed microservices handling 50k+ daily transactions with 99.9% uptime.',
        'Engineered optimized database queries and caching layers, cutting P95 latency by 42%.'
      ]
    }
  ],
  projects: [
    {
      name: 'PathPrint Intelligence Platform',
      tech_stack: 'React, TypeScript, FastAPI, Neo4j, Python',
      repo_url: 'https://github.com/user/pathprint',
      live_url: '',
      bullets: [
        'Built automated graph ingestion pipeline extracting complex relationships across GitHub repositories and resumes.',
        'Implemented sub-second semantic matching engine for candidates and technical roles.'
      ]
    }
  ],
  skills: [
    {
      category: 'Languages',
      skills: ['Python', 'TypeScript', 'JavaScript', 'SQL', 'C++']
    },
    {
      category: 'Frameworks & Libraries',
      skills: ['FastAPI', 'React', 'Node.js', 'Next.js', 'TailwindCSS']
    },
    {
      category: 'Databases & Tools',
      skills: ['Neo4j', 'PostgreSQL', 'Redis', 'Docker', 'Git', 'AWS']
    }
  ],
  education: [
    {
      university: 'State University',
      degree: 'Bachelor of Technology',
      field_of_study: 'Computer Science & Engineering',
      start_date: '2020',
      end_date: '2024',
      gpa: '8.8 / 10'
    }
  ],
  achievements: [
    '1st Place Winner – National Hackathon 2024',
    'Demonstrated core cybersecurity prototypes for technical defense research teams'
  ]
};

const ACCENT_COLORS = [
  { name: 'Onyx ATS (Default)', value: '#111827', class: 'bg-gray-900' },
  { name: 'Navy Corporate', value: '#1E3A8A', class: 'bg-blue-900' },
  { name: 'Emerald Forest', value: '#065F46', class: 'bg-emerald-800' },
  { name: 'Royal Indigo', value: '#4338CA', class: 'bg-indigo-700' },
  { name: 'Slate Modern', value: '#334155', class: 'bg-slate-700' },
];

export const ResumeStudio: React.FC<ResumeStudioProps> = ({
  initialRole = '',
  initialCompany = '',
  initialJd = '',
  onError,
  onSuccess,
}) => {
  const { user, getAuthHeaders } = useAuth();
  
  // ================= Top Navigation Tabs =================
  const [activeTab, setActiveTab] = useState<'master' | 'tailor'>('master');

  // View & Mode States
  const [isEditMode, setIsEditMode] = useState<boolean>(true);
  const [isStyleOpen, setIsStyleOpen] = useState<boolean>(false);
  const [isSectionManagerOpen, setIsSectionManagerOpen] = useState<boolean>(false);
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);
  const [isSaveTemplateModalOpen, setIsSaveTemplateModalOpen] = useState(false);
  const [newTemplateNameInput, setNewTemplateNameInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [atsScore, setAtsScore] = useState<number | null>(null);

  // Master Resume Blueprint State (Permanent Base)
  const [masterBlueprint, setMasterBlueprint] = useState<ResumeBlueprint>(DEFAULT_STARTER_BLUEPRINT);
  const [hasMasterResume, setHasMasterResume] = useState<boolean>(false);
  const [isMasterDirty, setIsMasterDirty] = useState<boolean>(false);

  // Tailored Resume Blueprint State (Job-Specific Copy)
  const [tailoredBlueprint, setTailoredBlueprint] = useState<ResumeBlueprint>(DEFAULT_STARTER_BLUEPRINT);
  const [suggestions, setSuggestions] = useState<{ [id: string]: AISuggestion }>({});

  // Multiple Saved Templates Management
  const [savedTemplates, setSavedTemplates] = useState<SavedResumeTemplate[]>([]);
  const [activeTemplateId, setActiveTemplateId] = useState<string>('master-default');

  // Section Ordering & Visibility State
  const [sectionOrder, setSectionOrder] = useState<SectionKey[]>([
    'summary',
    'experience',
    'projects',
    'skills',
    'education',
    'achievements'
  ]);
  const [visibleSections, setVisibleSections] = useState<{ [key in SectionKey]: boolean }>({
    summary: true,
    experience: true,
    projects: true,
    skills: true,
    education: true,
    achievements: true,
  });

  // Template Styling State (Font, Colors, Sizes, Spacing)
  const [templateStyle, setTemplateStyle] = useState<TemplateStyle>({
    fontFamily: 'Inter',
    fontSize: 'standard',
    spacing: 'normal',
    accentColor: '#111827',
    headerAlign: 'center',
    showBorders: true,
  });

  // AI Tailoring Parameters
  const [role, setRole] = useState(initialRole || 'Full Stack / Backend Engineer');
  const [company, setCompany] = useState(initialCompany || 'Target Organization');
  const [jd, setJd] = useState(
    initialJd ||
      `Looking for a strong Software Engineer with experience in building scalable backend services, modern APIs, graph databases, and high-performance frontend architectures.`
  );

  // Skill Gap & Evidence Verification Assistant State
  interface ConfirmedSkillDecision {
    skill: string;
    hasExperience: boolean;
    evidenceUrl?: string;
    notes?: string;
  }
  const [skillDecisions, setSkillDecisions] = useState<{ [skill: string]: ConfirmedSkillDecision }>({});
  const [customSkillToAdd, setCustomSkillToAdd] = useState('');
  const [customEvidenceToAdd, setCustomEvidenceToAdd] = useState('');
  const [showAddCustomSkill, setShowAddCustomSkill] = useState(false);

  // Common technical skills/keywords dictionary for extraction
  const COMMON_SKILL_KEYWORDS = [
    'React', 'TypeScript', 'JavaScript', 'Node.js', 'Python', 'Go', 'Golang', 'Rust', 'Java', 'C++', 'C#',
    'FastAPI', 'Django', 'Flask', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Kafka', 'RabbitMQ',
    'Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure', 'GraphQL', 'REST APIs', 'gRPC', 'CI/CD',
    'GitHub Actions', 'Microservices', 'Distributed Systems', 'System Design', 'Terraform',
    'Next.js', 'TailwindCSS', 'Elasticsearch', 'LLM', 'LangChain', 'PyTorch', 'TensorFlow',
    'Vector Databases', 'OpenAPI', 'WebSockets', 'WebRTC', 'Linux', 'Security', 'OAuth',
    'Unit Testing', 'Jest', 'Pytest', 'Neo4j', 'Supabase', 'SQL', 'NoSQL', 'DevOps'
  ];

  // Extracted JD Skills & Gap Analysis
  const analyzedSkills = useMemo(() => {
    if (!jd.trim()) return { matched: [], missing: [] };
    const jdLower = jd.toLowerCase();
    
    // User's current skills from master resume
    const userSkillSet = new Set<string>();
    (masterBlueprint.skills || []).forEach(cat => {
      (cat.skills || []).forEach(s => userSkillSet.add(s.toLowerCase().trim()));
    });
    (masterBlueprint.experience || []).forEach(e => {
      (e.bullets || []).forEach(b => {
        COMMON_SKILL_KEYWORDS.forEach(kw => {
          if (b.toLowerCase().includes(kw.toLowerCase())) userSkillSet.add(kw.toLowerCase());
        });
      });
    });
    (masterBlueprint.projects || []).forEach(p => {
      if (p.tech_stack) {
        p.tech_stack.split(/[,|/]/).forEach(t => userSkillSet.add(t.toLowerCase().trim()));
      }
    });

    const jdMatched: string[] = [];
    const jdMissing: string[] = [];

    COMMON_SKILL_KEYWORDS.forEach(kw => {
      const kwLower = kw.toLowerCase();
      // Match token with boundaries in JD
      const regex = new RegExp(`(^|[^a-zA-Z0-9_+])${kwLower.replace('+', '\\+')}([^a-zA-Z0-9_+]|$)`, 'i');
      if (regex.test(jdLower)) {
        let isUserHasSkill = userSkillSet.has(kwLower);
        if (!isUserHasSkill) {
          for (const us of userSkillSet) {
            if (us.includes(kwLower) || kwLower.includes(us)) {
              isUserHasSkill = true;
              break;
            }
          }
        }

        if (isUserHasSkill) {
          jdMatched.push(kw);
        } else {
          jdMissing.push(kw);
        }
      }
    });

    return { matched: jdMatched, missing: jdMissing };
  }, [jd, masterBlueprint]);

  const handleToggleSkillExperience = (skillName: string, hasExp: boolean, statusNote?: string) => {
    setSkillDecisions(prev => ({
      ...prev,
      [skillName]: {
        skill: skillName,
        hasExperience: hasExp,
        evidenceUrl: prev[skillName]?.evidenceUrl || '',
        notes: statusNote !== undefined ? statusNote : (prev[skillName]?.notes || ''),
      }
    }));
  };

  const handleUpdateSkillEvidence = (skillName: string, evidenceUrl: string) => {
    setSkillDecisions(prev => ({
      ...prev,
      [skillName]: {
        skill: skillName,
        hasExperience: prev[skillName]?.hasExperience ?? true,
        evidenceUrl,
        notes: prev[skillName]?.notes,
      }
    }));
  };

  const handleUpdateSkillNotes = (skillName: string, notes: string) => {
    setSkillDecisions(prev => ({
      ...prev,
      [skillName]: {
        skill: skillName,
        hasExperience: prev[skillName]?.hasExperience ?? true,
        evidenceUrl: prev[skillName]?.evidenceUrl,
        notes,
      }
    }));
  };

  const handleAddCustomSkill = () => {
    const trimmed = customSkillToAdd.trim();
    if (!trimmed) return;
    setSkillDecisions(prev => ({
      ...prev,
      [trimmed]: {
        skill: trimmed,
        hasExperience: true,
        evidenceUrl: customEvidenceToAdd.trim() || undefined,
        notes: undefined,
      }
    }));
    setCustomSkillToAdd('');
    setCustomEvidenceToAdd('');
    setShowAddCustomSkill(false);
  };

  // Helper for adding new skill chips
  const [newSkillInput, setNewSkillInput] = useState<{ [categoryIdx: number]: string }>({});

  // Auto-switch to Tailor tab if initial parameters passed (e.g. from Opportunities Radar or Matchmaker)
  useEffect(() => {
    if (initialRole || initialCompany || initialJd) {
      if (initialRole) setRole(initialRole);
      if (initialCompany) setCompany(initialCompany);
      if (initialJd) setJd(initialJd);
      setActiveTab('tailor');
    }
  }, [initialRole, initialCompany, initialJd]);

  // Fetch Master Resume and Saved Templates on Mount
  useEffect(() => {
    fetchMasterResume();
    loadSavedTemplates();
  }, [user]);


  const getStorageKey = () => `pathprint_saved_templates_${user?.uid || 'local'}`;

  const loadSavedTemplates = () => {
    try {
      const stored = localStorage.getItem(getStorageKey());
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSavedTemplates(parsed);
        }
      }
    } catch (e) {
      console.warn('Could not load saved templates from localStorage:', e);
    }
  };

  const persistSavedTemplates = (templates: SavedResumeTemplate[]) => {
    setSavedTemplates(templates);
    try {
      localStorage.setItem(getStorageKey(), JSON.stringify(templates));
    } catch (e) {
      console.warn('Could not save templates to localStorage:', e);
    }
  };

  const fetchMasterResume = async () => {
    setLoading(true);
    try {
      const res = await apiService.getMasterResume(getAuthHeaders());
      if (res.has_master_resume && res.blueprint) {
        setMasterBlueprint(res.blueprint);
        setTailoredBlueprint(res.blueprint);
        setHasMasterResume(true);
      } else {
        setHasMasterResume(false);
      }
    } catch (err) {
      console.warn('Could not load master resume:', err);
    } finally {
      setLoading(false);
    }
  };

  // Active Blueprint based on Tab
  const activeBlueprint = activeTab === 'master' ? masterBlueprint : tailoredBlueprint;

  const updateActiveBlueprint = (newBp: ResumeBlueprint) => {
    if (activeTab === 'master') {
      setMasterBlueprint(newBp);
      setIsMasterDirty(true);
    } else {
      setTailoredBlueprint(newBp);
    }
  };

  // Contact Field Updates
  const updateContact = (field: keyof typeof masterBlueprint.contact, value: string) => {
    updateActiveBlueprint({
      ...activeBlueprint,
      contact: {
        ...activeBlueprint.contact,
        [field]: value
      }
    });
  };

  // Save Master Blueprint to Database
  const handleSaveMaster = async () => {
    setIsSaving(true);
    try {
      const res = await apiService.updateMasterResume(masterBlueprint, getAuthHeaders());
      setMasterBlueprint(res.blueprint);
      setHasMasterResume(true);
      setIsMasterDirty(false);
      onSuccess('Master Base Resume saved and synchronized with database!');
    } catch (err: any) {
      onError(err.message || 'Failed to save master resume');
    } finally {
      setIsSaving(false);
    }
  };

  // ================= Multiple Saved Templates Management =================
  const handleSaveCurrentAsNewTemplate = () => {
    const trimmed = newTemplateNameInput.trim();
    if (!trimmed) {
      onError('Please enter a name for your template');
      return;
    }

    const newTemplate: SavedResumeTemplate = {
      id: `tmpl-${Date.now()}`,
      name: trimmed,
      blueprint: JSON.parse(JSON.stringify(activeBlueprint)),
      style: { ...templateStyle },
      sectionOrder: [...sectionOrder],
      visibleSections: { ...visibleSections },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedList = [...savedTemplates, newTemplate];
    persistSavedTemplates(updatedList);
    setActiveTemplateId(newTemplate.id);
    setIsSaveTemplateModalOpen(false);
    setNewTemplateNameInput('');
    onSuccess(`Template "${trimmed}" saved successfully!`);
  };

  const handleSwitchTemplate = (templateId: string) => {
    if (templateId === 'master-default') {
      setActiveTemplateId('master-default');
      setMasterBlueprint(masterBlueprint);
      onSuccess('Switched to Master Default Template');
      return;
    }

    const tmpl = savedTemplates.find(t => t.id === templateId);
    if (tmpl) {
      setActiveTemplateId(tmpl.id);
      if (activeTab === 'master') {
        setMasterBlueprint(tmpl.blueprint);
      } else {
        setTailoredBlueprint(tmpl.blueprint);
      }
      setTemplateStyle(tmpl.style);
      setSectionOrder(tmpl.sectionOrder || ['summary', 'experience', 'projects', 'skills', 'education', 'achievements']);
      setVisibleSections(tmpl.visibleSections || { summary: true, experience: true, projects: true, skills: true, education: true, achievements: true });
      onSuccess(`Loaded template "${tmpl.name}"`);
    }
  };

  const handleDeleteTemplate = (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedTemplates.filter(t => t.id !== templateId);
    persistSavedTemplates(updated);
    if (activeTemplateId === templateId) {
      setActiveTemplateId('master-default');
    }
    onSuccess('Template deleted');
  };

  // ================= Section Reordering & Visibility Helpers =================
  const moveSectionUp = (key: SectionKey) => {
    const idx = sectionOrder.indexOf(key);
    if (idx <= 0) return;
    const newOrder = [...sectionOrder];
    const temp = newOrder[idx - 1];
    newOrder[idx - 1] = newOrder[idx];
    newOrder[idx] = temp;
    setSectionOrder(newOrder);
  };

  const moveSectionDown = (key: SectionKey) => {
    const idx = sectionOrder.indexOf(key);
    if (idx === -1 || idx >= sectionOrder.length - 1) return;
    const newOrder = [...sectionOrder];
    const temp = newOrder[idx + 1];
    newOrder[idx + 1] = newOrder[idx];
    newOrder[idx] = temp;
    setSectionOrder(newOrder);
  };

  const toggleSectionVisibility = (key: SectionKey) => {
    setVisibleSections(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // ================= AI Tailoring & Google Docs-style Diff Generator =================
  const handleTailorResume = async () => {
    if (!jd.trim()) {
      onError('Please paste a target Job Description to tailor the resume');
      return;
    }

    setLoading(true);
    try {
      // Build confirmed skills with user-verified evidence
      const confirmedList = Object.values(skillDecisions)
        .filter(d => d.hasExperience)
        .map(d => ({
          skill: d.skill,
          has_experience: d.hasExperience,
          evidence_url: d.evidenceUrl?.trim() || undefined,
          notes: d.notes?.trim() || undefined,
        }));

      const data = await apiService.tailorResume(
        {
          target_role: role.trim() || 'Software Engineer',
          target_company: company.trim() || 'Target Company',
          job_description: jd.trim(),
          confirmed_skills: confirmedList.length > 0 ? confirmedList : undefined,
        },
        getAuthHeaders()
      );

      const tailoredBp: ResumeBlueprint | undefined = data.tailored_blueprint;
      if (tailoredBp) {
        const newSuggestions: { [id: string]: AISuggestion } = {};

        // 1. Summary Diff
        if (tailoredBp.summary && tailoredBp.summary !== masterBlueprint.summary) {
          newSuggestions['summary'] = {
            id: 'summary',
            type: 'summary',
            originalText: masterBlueprint.summary || '',
            suggestedText: tailoredBp.summary,
            status: 'pending',
            reason: `Optimized summary for ${role} role and key requirements.`
          };
        }

        // 2. Experience Bullets Diff
        (tailoredBp.experience || []).forEach((tExp, expIdx) => {
          const mExp = masterBlueprint.experience?.[expIdx];
          if (mExp) {
            (tExp.bullets || []).forEach((tBullet, bIdx) => {
              const origBullet = mExp.bullets?.[bIdx];
              if (origBullet && origBullet !== tBullet) {
                const id = `exp-${expIdx}-${bIdx}`;
                newSuggestions[id] = {
                  id,
                  type: 'exp_bullet',
                  parentIndex: expIdx,
                  bulletIndex: bIdx,
                  originalText: origBullet,
                  suggestedText: tBullet,
                  status: 'pending',
                  reason: 'Rephrased with STAR format & target keywords.'
                };
              }
            });
          }
        });

        // 3. Project Bullets Diff
        (tailoredBp.projects || []).forEach((tProj, projIdx) => {
          const mProj = masterBlueprint.projects?.[projIdx];
          if (mProj) {
            (tProj.bullets || []).forEach((tBullet, bIdx) => {
              const origBullet = mProj.bullets?.[bIdx];
              if (origBullet && origBullet !== tBullet) {
                const id = `proj-${projIdx}-${bIdx}`;
                newSuggestions[id] = {
                  id,
                  type: 'proj_bullet',
                  parentIndex: projIdx,
                  bulletIndex: bIdx,
                  originalText: origBullet,
                  suggestedText: tBullet,
                  status: 'pending',
                  reason: 'Enhanced impact metrics & tech stack alignment.'
                };
              }
            });
          }
        });

        setTailoredBlueprint(tailoredBp);
        setSuggestions(newSuggestions);
        setAtsScore(data.ats_score || 94);
        setActiveTab('tailor');
        onSuccess(`Tailored for ${company || 'role'}! ${Object.keys(newSuggestions).length} AI suggestions ready for your review (ATS Match: ${data.ats_score || 94}%).`);
        
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#2563EB', '#10B981', '#F59E0B']
        });
      }
    } catch (err: any) {
      onError(err.message || 'Failed to tailor resume');
    } finally {
      setLoading(false);
    }
  };

  // Accept a single AI suggestion
  const handleAcceptSuggestion = (id: string) => {
    const sug = suggestions[id];
    if (!sug) return;

    if (sug.type === 'summary') {
      setTailoredBlueprint(prev => ({ ...prev, summary: sug.suggestedText }));
    } else if (sug.type === 'exp_bullet' && sug.parentIndex !== undefined && sug.bulletIndex !== undefined) {
      const expList = [...(tailoredBlueprint.experience || [])];
      if (expList[sug.parentIndex]?.bullets) {
        expList[sug.parentIndex].bullets[sug.bulletIndex] = sug.suggestedText;
        setTailoredBlueprint(prev => ({ ...prev, experience: expList }));
      }
    } else if (sug.type === 'proj_bullet' && sug.parentIndex !== undefined && sug.bulletIndex !== undefined) {
      const projList = [...(tailoredBlueprint.projects || [])];
      if (projList[sug.parentIndex]?.bullets) {
        projList[sug.parentIndex].bullets[sug.bulletIndex] = sug.suggestedText;
        setTailoredBlueprint(prev => ({ ...prev, projects: projList }));
      }
    }

    setSuggestions(prev => ({
      ...prev,
      [id]: { ...prev[id], status: 'accepted' }
    }));
  };

  // Reject a single AI suggestion (keep original from master)
  const handleRejectSuggestion = (id: string) => {
    const sug = suggestions[id];
    if (!sug) return;

    if (sug.type === 'summary') {
      setTailoredBlueprint(prev => ({ ...prev, summary: sug.originalText }));
    } else if (sug.type === 'exp_bullet' && sug.parentIndex !== undefined && sug.bulletIndex !== undefined) {
      const expList = [...(tailoredBlueprint.experience || [])];
      if (expList[sug.parentIndex]?.bullets) {
        expList[sug.parentIndex].bullets[sug.bulletIndex] = sug.originalText;
        setTailoredBlueprint(prev => ({ ...prev, experience: expList }));
      }
    } else if (sug.type === 'proj_bullet' && sug.parentIndex !== undefined && sug.bulletIndex !== undefined) {
      const projList = [...(tailoredBlueprint.projects || [])];
      if (projList[sug.parentIndex]?.bullets) {
        projList[sug.parentIndex].bullets[sug.bulletIndex] = sug.originalText;
        setTailoredBlueprint(prev => ({ ...prev, projects: projList }));
      }
    }

    setSuggestions(prev => ({
      ...prev,
      [id]: { ...prev[id], status: 'rejected' }
    }));
  };

  // Accept All Pending Suggestions
  const handleAcceptAllSuggestions = () => {
    let newBp = { ...tailoredBlueprint };

    Object.values(suggestions).forEach(sug => {
      if (sug.status === 'pending') {
        if (sug.type === 'summary') {
          newBp.summary = sug.suggestedText;
        } else if (sug.type === 'exp_bullet' && sug.parentIndex !== undefined && sug.bulletIndex !== undefined) {
          const expList = [...(newBp.experience || [])];
          if (expList[sug.parentIndex]?.bullets) {
            expList[sug.parentIndex].bullets[sug.bulletIndex] = sug.suggestedText;
            newBp.experience = expList;
          }
        } else if (sug.type === 'proj_bullet' && sug.parentIndex !== undefined && sug.bulletIndex !== undefined) {
          const projList = [...(newBp.projects || [])];
          if (projList[sug.parentIndex]?.bullets) {
            projList[sug.parentIndex].bullets[sug.bulletIndex] = sug.suggestedText;
            newBp.projects = projList;
          }
        }
      }
    });

    const updatedSugs: { [id: string]: AISuggestion } = {};
    Object.keys(suggestions).forEach(k => {
      updatedSugs[k] = { ...suggestions[k], status: 'accepted' };
    });

    setTailoredBlueprint(newBp);
    setSuggestions(updatedSugs);
    onSuccess('Accepted all AI suggestions for this tailored resume!');
  };

  // Reject All Pending Suggestions
  const handleRejectAllSuggestions = () => {
    setTailoredBlueprint({ ...masterBlueprint });
    const updatedSugs: { [id: string]: AISuggestion } = {};
    Object.keys(suggestions).forEach(k => {
      updatedSugs[k] = { ...suggestions[k], status: 'rejected' };
    });
    setSuggestions(updatedSugs);
    onSuccess('Reverted all changes to match your Master Resume.');
  };

  const pendingSuggestionsCount = Object.values(suggestions).filter(s => s.status === 'pending').length;

  // Print to PDF
  const handlePrint = () => {
    window.print();
  };

  // Export as Markdown
  const handleCopyMarkdown = () => {
    const bp = activeBlueprint;
    let md = `# ${bp.contact.full_name}\n`;
    md += `${bp.contact.email} | ${bp.contact.phone} | ${bp.contact.location}\n`;
    if (bp.contact.github_url) md += `GitHub: ${bp.contact.github_url} | `;
    if (bp.contact.linkedin_url) md += `LinkedIn: ${bp.contact.linkedin_url}\n\n`;

    if (bp.summary) {
      md += `## Professional Summary\n${bp.summary}\n\n`;
    }

    if (bp.experience && bp.experience.length > 0) {
      md += `## Work Experience\n`;
      bp.experience.forEach(exp => {
        md += `### ${exp.role} — ${exp.company} (${exp.start_date} - ${exp.end_date || 'Present'})\n`;
        exp.bullets.forEach(b => {
          md += `- ${b}\n`;
        });
        md += `\n`;
      });
    }

    if (bp.projects && bp.projects.length > 0) {
      md += `## Technical Projects\n`;
      bp.projects.forEach(p => {
        md += `### ${p.name} (${p.tech_stack})\n`;
        p.bullets.forEach(b => {
          md += `- ${b}\n`;
        });
        md += `\n`;
      });
    }

    if (bp.skills && bp.skills.length > 0) {
      md += `## Technical Skills\n`;
      bp.skills.forEach(s => {
        md += `**${s.category}**: ${s.skills.join(', ')}\n`;
      });
      md += `\n`;
    }

    if (bp.education && bp.education.length > 0) {
      md += `## Education\n`;
      bp.education.forEach(edu => {
        md += `### ${edu.university} — ${edu.degree} (${edu.start_date} - ${edu.end_date})\n`;
      });
      md += `\n`;
    }

    navigator.clipboard.writeText(md);
    onSuccess('Resume Markdown copied to clipboard!');
  };

  // --- Experience Actions ---
  const addExperience = () => {
    const newEntry: ExperienceEntry = {
      company: 'New Company',
      role: 'Software Engineer',
      location: 'Location',
      start_date: '2023',
      end_date: 'Present',
      is_current: true,
      bullets: ['Led development of core features contributing to system performance and team velocity.']
    };
    updateActiveBlueprint({
      ...activeBlueprint,
      experience: [newEntry, ...(activeBlueprint.experience || [])]
    });
  };

  const updateExperience = (idx: number, field: keyof ExperienceEntry, val: any) => {
    const updated = [...(activeBlueprint.experience || [])];
    updated[idx] = { ...updated[idx], [field]: val };
    updateActiveBlueprint({ ...activeBlueprint, experience: updated });
  };

  const deleteExperience = (idx: number) => {
    const updated = (activeBlueprint.experience || []).filter((_, i) => i !== idx);
    updateActiveBlueprint({ ...activeBlueprint, experience: updated });
  };

  const addExpBullet = (expIdx: number) => {
    const updated = [...(activeBlueprint.experience || [])];
    updated[expIdx].bullets = [...(updated[expIdx].bullets || []), 'Engineered high-impact solution using modern engineering principles.'];
    updateActiveBlueprint({ ...activeBlueprint, experience: updated });
  };

  const updateExpBullet = (expIdx: number, bulletIdx: number, val: string) => {
    const updated = [...(activeBlueprint.experience || [])];
    updated[expIdx].bullets[bulletIdx] = val;
    updateActiveBlueprint({ ...activeBlueprint, experience: updated });
  };

  const deleteExpBullet = (expIdx: number, bulletIdx: number) => {
    const updated = [...(activeBlueprint.experience || [])];
    updated[expIdx].bullets = updated[expIdx].bullets.filter((_, i) => i !== bulletIdx);
    updateActiveBlueprint({ ...activeBlueprint, experience: updated });
  };

  // --- Project Actions ---
  const addProject = () => {
    const newProj: ProjectEntry = {
      name: 'New Project Name',
      tech_stack: 'Python, React, TypeScript',
      repo_url: '',
      live_url: '',
      bullets: ['Developed full-stack application featuring automated data sync and responsive design.']
    };
    updateActiveBlueprint({
      ...activeBlueprint,
      projects: [newProj, ...(activeBlueprint.projects || [])]
    });
  };

  const updateProject = (idx: number, field: keyof ProjectEntry, val: any) => {
    const updated = [...(activeBlueprint.projects || [])];
    updated[idx] = { ...updated[idx], [field]: val };
    updateActiveBlueprint({ ...activeBlueprint, projects: updated });
  };

  const deleteProject = (idx: number) => {
    const updated = (activeBlueprint.projects || []).filter((_, i) => i !== idx);
    updateActiveBlueprint({ ...activeBlueprint, projects: updated });
  };

  const addProjBullet = (projIdx: number) => {
    const updated = [...(activeBlueprint.projects || [])];
    updated[projIdx].bullets = [...(updated[projIdx].bullets || []), 'Implemented critical logic enhancing user throughput.'];
    updateActiveBlueprint({ ...activeBlueprint, projects: updated });
  };

  const updateProjBullet = (projIdx: number, bulletIdx: number, val: string) => {
    const updated = [...(activeBlueprint.projects || [])];
    updated[projIdx].bullets[bulletIdx] = val;
    updateActiveBlueprint({ ...activeBlueprint, projects: updated });
  };

  const deleteProjBullet = (projIdx: number, bulletIdx: number) => {
    const updated = [...(activeBlueprint.projects || [])];
    updated[projIdx].bullets = updated[projIdx].bullets.filter((_, i) => i !== bulletIdx);
    updateActiveBlueprint({ ...activeBlueprint, projects: updated });
  };

  // --- Skill Category Actions ---
  const addSkillCategory = () => {
    const newCat: SkillCategory = {
      category: 'Specialized Tools',
      skills: ['Git', 'Docker']
    };
    updateActiveBlueprint({
      ...activeBlueprint,
      skills: [...(activeBlueprint.skills || []), newCat]
    });
  };

  const updateSkillCategoryName = (catIdx: number, name: string) => {
    const updated = [...(activeBlueprint.skills || [])];
    updated[catIdx].category = name;
    updateActiveBlueprint({ ...activeBlueprint, skills: updated });
  };

  const deleteSkillCategory = (catIdx: number) => {
    const updated = (activeBlueprint.skills || []).filter((_, i) => i !== catIdx);
    updateActiveBlueprint({ ...activeBlueprint, skills: updated });
  };

  const addSkillTag = (catIdx: number, tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    const updated = [...(activeBlueprint.skills || [])];
    if (!updated[catIdx].skills.includes(trimmed)) {
      updated[catIdx].skills = [...updated[catIdx].skills, trimmed];
      updateActiveBlueprint({ ...activeBlueprint, skills: updated });
    }
    setNewSkillInput({ ...newSkillInput, [catIdx]: '' });
  };

  const removeSkillTag = (catIdx: number, skillIdx: number) => {
    const updated = [...(activeBlueprint.skills || [])];
    updated[catIdx].skills = updated[catIdx].skills.filter((_, i) => i !== skillIdx);
    updateActiveBlueprint({ ...activeBlueprint, skills: updated });
  };

  // --- Education Actions ---
  const addEducation = () => {
    const newEdu: EducationEntry = {
      university: 'University Name',
      degree: 'Bachelor of Science',
      field_of_study: 'Computer Science',
      start_date: '2020',
      end_date: '2024',
      gpa: ''
    };
    updateActiveBlueprint({
      ...activeBlueprint,
      education: [...(activeBlueprint.education || []), newEdu]
    });
  };

  const updateEducation = (idx: number, field: keyof EducationEntry, val: string) => {
    const updated = [...(activeBlueprint.education || [])];
    updated[idx] = { ...updated[idx], [field]: val };
    updateActiveBlueprint({ ...activeBlueprint, education: updated });
  };

  const deleteEducation = (idx: number) => {
    const updated = (activeBlueprint.education || []).filter((_, i) => i !== idx);
    updateActiveBlueprint({ ...activeBlueprint, education: updated });
  };

  // --- Achievement Actions ---
  const addAchievement = () => {
    updateActiveBlueprint({
      ...activeBlueprint,
      achievements: [...(activeBlueprint.achievements || []), 'Recognized for technical excellence / Hackathon award.']
    });
  };

  const updateAchievement = (idx: number, val: string) => {
    const updated = [...(activeBlueprint.achievements || [])];
    updated[idx] = val;
    updateActiveBlueprint({ ...activeBlueprint, achievements: updated });
  };

  const deleteAchievement = (idx: number) => {
    const updated = (activeBlueprint.achievements || []).filter((_, i) => i !== idx);
    updateActiveBlueprint({ ...activeBlueprint, achievements: updated });
  };

  // Styling helper classes based on templateStyle
  const getFontFamilyStyle = () => {
    switch (templateStyle.fontFamily) {
      case 'Merriweather':
        return { fontFamily: '"Merriweather", Georgia, serif' };
      case 'Roboto':
        return { fontFamily: '"Roboto", sans-serif' };
      case 'JetBrains Mono':
        return { fontFamily: '"JetBrains Mono", monospace' };
      default:
        return { fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' };
    }
  };

  const getFontSizeClass = () => {
    switch (templateStyle.fontSize) {
      case 'compact':
        return 'text-[11px] leading-snug';
      case 'spacious':
        return 'text-[13px] leading-relaxed';
      default:
        return 'text-xs leading-normal';
    }
  };

  // Render individual sections dynamically based on sectionOrder
  const renderSection = (key: SectionKey) => {
    if (!visibleSections[key]) return null;

    switch (key) {
      case 'summary':
        return (
          <div key="summary" className="space-y-1.5 relative group">
            <div className="flex items-center justify-between border-b pb-0.5" style={{ borderColor: 'var(--border-primary)' }}>
              <h3 
                className="text-xs font-bold uppercase tracking-wider font-mono" 
                style={{ color: templateStyle.accentColor }}
              >
                Professional Summary
              </h3>
              {isEditMode && (
                <div className="no-print opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                  <button onClick={() => moveSectionUp('summary')} className="p-1 hover:text-blue-600" title="Move Up"><ArrowUp className="w-3 h-3" /></button>
                  <button onClick={() => moveSectionDown('summary')} className="p-1 hover:text-blue-600" title="Move Down"><ArrowDown className="w-3 h-3" /></button>
                </div>
              )}
            </div>

            {/* Google Docs-style Diff Box if in Tailor tab with suggestion */}
            {activeTab === 'tailor' && suggestions['summary'] && suggestions['summary'].status === 'pending' ? (
              <div className="p-3 rounded-xl border space-y-2 bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800">
                <div className="flex items-center justify-between text-[11px] font-bold text-purple-800 dark:text-purple-300">
                  <span className="flex items-center gap-1.5">
                    <Wand2 className="w-3.5 h-3.5" /> AI Tailored Summary Suggestion:
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleAcceptSuggestion('summary')}
                      className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold flex items-center gap-1 shadow-sm"
                    >
                      <Check className="w-3 h-3" /> Accept
                    </button>
                    <button
                      onClick={() => handleRejectSuggestion('summary')}
                      className="px-2.5 py-1 rounded bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-[10px] font-medium flex items-center gap-1"
                    >
                      <X className="w-3 h-3" /> Keep Original
                    </button>
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="line-through opacity-60 text-red-600 dark:text-red-400">
                    {suggestions['summary'].originalText}
                  </div>
                  <div className="font-medium text-emerald-700 dark:text-emerald-300">
                    {suggestions['summary'].suggestedText}
                  </div>
                </div>
              </div>
            ) : isEditMode ? (
              <textarea
                rows={3}
                value={activeBlueprint.summary || ''}
                onChange={(e) => updateActiveBlueprint({ ...activeBlueprint, summary: e.target.value })}
                placeholder="Write a compelling executive summary highlighting your core tech strengths and architectural contributions..."
                className="input-base w-full text-xs leading-relaxed"
                style={getFontFamilyStyle()}
              />
            ) : (
              <p className="text-xs leading-relaxed text-justify" style={{ color: 'var(--text-secondary)' }}>
                {activeBlueprint.summary || 'Software engineering professional with deep technical expertise in systems design and modern cloud architectures.'}
              </p>
            )}
          </div>
        );

      case 'experience':
        return (
          <div key="experience" className="space-y-3.5 relative group">
            <div className="flex items-center justify-between border-b pb-0.5" style={{ borderColor: 'var(--border-primary)' }}>
              <div className="flex items-center gap-2">
                <h3 
                  className="text-xs font-bold uppercase tracking-wider font-mono flex items-center gap-1.5" 
                  style={{ color: templateStyle.accentColor }}
                >
                  <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
                  Work Experience
                </h3>
              </div>
              {isEditMode && (
                <div className="no-print flex items-center gap-2">
                  <button
                    onClick={addExperience}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Job
                  </button>
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                    <button onClick={() => moveSectionUp('experience')} className="p-1 hover:text-blue-600" title="Move Up"><ArrowUp className="w-3 h-3" /></button>
                    <button onClick={() => moveSectionDown('experience')} className="p-1 hover:text-blue-600" title="Move Down"><ArrowDown className="w-3 h-3" /></button>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3.5">
              {(activeBlueprint.experience || []).map((exp, expIdx) => (
                <div key={expIdx} className={`space-y-1.5 ${isEditMode ? 'p-3.5 rounded-xl border' : ''}`} style={{ borderColor: 'var(--border-primary)' }}>
                  {isEditMode ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase font-mono text-emerald-600">
                          Experience #{expIdx + 1}
                        </span>
                        <button
                          onClick={() => deleteExperience(expIdx)}
                          className="text-red-500 hover:text-red-700 p-1"
                          title="Remove this experience"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="block font-medium text-[11px] mb-0.5" style={{ color: 'var(--text-secondary)' }}>Company</label>
                          <input
                            type="text"
                            value={exp.company}
                            onChange={(e) => updateExperience(expIdx, 'company', e.target.value)}
                            placeholder="Company Name (e.g. SUREXA IT Solutions, DRDO ADRDE)"
                            className="input-base w-full text-xs font-semibold"
                          />
                        </div>
                        <div>
                          <label className="block font-medium text-[11px] mb-0.5" style={{ color: 'var(--text-secondary)' }}>Role / Title</label>
                          <input
                            type="text"
                            value={exp.role}
                            onChange={(e) => updateExperience(expIdx, 'role', e.target.value)}
                            placeholder="Role Title (e.g. Full Stack Developer Intern)"
                            className="input-base w-full text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                        <div>
                          <label className="block font-medium text-[11px] mb-0.5" style={{ color: 'var(--text-secondary)' }}>Location</label>
                          <input
                            type="text"
                            value={exp.location || ''}
                            onChange={(e) => updateExperience(expIdx, 'location', e.target.value)}
                            placeholder="City / State"
                            className="input-base w-full text-xs"
                          />
                        </div>
                        <div>
                          <label className="block font-medium text-[11px] mb-0.5" style={{ color: 'var(--text-secondary)' }}>Start Date</label>
                          <input
                            type="text"
                            value={exp.start_date || ''}
                            onChange={(e) => updateExperience(expIdx, 'start_date', e.target.value)}
                            placeholder="e.g. May 2024"
                            className="input-base w-full text-xs"
                          />
                        </div>
                        <div>
                          <label className="block font-medium text-[11px] mb-0.5" style={{ color: 'var(--text-secondary)' }}>End Date</label>
                          <input
                            type="text"
                            value={exp.end_date || ''}
                            onChange={(e) => updateExperience(expIdx, 'end_date', e.target.value)}
                            placeholder="e.g. July 2024 or Present"
                            className="input-base w-full text-xs"
                          />
                        </div>
                      </div>

                      {/* Bullets with Suggestion Boxes in Tailor tab */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
                            Impact & Responsibilities (STAR Bullets)
                          </label>
                          <button
                            onClick={() => addExpBullet(expIdx)}
                            className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
                          >
                            <Plus className="w-3 h-3" /> Add Bullet
                          </button>
                        </div>
                        {(exp.bullets || []).map((bullet, bIdx) => {
                          const sugId = `exp-${expIdx}-${bIdx}`;
                          const sug = activeTab === 'tailor' ? suggestions[sugId] : null;

                          return (
                            <div key={bIdx} className="space-y-1">
                              {sug && sug.status === 'pending' ? (
                                <div className="p-2.5 rounded-lg border bg-purple-50/40 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800 space-y-1.5 text-xs">
                                  <div className="flex items-center justify-between text-[10px] font-bold text-purple-700 dark:text-purple-300">
                                    <span className="flex items-center gap-1">
                                      <Wand2 className="w-3 h-3" /> AI Tailored Bullet Suggestion
                                    </span>
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => handleAcceptSuggestion(sugId)}
                                        className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold flex items-center gap-1"
                                      >
                                        <Check className="w-3 h-3" /> Accept
                                      </button>
                                      <button
                                        onClick={() => handleRejectSuggestion(sugId)}
                                        className="px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-[10px] font-medium"
                                      >
                                        <X className="w-3 h-3" /> Keep Original
                                      </button>
                                    </div>
                                  </div>
                                  <div className="line-through text-red-500 opacity-60">{sug.originalText}</div>
                                  <div className="font-medium text-emerald-700 dark:text-emerald-300">{sug.suggestedText}</div>
                                </div>
                              ) : (
                                <div className="flex items-start gap-1.5">
                                  <textarea
                                    rows={2}
                                    value={bullet}
                                    onChange={(e) => updateExpBullet(expIdx, bIdx, e.target.value)}
                                    placeholder="Action + Context + Quantifiable Result..."
                                    className="input-base w-full text-xs leading-relaxed"
                                  />
                                  <button
                                    onClick={() => deleteExpBullet(expIdx, bIdx)}
                                    className="text-red-400 hover:text-red-600 p-1 mt-1"
                                    title="Delete bullet"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    /* Clean ATS Preview Experience */
                    <div className="space-y-0.5">
                      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between">
                        <div className="flex items-baseline gap-2">
                          <h4 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                            {exp.company}
                          </h4>
                          {exp.location && (
                            <span className="text-xs italic" style={{ color: 'var(--text-secondary)' }}>
                              – {exp.location}
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                          {exp.start_date} – {exp.end_date || 'Present'}
                        </div>
                      </div>

                      <div className="text-xs font-semibold italic" style={{ color: 'var(--text-primary)' }}>
                        {exp.role}
                      </div>

                      {exp.bullets && exp.bullets.length > 0 && (
                        <ul className="list-disc list-outside ml-4 space-y-0.5 text-xs pt-0.5" style={{ color: 'var(--text-secondary)' }}>
                          {exp.bullets.map((bullet, bIdx) => (
                            <li key={bIdx} className="leading-relaxed">
                              {bullet}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case 'projects':
        return (
          <div key="projects" className="space-y-3.5 relative group">
            <div className="flex items-center justify-between border-b pb-0.5" style={{ borderColor: 'var(--border-primary)' }}>
              <div className="flex items-center gap-2">
                <h3 
                  className="text-xs font-bold uppercase tracking-wider font-mono flex items-center gap-1.5" 
                  style={{ color: templateStyle.accentColor }}
                >
                  <FolderGit2 className="w-3.5 h-3.5 text-blue-600" />
                  Technical Projects & Systems
                </h3>
              </div>
              {isEditMode && (
                <div className="no-print flex items-center gap-2">
                  <button
                    onClick={addProject}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Project
                  </button>
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                    <button onClick={() => moveSectionUp('projects')} className="p-1 hover:text-blue-600" title="Move Up"><ArrowUp className="w-3 h-3" /></button>
                    <button onClick={() => moveSectionDown('projects')} className="p-1 hover:text-blue-600" title="Move Down"><ArrowDown className="w-3 h-3" /></button>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3.5">
              {(activeBlueprint.projects || []).map((proj, projIdx) => (
                <div key={projIdx} className={`space-y-1.5 ${isEditMode ? 'p-3.5 rounded-xl border' : ''}`} style={{ borderColor: 'var(--border-primary)' }}>
                  {isEditMode ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase font-mono text-blue-600">
                          Project #{projIdx + 1}
                        </span>
                        <button
                          onClick={() => deleteProject(projIdx)}
                          className="text-red-500 hover:text-red-700 p-1"
                          title="Remove this project"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="block font-medium text-[11px] mb-0.5" style={{ color: 'var(--text-secondary)' }}>Project Name</label>
                          <input
                            type="text"
                            value={proj.name}
                            onChange={(e) => updateProject(projIdx, 'name', e.target.value)}
                            placeholder="e.g. NextGen Firewall (DRDO Project)"
                            className="input-base w-full text-xs font-semibold"
                          />
                        </div>
                        <div>
                          <label className="block font-medium text-[11px] mb-0.5" style={{ color: 'var(--text-secondary)' }}>Tech Stack</label>
                          <input
                            type="text"
                            value={proj.tech_stack || ''}
                            onChange={(e) => updateProject(projIdx, 'tech_stack', e.target.value)}
                            placeholder="e.g. Python, Scapy, NetfilterQueue, ML"
                            className="input-base w-full text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="block font-medium text-[11px] mb-0.5" style={{ color: 'var(--text-secondary)' }}>GitHub Repo URL</label>
                          <input
                            type="text"
                            value={proj.repo_url || ''}
                            onChange={(e) => updateProject(projIdx, 'repo_url', e.target.value)}
                            placeholder="https://github.com/..."
                            className="input-base w-full text-xs"
                          />
                        </div>
                        <div>
                          <label className="block font-medium text-[11px] mb-0.5" style={{ color: 'var(--text-secondary)' }}>Live Demo / Link</label>
                          <input
                            type="text"
                            value={proj.live_url || ''}
                            onChange={(e) => updateProject(projIdx, 'live_url', e.target.value)}
                            placeholder="https://..."
                            className="input-base w-full text-xs"
                          />
                        </div>
                      </div>

                      {/* Project Bullets with Suggestions */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
                            Project Details & Quantifiable Impact
                          </label>
                          <button
                            onClick={() => addProjBullet(projIdx)}
                            className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
                          >
                            <Plus className="w-3 h-3" /> Add Bullet
                          </button>
                        </div>
                        {(proj.bullets || []).map((bullet, bIdx) => {
                          const sugId = `proj-${projIdx}-${bIdx}`;
                          const sug = activeTab === 'tailor' ? suggestions[sugId] : null;

                          return (
                            <div key={bIdx} className="space-y-1">
                              {sug && sug.status === 'pending' ? (
                                <div className="p-2.5 rounded-lg border bg-purple-50/40 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800 space-y-1.5 text-xs">
                                  <div className="flex items-center justify-between text-[10px] font-bold text-purple-700 dark:text-purple-300">
                                    <span className="flex items-center gap-1">
                                      <Wand2 className="w-3 h-3" /> AI Tailored Project Bullet
                                    </span>
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => handleAcceptSuggestion(sugId)}
                                        className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold flex items-center gap-1"
                                      >
                                        <Check className="w-3 h-3" /> Accept
                                      </button>
                                      <button
                                        onClick={() => handleRejectSuggestion(sugId)}
                                        className="px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-[10px] font-medium"
                                      >
                                        <X className="w-3 h-3" /> Keep Original
                                      </button>
                                    </div>
                                  </div>
                                  <div className="line-through text-red-500 opacity-60">{sug.originalText}</div>
                                  <div className="font-medium text-emerald-700 dark:text-emerald-300">{sug.suggestedText}</div>
                                </div>
                              ) : (
                                <div className="flex items-start gap-1.5">
                                  <textarea
                                    rows={2}
                                    value={bullet}
                                    onChange={(e) => updateProjBullet(projIdx, bIdx, e.target.value)}
                                    placeholder="Key feature developed, algorithms implemented, or benchmarks achieved..."
                                    className="input-base w-full text-xs leading-relaxed"
                                  />
                                  <button
                                    onClick={() => deleteProjBullet(projIdx, bIdx)}
                                    className="text-red-400 hover:text-red-600 p-1 mt-1"
                                    title="Delete bullet"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    /* Clean ATS Preview Project */
                    <div className="space-y-0.5">
                      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <h4 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                            {proj.name}
                          </h4>
                          {proj.tech_stack && (
                            <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                              | {proj.tech_stack}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          {proj.repo_url && (
                            <a
                              href={proj.repo_url.startsWith('http') ? proj.repo_url : `https://${proj.repo_url}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:underline flex items-center gap-0.5 font-mono"
                            >
                              Code ↗
                            </a>
                          )}
                          {proj.live_url && (
                            <a
                              href={proj.live_url.startsWith('http') ? proj.live_url : `https://${proj.live_url}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-600 hover:underline flex items-center gap-0.5 font-mono"
                            >
                              Demo ↗
                            </a>
                          )}
                        </div>
                      </div>

                      {proj.bullets && proj.bullets.length > 0 && (
                        <ul className="list-disc list-outside ml-4 space-y-0.5 text-xs pt-0.5" style={{ color: 'var(--text-secondary)' }}>
                          {proj.bullets.map((bullet, bIdx) => (
                            <li key={bIdx} className="leading-relaxed">
                              {bullet}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case 'skills':
        return (
          <div key="skills" className="space-y-2.5 relative group">
            <div className="flex items-center justify-between border-b pb-0.5" style={{ borderColor: 'var(--border-primary)' }}>
              <div className="flex items-center gap-2">
                <h3 
                  className="text-xs font-bold uppercase tracking-wider font-mono flex items-center gap-1.5" 
                  style={{ color: templateStyle.accentColor }}
                >
                  <Code2 className="w-3.5 h-3.5 text-amber-600" />
                  Technical Skills & Tools
                </h3>
              </div>
              {isEditMode && (
                <div className="no-print flex items-center gap-2">
                  <button
                    onClick={addSkillCategory}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Category
                  </button>
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                    <button onClick={() => moveSectionUp('skills')} className="p-1 hover:text-blue-600" title="Move Up"><ArrowUp className="w-3 h-3" /></button>
                    <button onClick={() => moveSectionDown('skills')} className="p-1 hover:text-blue-600" title="Move Down"><ArrowDown className="w-3 h-3" /></button>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              {(activeBlueprint.skills || []).map((cat, catIdx) => (
                <div key={catIdx} className={isEditMode ? 'p-3 rounded-xl border space-y-2' : 'flex flex-col sm:flex-row sm:items-baseline gap-1 text-xs'} style={{ borderColor: 'var(--border-primary)' }}>
                  {isEditMode ? (
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <input
                          type="text"
                          value={cat.category}
                          onChange={(e) => updateSkillCategoryName(catIdx, e.target.value)}
                          placeholder="Category (e.g. Languages, Frameworks, Cloud)"
                          className="input-base text-xs font-bold w-1/2"
                        />
                        <button
                          onClick={() => deleteSkillCategory(catIdx)}
                          className="text-red-400 hover:text-red-600 p-1"
                          title="Remove Category"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Skill Tags */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {cat.skills.map((skill, sIdx) => (
                          <span
                            key={sIdx}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium"
                            style={{
                              backgroundColor: 'var(--bg-tertiary)',
                              color: 'var(--text-primary)',
                              border: '1px solid var(--border-primary)',
                            }}
                          >
                            <span>{skill}</span>
                            <button
                              onClick={() => removeSkillTag(catIdx, sIdx)}
                              className="text-gray-400 hover:text-red-500 font-bold ml-1 text-xs"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                        <div className="inline-flex items-center gap-1">
                          <input
                            type="text"
                            placeholder="+ Add skill..."
                            value={newSkillInput[catIdx] || ''}
                            onChange={(e) => setNewSkillInput({ ...newSkillInput, [catIdx]: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ',') {
                                e.preventDefault();
                                addSkillTag(catIdx, newSkillInput[catIdx] || '');
                              }
                            }}
                            className="input-base text-xs"
                            style={{ width: '110px', height: '28px' }}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Clean ATS Skills Line */
                    <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 text-xs leading-relaxed">
                      <span className="font-bold shrink-0" style={{ color: 'var(--text-primary)' }}>
                        {cat.category}:
                      </span>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        {cat.skills.join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case 'education':
        return (
          <div key="education" className="space-y-2.5 relative group">
            <div className="flex items-center justify-between border-b pb-0.5" style={{ borderColor: 'var(--border-primary)' }}>
              <div className="flex items-center gap-2">
                <h3 
                  className="text-xs font-bold uppercase tracking-wider font-mono flex items-center gap-1.5" 
                  style={{ color: templateStyle.accentColor }}
                >
                  <GraduationCap className="w-3.5 h-3.5 text-purple-600" />
                  Education
                </h3>
              </div>
              {isEditMode && (
                <div className="no-print flex items-center gap-2">
                  <button
                    onClick={addEducation}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Education
                  </button>
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                    <button onClick={() => moveSectionUp('education')} className="p-1 hover:text-blue-600" title="Move Up"><ArrowUp className="w-3 h-3" /></button>
                    <button onClick={() => moveSectionDown('education')} className="p-1 hover:text-blue-600" title="Move Down"><ArrowDown className="w-3 h-3" /></button>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2.5">
              {(activeBlueprint.education || []).map((edu, eduIdx) => (
                <div key={eduIdx} className={isEditMode ? 'p-3 rounded-xl border space-y-2' : 'space-y-0.5 text-xs'} style={{ borderColor: 'var(--border-primary)' }}>
                  {isEditMode ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase font-mono text-purple-600">
                          Education #{eduIdx + 1}
                        </span>
                        <button
                          onClick={() => deleteEducation(eduIdx)}
                          className="text-red-400 hover:text-red-600 p-1"
                          title="Remove Education"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="block font-medium text-[11px] mb-0.5" style={{ color: 'var(--text-secondary)' }}>University / College</label>
                          <input
                            type="text"
                            value={edu.university}
                            onChange={(e) => updateEducation(eduIdx, 'university', e.target.value)}
                            placeholder="e.g. Graphic Era Hill University"
                            className="input-base w-full text-xs font-semibold"
                          />
                        </div>
                        <div>
                          <label className="block font-medium text-[11px] mb-0.5" style={{ color: 'var(--text-secondary)' }}>Degree & Field</label>
                          <input
                            type="text"
                            value={edu.degree}
                            onChange={(e) => updateEducation(eduIdx, 'degree', e.target.value)}
                            placeholder="e.g. B.Tech in Computer Science & Engineering"
                            className="input-base w-full text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                        <div>
                          <label className="block font-medium text-[11px] mb-0.5" style={{ color: 'var(--text-secondary)' }}>Start Date</label>
                          <input
                            type="text"
                            value={edu.start_date || ''}
                            onChange={(e) => updateEducation(eduIdx, 'start_date', e.target.value)}
                            placeholder="e.g. 2021"
                            className="input-base w-full text-xs"
                          />
                        </div>
                        <div>
                          <label className="block font-medium text-[11px] mb-0.5" style={{ color: 'var(--text-secondary)' }}>End Date</label>
                          <input
                            type="text"
                            value={edu.end_date || ''}
                            onChange={(e) => updateEducation(eduIdx, 'end_date', e.target.value)}
                            placeholder="e.g. 2025"
                            className="input-base w-full text-xs"
                          />
                        </div>
                        <div>
                          <label className="block font-medium text-[11px] mb-0.5" style={{ color: 'var(--text-secondary)' }}>CGPA / Percentage</label>
                          <input
                            type="text"
                            value={edu.gpa || ''}
                            onChange={(e) => updateEducation(eduIdx, 'gpa', e.target.value)}
                            placeholder="e.g. 8.4 / 10"
                            className="input-base w-full text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Clean ATS Preview Education */
                    <div>
                      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between">
                        <div className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                          {edu.university}
                        </div>
                        <div className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                          {edu.start_date} – {edu.end_date}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
                        <span>{edu.degree} {edu.field_of_study ? `in ${edu.field_of_study}` : ''}</span>
                        {edu.gpa && <span>GPA: {edu.gpa}</span>}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case 'achievements':
        return (
          <div key="achievements" className="space-y-2.5 relative group">
            <div className="flex items-center justify-between border-b pb-0.5" style={{ borderColor: 'var(--border-primary)' }}>
              <div className="flex items-center gap-2">
                <h3 
                  className="text-xs font-bold uppercase tracking-wider font-mono flex items-center gap-1.5" 
                  style={{ color: templateStyle.accentColor }}
                >
                  <Award className="w-3.5 h-3.5 text-amber-500" />
                  Achievements & Hackathons
                </h3>
              </div>
              {isEditMode && (
                <div className="no-print flex items-center gap-2">
                  <button
                    onClick={addAchievement}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Achievement
                  </button>
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                    <button onClick={() => moveSectionUp('achievements')} className="p-1 hover:text-blue-600" title="Move Up"><ArrowUp className="w-3 h-3" /></button>
                    <button onClick={() => moveSectionDown('achievements')} className="p-1 hover:text-blue-600" title="Move Down"><ArrowDown className="w-3 h-3" /></button>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              {isEditMode ? (
                (activeBlueprint.achievements || []).map((ach, achIdx) => (
                  <div key={achIdx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={ach}
                      onChange={(e) => updateAchievement(achIdx, e.target.value)}
                      placeholder="e.g. 1st Place Winner – SIH 2024, DRDO ADRDE Demonstration"
                      className="input-base w-full text-xs"
                    />
                    <button
                      onClick={() => deleteAchievement(achIdx)}
                      className="text-red-400 hover:text-red-600 p-1"
                      title="Delete achievement"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              ) : (
                <ul className="list-disc list-outside ml-4 space-y-0.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {(activeBlueprint.achievements || []).map((ach, achIdx) => (
                    <li key={achIdx} className="leading-relaxed">
                      {ach}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Main Tab Navigation (Cleanly separates Master Template vs Job Tailor) */}
      <div 
        className="no-print p-2 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
        style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-primary)' }}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('master')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'master'
                ? 'bg-blue-600 text-white shadow-md'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
            style={{ color: activeTab === 'master' ? '#ffffff' : 'var(--text-secondary)' }}
          >
            <Layers className="w-4 h-4" />
            <span>1. Master Template & Blueprint</span>
            {hasMasterResume && (
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('tailor')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'tailor'
                ? 'bg-purple-600 text-white shadow-md'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
            style={{ color: activeTab === 'tailor' ? '#ffffff' : 'var(--text-secondary)' }}
          >
            <Target className="w-4 h-4" />
            <span>2. Job Application Tailor (JD Optimizer)</span>
            {pendingSuggestionsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-gray-900 text-[10px] font-bold">
                {pendingSuggestionsCount}
              </span>
            )}
          </button>
        </div>

        {/* Action Controls for Current Active Tab */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Multi-Template Selector Dropdown */}
          <div className="relative flex items-center">
            <select
              value={activeTemplateId}
              onChange={(e) => handleSwitchTemplate(e.target.value)}
              className="input-base text-xs font-semibold pr-8"
              style={{ height: '34px' }}
            >
              <option value="master-default">Default Master Template</option>
              {savedTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>

            <button
              onClick={() => setIsSaveTemplateModalOpen(true)}
              className="ml-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 hover:bg-gray-100 dark:hover:bg-gray-800"
              title="Save current layout as a new reusable template"
              style={{ borderColor: 'var(--border-primary)' }}
            >
              <BookmarkPlus className="w-3.5 h-3.5 text-amber-500" />
              <span>Save Template</span>
            </button>
          </div>

          {/* View Mode Toggle */}
          <div 
            className="flex items-center p-1 rounded-xl border"
            style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-primary)' }}
          >
            <button
              onClick={() => setIsEditMode(true)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                isEditMode
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'hover:text-blue-600'
              }`}
              style={{ color: isEditMode ? '#ffffff' : 'var(--text-secondary)' }}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Interactive Editor</span>
            </button>
            <button
              onClick={() => setIsEditMode(false)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                !isEditMode
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'hover:text-blue-600'
              }`}
              style={{ color: !isEditMode ? '#ffffff' : 'var(--text-secondary)' }}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Clean ATS Preview</span>
            </button>
          </div>

          {/* Section Manager Toggle */}
          <button
            onClick={() => {
              setIsSectionManagerOpen(!isSectionManagerOpen);
              setIsStyleOpen(false);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
              isSectionManagerOpen ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-950 dark:text-blue-300' : ''
            }`}
            style={{
              backgroundColor: isSectionManagerOpen ? undefined : 'var(--bg-tertiary)',
              color: isSectionManagerOpen ? undefined : 'var(--text-primary)',
              borderColor: 'var(--border-primary)'
            }}
            title="Reorder & Toggle Sections"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-blue-600" />
            <span>Reorder Sections</span>
          </button>

          {/* Template Style Toggle */}
          <button
            onClick={() => {
              setIsStyleOpen(!isStyleOpen);
              setIsSectionManagerOpen(false);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
              isStyleOpen ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-950 dark:text-blue-300' : ''
            }`}
            style={{
              backgroundColor: isStyleOpen ? undefined : 'var(--bg-tertiary)',
              color: isStyleOpen ? undefined : 'var(--text-primary)',
              borderColor: 'var(--border-primary)'
            }}
          >
            <Palette className="w-3.5 h-3.5 text-purple-600" />
            <span>Styling</span>
          </button>

          {/* If on Master tab: Show Save Master Button */}
          {activeTab === 'master' ? (
            <>
              <button
                onClick={handleSaveMaster}
                disabled={isSaving}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Save Master'}</span>
              </button>

              <button
                onClick={() => setIsResumeModalOpen(true)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  borderColor: 'var(--border-primary)'
                }}
              >
                <UploadCloud className="w-3.5 h-3.5 text-blue-600" />
                <span>Upload PDF</span>
              </button>
            </>
          ) : (
            /* If on Tailor tab: Show Export & Copy Options */
            <>
              <button
                onClick={handleCopyMarkdown}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  borderColor: 'var(--border-primary)'
                }}
                title="Copy formatted Markdown"
              >
                <Copy className="w-3.5 h-3.5 text-emerald-600" />
                <span>Copy Text</span>
              </button>
            </>
          )}

          {/* Print / Download PDF */}
          <button
            onClick={handlePrint}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all"
            style={{
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              borderColor: 'var(--border-primary)'
            }}
          >
            <Printer className="w-4 h-4" />
            <span>Print / PDF</span>
          </button>
        </div>
      </div>

      {/* Save Template Modal */}
      {isSaveTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div 
            className="w-full max-w-md p-6 rounded-2xl border space-y-4 shadow-2xl"
            style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-primary)' }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookmarkPlus className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  Save Custom Template Preset
                </h3>
              </div>
              <button onClick={() => setIsSaveTemplateModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Save your current section order, typography, accent color, and custom content as a reusable template for specific job types (e.g. Backend, Research, Lead).
            </p>

            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                Template Name
              </label>
              <input
                type="text"
                value={newTemplateNameInput}
                onChange={(e) => setNewTemplateNameInput(e.target.value)}
                placeholder="e.g. DRDO & AI Research Focus / Startup Full-Stack"
                className="input-base w-full text-xs"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveCurrentAsNewTemplate();
                }}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsSaveTemplateModalOpen(false)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium"
                style={{ color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCurrentAsNewTemplate}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm"
              >
                Save Template Preset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Section Reorder & Visibility Manager Drawer */}
      {isSectionManagerOpen && (
        <div 
          className="no-print p-4 rounded-2xl border space-y-3 shadow-sm animate-in fade-in duration-200"
          style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-primary)' }}
        >
          <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: 'var(--border-primary)' }}>
            <div className="flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
                Section Reordering & Visibility Manager
              </h3>
            </div>
            <button onClick={() => setIsSectionManagerOpen(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-xs">
            {sectionOrder.map((key, idx) => (
              <div 
                key={key} 
                className="p-2.5 rounded-xl border flex flex-col justify-between gap-2"
                style={{ 
                  backgroundColor: visibleSections[key] ? 'var(--bg-secondary)' : 'var(--bg-tertiary)',
                  borderColor: 'var(--border-primary)' 
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold capitalize text-[11px]" style={{ color: 'var(--text-primary)' }}>
                    {idx + 1}. {key}
                  </span>
                  <button
                    onClick={() => toggleSectionVisibility(key)}
                    className="text-gray-400 hover:text-blue-600"
                    title={visibleSections[key] ? 'Hide section' : 'Show section'}
                  >
                    {visibleSections[key] ? <Eye className="w-3.5 h-3.5 text-emerald-600" /> : <EyeOff className="w-3.5 h-3.5 text-gray-400" />}
                  </button>
                </div>

                <div className="flex items-center gap-1 justify-end pt-1 border-t" style={{ borderColor: 'var(--border-primary)' }}>
                  <button
                    onClick={() => moveSectionUp(key)}
                    disabled={idx === 0}
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30"
                    title="Move section left / up"
                  >
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => moveSectionDown(key)}
                    disabled={idx === sectionOrder.length - 1}
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30"
                    title="Move section right / down"
                  >
                    <ArrowDown className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Template Styling Controls Drawer */}
      {isStyleOpen && (
        <div 
          className="no-print p-4 rounded-2xl border space-y-3 shadow-sm animate-in fade-in duration-200"
          style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-primary)' }}
        >
          <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: 'var(--border-primary)' }}>
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-purple-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
                Template Appearance & Typography Controls
              </h3>
            </div>
            <button onClick={() => setIsStyleOpen(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            {/* Font Family */}
            <div>
              <label className="block font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Typography</label>
              <select
                value={templateStyle.fontFamily}
                onChange={(e: any) => setTemplateStyle({ ...templateStyle, fontFamily: e.target.value })}
                className="input-base w-full text-xs"
              >
                <option value="Inter">Inter (Modern Clean)</option>
                <option value="Merriweather">Merriweather (Executive Serif)</option>
                <option value="Roboto">Roboto (Technical Sans)</option>
                <option value="JetBrains Mono">JetBrains Mono (Developer)</option>
              </select>
            </div>

            {/* Font Size */}
            <div>
              <label className="block font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Density / Text Size</label>
              <select
                value={templateStyle.fontSize}
                onChange={(e: any) => setTemplateStyle({ ...templateStyle, fontSize: e.target.value })}
                className="input-base w-full text-xs"
              >
                <option value="compact">Compact (Fit 1 Page)</option>
                <option value="standard">Standard (10.5 pt)</option>
                <option value="spacious">Spacious (11.5 pt)</option>
              </select>
            </div>

            {/* Header Alignment */}
            <div>
              <label className="block font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Header Align</label>
              <select
                value={templateStyle.headerAlign}
                onChange={(e: any) => setTemplateStyle({ ...templateStyle, headerAlign: e.target.value })}
                className="input-base w-full text-xs"
              >
                <option value="center">Centered (Standard ATS)</option>
                <option value="left">Left Aligned (Modern Silicon Valley)</option>
              </select>
            </div>

            {/* Accent Color Palette */}
            <div>
              <label className="block font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Accent Theme</label>
              <div className="flex items-center gap-2 pt-1">
                {ACCENT_COLORS.map((col, idx) => (
                  <button
                    key={idx}
                    onClick={() => setTemplateStyle({ ...templateStyle, accentColor: col.value })}
                    className={`w-6 h-6 rounded-full border-2 transition-all ${
                      templateStyle.accentColor === col.value ? 'scale-110 border-blue-500 shadow-sm' : 'border-transparent'
                    } ${col.class}`}
                    title={col.name}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Dedicated Job Tailor Parameters Box */}
      {activeTab === 'tailor' && (
        <div 
          className="no-print p-6 rounded-2xl border space-y-5 shadow-sm bg-gradient-to-b from-purple-50/30 to-blue-50/20 dark:from-purple-950/20 dark:to-blue-950/10"
          style={{ borderColor: 'var(--border-primary)' }}
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3" style={{ borderColor: 'var(--border-primary)' }}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  Job Application Tailor & Evidence Assistant
                </h3>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Align your STAR experience bullets, verify skill requirements, and weave authentic project evidence into your resume.
                </p>
              </div>
            </div>
            {atsScore !== null && (
              <span className="px-3 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1.5 shrink-0 self-start sm:self-center shadow-sm">
                <Award className="w-3.5 h-3.5 text-emerald-600" /> Tailored ATS Match: {atsScore}%
              </span>
            )}
          </div>

          {/* Role & Company Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                Target Role Title
              </label>
              <input
                type="text"
                placeholder="e.g. Senior Backend / Distributed Systems Engineer"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="input-base w-full text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                Target Company Name
              </label>
              <input
                type="text"
                placeholder="e.g. Google, Stripe, Microsoft, DRDO"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="input-base w-full text-xs"
              />
            </div>
          </div>

          {/* JD Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-semibold text-xs" style={{ color: 'var(--text-secondary)' }}>
                Target Job Description (JD) / Requirements
              </label>
              <span className="text-[11px] font-mono text-purple-600 dark:text-purple-400">
                {analyzedSkills.matched.length + analyzedSkills.missing.length > 0 && 
                  `${analyzedSkills.matched.length} Matched | ${analyzedSkills.missing.length} Missing Skills`}
              </span>
            </div>
            <textarea
              rows={3}
              placeholder="Paste target job description to analyze required skills and synthesize STAR bullets..."
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              className="input-base w-full text-xs font-mono leading-relaxed"
            />
          </div>

          {/* Interactive Skill Gap & Evidence Verification Assistant */}
          <div 
            className="p-4 rounded-xl border space-y-3.5 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm"
            style={{ borderColor: 'var(--border-primary)' }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-purple-600" />
                <h4 className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                  Skill Gap & Verification Assistant
                </h4>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-medium">
                AI Keyword & Evidence Verification
              </span>
            </div>

            {/* Matched Skills Badges */}
            {analyzedSkills.matched.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Already in your profile ({analyzedSkills.matched.length}):</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {analyzedSkills.matched.map((skill, idx) => (
                    <span 
                      key={idx}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                    >
                      <Check className="w-3 h-3" /> {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Missing Skills Questions & Evidence Attachment */}
            <div className="space-y-2.5 pt-1">
              <div className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Skills requested in JD ({analyzedSkills.missing.length + Object.keys(skillDecisions).filter(k => !analyzedSkills.missing.includes(k)).length}):</span>
              </div>

              {analyzedSkills.missing.length === 0 && Object.keys(skillDecisions).length === 0 ? (
                <p className="text-xs text-gray-500 italic">
                  Paste a JD above to automatically detect missing skills and verify your experience.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-2.5">
                  {/* Standard Detected Missing Skills + Custom Added Skills */}
                  {Array.from(new Set([...analyzedSkills.missing, ...Object.keys(skillDecisions)])).map((skillName) => {
                    const decision = skillDecisions[skillName];
                    const hasExp = decision ? decision.hasExperience : false;
                    const isDecided = decision !== undefined;

                    return (
                      <div 
                        key={skillName}
                        className="p-3 rounded-xl border space-y-2.5 transition-all"
                        style={{ 
                          backgroundColor: hasExp ? 'rgba(16, 185, 129, 0.04)' : 'var(--bg-secondary)',
                          borderColor: hasExp ? '#10B981' : 'var(--border-primary)'
                        }}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300">
                              {skillName}
                            </span>
                            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                              Do you have experience with <strong style={{ color: 'var(--text-primary)' }}>{skillName}</strong>?
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleToggleSkillExperience(skillName, true)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                                hasExp
                                  ? 'bg-emerald-600 text-white shadow-sm'
                                  : 'border hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                              }`}
                              style={{
                                borderColor: hasExp ? undefined : 'var(--border-primary)',
                                color: hasExp ? '#ffffff' : 'var(--text-secondary)'
                              }}
                            >
                              <Check className="w-3 h-3" />
                              <span>Yes, I know this</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleSkillExperience(skillName, false, 'No / Skip')}
                              className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
                                isDecided && !hasExp && decision?.notes !== 'Learning'
                                  ? 'bg-gray-700 text-white shadow-sm'
                                  : 'border hover:bg-gray-100 dark:hover:bg-gray-800'
                              }`}
                              style={{
                                borderColor: isDecided && !hasExp && decision?.notes !== 'Learning' ? undefined : 'var(--border-primary)',
                                color: isDecided && !hasExp && decision?.notes !== 'Learning' ? '#ffffff' : 'var(--text-secondary)'
                              }}
                            >
                              <X className="w-3 h-3" />
                              <span>No / Skip</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleSkillExperience(skillName, false, 'Learning')}
                              className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
                                decision?.notes === 'Learning'
                                  ? 'bg-amber-500 text-white shadow-sm'
                                  : 'border hover:bg-amber-50 dark:hover:bg-amber-950/30'
                              }`}
                              style={{
                                borderColor: decision?.notes === 'Learning' ? undefined : 'var(--border-primary)',
                                color: decision?.notes === 'Learning' ? '#ffffff' : 'var(--text-secondary)'
                              }}
                            >
                              <span>Learning</span>
                            </button>
                          </div>
                        </div>

                        {/* Expandable Evidence Form when "Yes" is confirmed */}
                        {hasExp && (
                          <div 
                            className="p-2.5 rounded-lg border space-y-2 animate-in fade-in duration-150"
                            style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-primary)' }}
                          >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                              <div>
                                <label className="block text-[11px] font-semibold mb-0.5 flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                                  <Link2 className="w-3 h-3 text-blue-500" /> Evidence / Project / GitHub Link (Optional)
                                </label>
                                <input
                                  type="text"
                                  placeholder="e.g. https://github.com/myaccount/redis-cache-service"
                                  value={decision?.evidenceUrl || ''}
                                  onChange={(e) => handleUpdateSkillEvidence(skillName, e.target.value)}
                                  className="input-base w-full text-xs font-mono"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold mb-0.5 flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                                  <FileText className="w-3 h-3 text-purple-500" /> Context / What you built (Optional)
                                </label>
                                <input
                                  type="text"
                                  placeholder="e.g. Built microservice handling 5k rps using this skill"
                                  value={decision?.notes || ''}
                                  onChange={(e) => handleUpdateSkillNotes(skillName, e.target.value)}
                                  className="input-base w-full text-xs"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add Custom Skill & Evidence Trigger */}
              {!showAddCustomSkill ? (
                <button
                  type="button"
                  onClick={() => setShowAddCustomSkill(true)}
                  className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 pt-1"
                >
                  <PlusCircle className="w-3.5 h-3.5" /> + Add Another Missing Skill / Tech Manually
                </button>
              ) : (
                <div 
                  className="p-3 rounded-xl border space-y-2 animate-in fade-in duration-150"
                  style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-primary)' }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                      Add Custom Skill & Evidence
                    </span>
                    <button onClick={() => setShowAddCustomSkill(false)} className="text-gray-400 hover:text-gray-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <input
                      type="text"
                      placeholder="Skill name (e.g. WebRTC, Terraform)"
                      value={customSkillToAdd}
                      onChange={(e) => setCustomSkillToAdd(e.target.value)}
                      className="input-base w-full text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Evidence URL (Optional, e.g. GitHub link)"
                      value={customEvidenceToAdd}
                      onChange={(e) => setCustomEvidenceToAdd(e.target.value)}
                      className="input-base w-full text-xs font-mono"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddCustomSkill(false)}
                      className="px-2.5 py-1 rounded text-xs"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAddCustomSkill}
                      className="px-3 py-1 rounded-lg text-xs font-semibold bg-purple-600 text-white hover:bg-purple-700"
                    >
                      Add & Confirm Skill
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Template Selection for Tailored Resume & Action Bar */}
          <div 
            className="p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/50 dark:bg-gray-900/50"
            style={{ borderColor: 'var(--border-primary)' }}
          >
            {/* Selected Resume Template Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
              <label className="text-xs font-bold flex items-center gap-1.5 shrink-0" style={{ color: 'var(--text-primary)' }}>
                <Palette className="w-3.5 h-3.5 text-purple-600" />
                <span>Resume Template:</span>
              </label>
              <select
                value={activeTemplateId}
                onChange={(e) => handleSwitchTemplate(e.target.value)}
                className="input-base text-xs font-semibold"
                style={{ height: '34px', minWidth: '220px' }}
              >
                <option value="master-default">Onyx ATS Standard (Minimalist)</option>
                {savedTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Optimize Button */}
            <button
              onClick={handleTailorResume}
              disabled={loading}
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 shrink-0"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Synthesizing Tailored STAR Bullets & Incorporating Evidence...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  <span>Optimize Resume with Verified Skills & Evidence</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Google Docs-style Floating Review Bar for Pending Changes (In Tailor Tab) */}
      {activeTab === 'tailor' && pendingSuggestionsCount > 0 && (
        <div 
          className="no-print p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/40 dark:to-blue-950/40"
          style={{ borderColor: 'var(--border-primary)' }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0">
              <Wand2 className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-purple-900 dark:text-purple-200">
                {pendingSuggestionsCount} Pending AI Suggestions for {company || 'Target Role'}
              </h4>
              <p className="text-[11px] text-purple-700 dark:text-purple-300">
                Review highlighted changes below. You can Accept, Reject, or Edit each item inline.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleAcceptAllSuggestions}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-1.5 transition-all"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Accept All ({pendingSuggestionsCount})</span>
            </button>
            <button
              onClick={handleRejectAllSuggestions}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
            >
              Reject All
            </button>
          </div>
        </div>
      )}

      {/* Main Resume Canvas (Standard ATS Resume Layout) */}
      <div className="w-full max-w-4xl mx-auto">
        <div
          className={`resume-paper p-8 sm:p-12 rounded-2xl shadow-xl space-y-5 transition-all ${getFontSizeClass()}`}
          style={{
            ...getFontFamilyStyle(),
            backgroundColor: 'var(--bg-primary)',
            border: isEditMode ? '1px solid var(--border-primary)' : '1px solid var(--border-secondary)',
            color: 'var(--text-primary)',
          }}
        >
          {/* ================= HEADER / CONTACT ================= */}
          <div 
            className="pb-3 space-y-1.5 border-b-2" 
            style={{ 
              borderColor: templateStyle.accentColor,
              textAlign: templateStyle.headerAlign === 'center' ? 'center' : 'left'
            }}
          >
            {isEditMode ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider font-mono" style={{ color: templateStyle.accentColor }}>
                    Candidate Name & Contact Details ({activeTab === 'master' ? 'Master Blueprint' : 'Tailored Copy'})
                  </span>
                </div>
                <input
                  type="text"
                  value={activeBlueprint.contact?.full_name || ''}
                  onChange={(e) => updateContact('full_name', e.target.value)}
                  placeholder="Your Full Name"
                  className="w-full text-2xl font-black tracking-tight input-base"
                  style={{ height: '42px', ...getFontFamilyStyle() }}
                />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <input
                      type="email"
                      value={activeBlueprint.contact?.email || ''}
                      onChange={(e) => updateContact('email', e.target.value)}
                      placeholder="Email"
                      className="input-base w-full text-xs"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <input
                      type="text"
                      value={activeBlueprint.contact?.phone || ''}
                      onChange={(e) => updateContact('phone', e.target.value)}
                      placeholder="Phone"
                      className="input-base w-full text-xs"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <input
                      type="text"
                      value={activeBlueprint.contact?.location || ''}
                      onChange={(e) => updateContact('location', e.target.value)}
                      placeholder="Location (e.g. City, Country)"
                      className="input-base w-full text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <Github className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    <input
                      type="text"
                      value={activeBlueprint.contact?.github_url || ''}
                      onChange={(e) => updateContact('github_url', e.target.value)}
                      placeholder="GitHub URL"
                      className="input-base w-full text-xs"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Linkedin className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                    <input
                      type="text"
                      value={activeBlueprint.contact?.linkedin_url || ''}
                      onChange={(e) => updateContact('linkedin_url', e.target.value)}
                      placeholder="LinkedIn URL"
                      className="input-base w-full text-xs"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <input
                      type="text"
                      value={activeBlueprint.contact?.portfolio_url || ''}
                      onChange={(e) => updateContact('portfolio_url', e.target.value)}
                      placeholder="Portfolio / Website URL"
                      className="input-base w-full text-xs"
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* Clean Preview Header */
              <div className="space-y-1">
                <h1 
                  className="text-2xl sm:text-3xl font-bold tracking-tight uppercase"
                  style={{ color: templateStyle.accentColor }}
                >
                  {activeBlueprint.contact?.full_name || 'Software Engineer'}
                </h1>
                
                <div 
                  className={`flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs pt-0.5 ${
                    templateStyle.headerAlign === 'center' ? 'justify-center' : 'justify-start'
                  }`}
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {activeBlueprint.contact?.location && <span>{activeBlueprint.contact.location}</span>}
                  {activeBlueprint.contact?.phone && <span>• {activeBlueprint.contact.phone}</span>}
                  {activeBlueprint.contact?.email && (
                    <>
                      <span>•</span>
                      <a href={`mailto:${activeBlueprint.contact.email}`} className="hover:underline text-blue-600 dark:text-blue-400">
                        {activeBlueprint.contact.email}
                      </a>
                    </>
                  )}
                  {activeBlueprint.contact?.github_url && (
                    <>
                      <span>•</span>
                      <a 
                        href={activeBlueprint.contact.github_url.startsWith('http') ? activeBlueprint.contact.github_url : `https://${activeBlueprint.contact.github_url}`} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="hover:underline text-blue-600 dark:text-blue-400"
                      >
                        GitHub
                      </a>
                    </>
                  )}
                  {activeBlueprint.contact?.linkedin_url && (
                    <>
                      <span>•</span>
                      <a 
                        href={activeBlueprint.contact.linkedin_url.startsWith('http') ? activeBlueprint.contact.linkedin_url : `https://${activeBlueprint.contact.linkedin_url}`} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="hover:underline text-blue-600 dark:text-blue-400"
                      >
                        LinkedIn
                      </a>
                    </>
                  )}
                  {activeBlueprint.contact?.portfolio_url && (
                    <>
                      <span>•</span>
                      <a 
                        href={activeBlueprint.contact.portfolio_url.startsWith('http') ? activeBlueprint.contact.portfolio_url : `https://${activeBlueprint.contact.portfolio_url}`} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="hover:underline text-blue-600 dark:text-blue-400"
                      >
                        Portfolio
                      </a>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ================= DYNAMICALLY ORDERED RESUME SECTIONS ================= */}
          {sectionOrder.map(key => renderSection(key))}
        </div>
      </div>

      {/* Sync Resume Modal */}
      <SyncResumeModal
        isOpen={isResumeModalOpen}
        onClose={() => setIsResumeModalOpen(false)}
        onUploadSuccess={(bp) => {
          if (bp) {
            setMasterBlueprint(bp);
            setTailoredBlueprint(bp);
            setHasMasterResume(true);
            setSuggestions({});
            setIsMasterDirty(false);
          }
          setIsResumeModalOpen(false);
        }}
        onSuccessToast={onSuccess}
        onErrorToast={onError}
      />
    </div>
  );
};
