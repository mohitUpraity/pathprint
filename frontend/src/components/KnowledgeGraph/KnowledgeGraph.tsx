import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Search, 
  Layers, 
  ExternalLink, 
  Github, 
  X,
  Sparkles,
  Briefcase,
  Code,
  GraduationCap,
  Users,
  User,
  Building2,
  CheckCircle2,
  GitBranch,
  Eye,
  EyeOff,
  Trophy,
  Award,
  Target,
  Maximize2,
  Minimize2,
  Download,
  Sliders,
  Play,
  Pause,
  Compass,
  Radio,
  Share2,
  ChevronRight,
  Info,
  HelpCircle,
  Network,
  Cpu,
  ArrowUpRight,
  ShieldCheck,
  Flame
} from 'lucide-react';
import { GraphData, GraphNode, GraphLink } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/api';

interface KnowledgeGraphProps {
  graphData: GraphData | null;
  loading: boolean;
  onOpenSyncGitHub?: () => void;
  initialNlpQuery?: string;
  onClearInitialQuery?: () => void;
}

// Layout options for the graph
export type LayoutMode = 'force' | 'radial' | 'clustered';

// Visual design tokens for each category — high contrast, vibrant, distinct & human-crafted
export interface CategoryTheme {
  id: string;
  label: string;
  bg: string;
  border: string;
  glow: string;
  pillBg: string;
  pillText: string;
  icon: React.ComponentType<{ className?: string }>;
  radius: number;
  description: string;
}

const CATEGORY_THEMES: Record<string, CategoryTheme> = {
  Candidate: {
    id: 'Candidate',
    label: 'You (Profile)',
    bg: '#2563EB',
    border: '#1D4ED8',
    glow: 'rgba(37, 99, 235, 0.4)',
    pillBg: '#EFF6FF',
    pillText: '#1E40AF',
    icon: User,
    radius: 28,
    description: 'Root candidate profile node and core identity'
  },
  Project: {
    id: 'Project',
    label: 'Projects & Code',
    bg: '#10B981',
    border: '#059669',
    glow: 'rgba(16, 185, 129, 0.4)',
    pillBg: '#ECFDF5',
    pillText: '#047857',
    icon: Code,
    radius: 20,
    description: 'AST verified GitHub repositories and built software systems'
  },
  Skill: {
    id: 'Skill',
    label: 'Verified Skills',
    bg: '#F59E0B',
    border: '#D97706',
    glow: 'rgba(245, 158, 11, 0.4)',
    pillBg: '#FFFBEB',
    pillText: '#B45309',
    icon: CheckCircle2,
    radius: 15,
    description: 'Code-proven languages, frameworks, databases, and architectural tools'
  },
  Company: {
    id: 'Company',
    label: 'Companies & Work',
    bg: '#8B5CF6',
    border: '#7C3AED',
    glow: 'rgba(139, 92, 246, 0.4)',
    pillBg: '#F5F3FF',
    pillText: '#6D28D9',
    icon: Building2,
    radius: 19,
    description: 'Employers, past internships, and target organizations'
  },
  Contact: {
    id: 'Contact',
    label: 'Referral Network',
    bg: '#EC4899',
    border: '#DB2777',
    glow: 'rgba(236, 72, 153, 0.4)',
    pillBg: '#FDF2F8',
    pillText: '#BE185D',
    icon: Users,
    radius: 16,
    description: '1st-degree LinkedIn connections and college alumni referral bridges'
  },
  Education: {
    id: 'Education',
    label: 'Education',
    bg: '#06B6D4',
    border: '#0891B2',
    glow: 'rgba(6, 182, 212, 0.4)',
    pillBg: '#ECFEFF',
    pillText: '#0E7490',
    icon: GraduationCap,
    radius: 19,
    description: 'Universities, academic programs, and verified degrees'
  },
  Achievement: {
    id: 'Achievement',
    label: 'Hackathons & Awards',
    bg: '#EAB308',
    border: '#CA8A04',
    glow: 'rgba(234, 179, 8, 0.4)',
    pillBg: '#FEFCE8',
    pillText: '#A16207',
    icon: Trophy,
    radius: 18,
    description: 'National hackathon podiums, industry awards, and verified milestones'
  },
  Aspiration: {
    id: 'Aspiration',
    label: 'Career Targets',
    bg: '#F43F5E',
    border: '#E11D48',
    glow: 'rgba(244, 63, 94, 0.4)',
    pillBg: '#FFF1F2',
    pillText: '#BE123C',
    icon: Target,
    radius: 20,
    description: 'Desired engineering roles, target domains, and salary goals'
  },
  Default: {
    id: 'Default',
    label: 'Entities',
    bg: '#64748B',
    border: '#475569',
    glow: 'rgba(100, 116, 139, 0.4)',
    pillBg: '#F1F5F9',
    pillText: '#334155',
    icon: Sparkles,
    radius: 14,
    description: 'General verified career ontology entity'
  },
};

export const normalizeCategory = (type?: string, id?: string, category?: string): string => {
  const t = (type || category || '').toLowerCase();
  const i = (id || '').toLowerCase();

  if (t === 'user' || t === 'candidate' || i.startsWith('user_')) return 'Candidate';
  if (t === 'project' || t === 'repo' || t === 'repository' || i.startsWith('proj_')) return 'Project';
  if (t === 'achievement' || t === 'hackathon' || t === 'milestone' || t === 'award' || t === 'post' || i.startsWith('ach_') || i.startsWith('hack_')) return 'Achievement';
  if (t === 'aspiration' || t === 'goal' || t === 'target' || t === 'role' || t === 'career aspiration' || t === 'career goal' || i.startsWith('asp_') || i.startsWith('goal_') || i.startsWith('role_')) return 'Aspiration';
  if (t === 'company' || t === 'employer' || t === 'target company' || i.startsWith('comp_')) return 'Company';
  if (t === 'contact' || t === 'person' || t === 'alumni' || t === '1st-degree connection' || t === 'alumni bridge' || i.startsWith('contact_') || i.startsWith('person_')) return 'Contact';
  if (t === 'university' || t === 'education' || t === 'college' || t === 'school' || i.startsWith('univ_') || i.startsWith('edu_')) return 'Education';
  if (t === 'skill' || t === 'technical skill' || i.startsWith('skill_')) return 'Skill';
  return 'Default';
};

export const getThemeForNode = (node: GraphNode): CategoryTheme => {
  const cat = normalizeCategory(node.type, node.id, node.category);
  return CATEGORY_THEMES[cat] || CATEGORY_THEMES.Default;
};

export const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({ 
  graphData, 
  loading,
  onOpenSyncGitHub,
  initialNlpQuery,
  onClearInitialQuery
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { getAuthHeaders } = useAuth();

  // DOM Refs
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);

  // Core State
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState<boolean>(false);
  const [showRelations, setShowRelations] = useState<boolean>(true);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('force');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isPhysicsPaused, setIsPhysicsPaused] = useState<boolean>(false);
  const [showPhysicsSettings, setShowPhysicsSettings] = useState<boolean>(false);
  const [showLegend, setShowLegend] = useState<boolean>(true);
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);
  const [hopDistance, setHopDistance] = useState<number>(0); // 0 = all, 1 = 1-hop, 2 = 2-hop

  // Physics simulation tuning parameters
  const [chargeStrength, setChargeStrength] = useState<number>(-320);
  const [linkDistanceVal, setLinkDistanceVal] = useState<number>(120);
  const [collisionRadiusVal, setCollisionRadiusVal] = useState<number>(24);

  // Zoom behavior storage
  const [zoomBehavior, setZoomBehavior] = useState<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  // NLP Smart Query & Subgraph Lens state
  const [nlpQuery, setNlpQuery] = useState<string>(initialNlpQuery || '');
  const [activeLens, setActiveLens] = useState<{
    query: string;
    title: string;
    explanation: string;
    count: number;
    total: number;
  } | null>(null);
  const [focusedSubgraph, setFocusedSubgraph] = useState<GraphData | null>(null);
  const [isNlpLoading, setIsNlpLoading] = useState<boolean>(false);

  // Determine active dataset (Focused Subgraph vs Full Graph)
  const activeGraph = useMemo(() => {
    if (focusedSubgraph && focusedSubgraph.nodes && focusedSubgraph.nodes.length > 0) {
      return focusedSubgraph;
    }
    return graphData;
  }, [focusedSubgraph, graphData]);

  // Execute NLP Smart Query
  const executeSmartNlpQuery = async (queryText: string) => {
    const q = queryText.trim();
    if (!q) {
      handleResetLens();
      return;
    }

    setIsNlpLoading(true);
    try {
      const res = await apiService.queryGraphNLP(q, getAuthHeaders());
      if (res && res.subgraph && res.subgraph.nodes && res.subgraph.nodes.length > 0) {
        setFocusedSubgraph(res.subgraph);
        setActiveLens({
          query: q,
          title: res.title || `Lens: ${q}`,
          explanation: res.explanation || `Filtered ${res.matched_nodes_count} matching nodes`,
          count: res.matched_nodes_count,
          total: res.total_nodes || graphData?.nodes.length || 0
        });
      } else {
        runClientSideNlpFilter(q);
      }
    } catch (err) {
      console.warn('NLP graph query fallback to client-side:', err);
      runClientSideNlpFilter(q);
    } finally {
      setIsNlpLoading(false);
    }
  };

  // Client-side fallback filter with stop-word elimination
  const runClientSideNlpFilter = (q: string) => {
    if (!graphData?.nodes) return;
    const STOP_WORDS = new Set([
      'show', 'me', 'find', 'display', 'get', 'what', 'where', 'which', 'how', 'who',
      'the', 'my', 'all', 'with', 'and', 'or', 'for', 'in', 'at', 'on', 'of', 'to',
      'is', 'are', 'a', 'an', 'it', 'part', 'that', 'relates', 'related', 'relating',
      'answer', 'query', 'user', 'wants', 'see', 'only', 'skills', 'skill', 'projects',
      'project', 'repos', 'repo', 'experience', 'connection', 'connections', 'alumni',
      'network', 'nodes', 'graph', 'about', 'just', 'like', 'give', 'tell'
    ]);

    const words = q.toLowerCase().split(/[\s,.-]+/).filter(w => !STOP_WORDS.has(w) && w.length >= 2);
    
    let matchedNodes: GraphNode[] = [];
    if (words.length > 0) {
      matchedNodes = graphData.nodes.filter(n => {
        const label = (n.label || n.name || '').toLowerCase();
        const desc = ((n.properties?.description as string) || (n.desc as string) || '').toLowerCase();
        const id = n.id.toLowerCase();
        return words.some(w => label.includes(w) || desc.includes(w) || id.includes(w));
      });
    }

    if (matchedNodes.length === 0) {
      matchedNodes = graphData.nodes.slice(0, 6);
    }

    const matchedIds = new Set(matchedNodes.map(n => n.id));

    const matchedLinks = (graphData.links || []).filter(l => {
      const sId = typeof l.source === 'object' ? (l.source as GraphNode).id : l.source;
      const tId = typeof l.target === 'object' ? (l.target as GraphNode).id : l.target;
      return matchedIds.has(sId) && matchedIds.has(tId);
    });

    const sub = {
      nodes: graphData.nodes.filter(n => matchedIds.has(n.id)),
      links: matchedLinks
    };

    setFocusedSubgraph(sub);
    setActiveLens({
      query: q,
      title: `Filtered Lens: ${q}`,
      explanation: `Showing ${sub.nodes.length} nodes directly answering your query.`,
      count: sub.nodes.length,
      total: graphData.nodes.length
    });
  };

  const handleResetLens = () => {
    setFocusedSubgraph(null);
    setActiveLens(null);
    setNlpQuery('');
    if (onClearInitialQuery) onClearInitialQuery();
  };

  // Sync with initialNlpQuery prop if passed from BrainChat
  useEffect(() => {
    if (initialNlpQuery && initialNlpQuery.trim()) {
      setNlpQuery(initialNlpQuery);
      executeSmartNlpQuery(initialNlpQuery);
    }
  }, [initialNlpQuery]);

  // Category counts based on active dataset
  const categoryStats = useMemo(() => {
    if (!activeGraph?.nodes) return {};
    const counts: Record<string, number> = { all: activeGraph.nodes.length };
    activeGraph.nodes.forEach(n => {
      const cat = normalizeCategory(n.type, n.id, n.category);
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [activeGraph]);

  const categories = ['all', 'Candidate', 'Project', 'Skill', 'Company', 'Contact', 'Education', 'Achievement', 'Aspiration'];

  // Global Graph Analytics summary
  const graphSummary = useMemo(() => {
    const totalNodes = activeGraph?.nodes?.length || 0;
    const totalLinks = activeGraph?.links?.length || 0;
    const verifiedSkills = (activeGraph?.nodes || []).filter(n => normalizeCategory(n.type, n.id, n.category) === 'Skill' && (n.verified || n.properties?.verified)).length;
    const alumniCount = (activeGraph?.nodes || []).filter(n => normalizeCategory(n.type, n.id, n.category) === 'Contact').length;
    const projectsCount = (activeGraph?.nodes || []).filter(n => normalizeCategory(n.type, n.id, n.category) === 'Project').length;
    return {
      totalNodes,
      totalLinks,
      verifiedSkills,
      alumniCount,
      projectsCount,
      density: totalNodes > 1 ? Math.min(Math.round((totalLinks / (totalNodes * (totalNodes - 1) / 2)) * 100), 100) : 0
    };
  }, [activeGraph]);

  // Autocomplete matching nodes for search input
  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || !activeGraph?.nodes) return [];
    const q = searchQuery.toLowerCase().trim();
    return activeGraph.nodes
      .filter(n => {
        const name = (n.label || n.name || n.id || '').toLowerCase();
        const desc = ((n.desc as string) || (n.headline as string) || '').toLowerCase();
        return name.includes(q) || desc.includes(q);
      })
      .slice(0, 8);
  }, [searchQuery, activeGraph]);

  // Focus and pan camera to a specific node
  const focusOnNode = useCallback((node: GraphNode) => {
    setSelectedNode(node);
    if (svgRef.current && zoomBehavior && containerRef.current && node.x !== undefined && node.y !== undefined) {
      const width = containerRef.current.clientWidth || 900;
      const height = containerRef.current.clientHeight || 650;
      const scale = 1.4;
      const transform = d3.zoomIdentity
        .translate(width / 2 - node.x * scale, height / 2 - node.y * scale)
        .scale(scale);

      d3.select(svgRef.current)
        .transition()
        .duration(600)
        .ease(d3.easeCubicOut)
        .call(zoomBehavior.transform, transform);
    }
  }, [zoomBehavior]);

  // Isolate 1-hop subgraph around a selected node
  const handleFocusNeighborhood = (node: GraphNode) => {
    if (!graphData?.nodes) return;
    const targetId = node.id;
    const neighborIds = new Set<string>([targetId]);

    (graphData.links || []).forEach(l => {
      const sId = typeof l.source === 'object' ? (l.source as GraphNode).id : l.source;
      const tId = typeof l.target === 'object' ? (l.target as GraphNode).id : l.target;
      if (sId === targetId) neighborIds.add(tId);
      if (tId === targetId) neighborIds.add(sId);
    });

    const subNodes = graphData.nodes.filter(n => neighborIds.has(n.id));
    const subLinks = (graphData.links || []).filter(l => {
      const sId = typeof l.source === 'object' ? (l.source as GraphNode).id : l.source;
      const tId = typeof l.target === 'object' ? (l.target as GraphNode).id : l.target;
      return neighborIds.has(sId) && neighborIds.has(tId);
    });

    setFocusedSubgraph({ nodes: subNodes, links: subLinks });
    setActiveLens({
      query: node.label || node.id,
      title: `Neighborhood: ${node.label || node.id}`,
      explanation: `Showing ${node.label || node.id} and its ${subNodes.length - 1} direct connected relations.`,
      count: subNodes.length,
      total: graphData.nodes.length
    });
  };

  // Main D3 Force Graph Simulation & Rendering
  useEffect(() => {
    if (!activeGraph || !activeGraph.nodes || activeGraph.nodes.length === 0 || !svgRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth || 900;
    const height = container.clientHeight || 650;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // D3 Visual Theme Config
    const gridDotColor = isDark ? '#334155' : '#CBD5E1';
    const canvasBg = isDark ? '#0B0F17' : '#F8FAFC';
    const defaultLinkColor = isDark ? '#334155' : '#CBD5E1';
    const highlightLinkColor = isDark ? '#60A5FA' : '#2563EB';
    const outerRingFill = isDark ? '#1E293B' : '#FFFFFF';
    const outerRingBorder = isDark ? '#334155' : '#E2E8F0';
    const pillBg = isDark ? '#1E293B' : '#FFFFFF';
    const pillBorder = isDark ? '#334155' : '#E2E8F0';
    const pillText = isDark ? '#F8FAFC' : '#0F172A';
    const relPillBg = isDark ? '#0F172A' : '#FFFFFF';
    const relPillBorder = isDark ? '#334155' : '#E2E8F0';
    const relTextColor = isDark ? '#94A3B8' : '#64748B';

    // Definitions & Patterns
    const defs = svg.append('defs');

    // Dot grid pattern
    const pattern = defs.append('pattern')
      .attr('id', 'grid-dots')
      .attr('width', 24)
      .attr('height', 24)
      .attr('patternUnits', 'userSpaceOnUse');
    pattern.append('circle')
      .attr('cx', 12)
      .attr('cy', 12)
      .attr('r', 0.9)
      .attr('fill', gridDotColor);

    // Glow Filter for hovered nodes
    const filter = defs.append('filter')
      .attr('id', 'node-glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');
    filter.append('feGaussianBlur')
      .attr('stdDeviation', '4')
      .attr('result', 'coloredBlur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Arrow marker for directed relations
    defs.append('marker')
      .attr('id', 'arrow-head')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 22)
      .attr('refY', 0)
      .attr('markerWidth', 5)
      .attr('markerHeight', 5)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-4L8,0L0,4')
      .attr('fill', isDark ? '#64748B' : '#94A3B8');

    // Highlighted Arrow Marker
    defs.append('marker')
      .attr('id', 'arrow-head-active')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 22)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-4L8,0L0,4')
      .attr('fill', highlightLinkColor);

    // Background Canvas
    svg.append('rect')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('fill', canvasBg);

    svg.append('rect')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('fill', 'url(#grid-dots)');

    const g = svg.append('g').attr('class', 'graph-group');

    // Zoom setup
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.15, 4.5])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);
    setZoomBehavior(() => zoom);

    // Deep copy data for D3 mutation
    const nodes: GraphNode[] = (activeGraph.nodes || []).map(d => ({ ...d }));
    const links: GraphLink[] = (activeGraph.links || []).map(d => ({ ...d }));

    // Neighbor lookup map for hover focus
    const connectedMap: Record<string, Set<string>> = {};
    links.forEach(l => {
      const s = typeof l.source === 'object' ? (l.source as GraphNode).id : l.source;
      const t = typeof l.target === 'object' ? (l.target as GraphNode).id : l.target;
      if (!connectedMap[s]) connectedMap[s] = new Set();
      if (!connectedMap[t]) connectedMap[t] = new Set();
      connectedMap[s].add(t);
      connectedMap[t].add(s);
    });

    // 1-hop & 2-hop neighbor calculation for selected node if hopDistance is enabled
    const selectedHopIds = new Set<string>();
    if (selectedNode && hopDistance > 0) {
      selectedHopIds.add(selectedNode.id);
      const direct = connectedMap[selectedNode.id] || new Set();
      direct.forEach(id => selectedHopIds.add(id));

      if (hopDistance >= 2) {
        direct.forEach(id => {
          const second = connectedMap[id] || new Set();
          second.forEach(sId => selectedHopIds.add(sId));
        });
      }
    }

    // Filter logic
    const filteredNodeIds = new Set(
      nodes
        .filter(n => {
          const cat = normalizeCategory(n.type, n.id, n.category);
          const matchesCat = selectedCategory === 'all' || cat === selectedCategory;
          const query = searchQuery.trim().toLowerCase();
          const name = (n.label || n.name || n.id || '').toLowerCase();
          const matchesSearch = !query || name.includes(query);
          const matchesHop = hopDistance === 0 || !selectedNode || selectedHopIds.has(n.id);
          return matchesCat && matchesSearch && matchesHop;
        })
        .map(n => n.id)
    );

    // Layout Specific Positioning
    if (layoutMode === 'radial') {
      // Concentric rings radiating from candidate root
      const candidateNode = nodes.find(n => normalizeCategory(n.type, n.id, n.category) === 'Candidate') || nodes[0];
      const centerX = width / 2;
      const centerY = height / 2;

      if (candidateNode) {
        candidateNode.fx = centerX;
        candidateNode.fy = centerY;
      }

      // Group nodes into orbital rings
      const rings: Record<string, GraphNode[]> = {
        ring1: [], // Projects & Aspirations
        ring2: [], // Skills & Work
        ring3: []  // Network & Education
      };

      nodes.forEach(n => {
        if (n.id === candidateNode?.id) return;
        const cat = normalizeCategory(n.type, n.id, n.category);
        if (cat === 'Project' || cat === 'Aspiration') rings.ring1.push(n);
        else if (cat === 'Skill' || cat === 'Company') rings.ring2.push(n);
        else rings.ring3.push(n);
      });

      const assignRingCoordinates = (ringNodes: GraphNode[], radius: number) => {
        const total = ringNodes.length;
        ringNodes.forEach((n, idx) => {
          const angle = (idx / total) * 2 * Math.PI;
          n.x = centerX + radius * Math.cos(angle);
          n.y = centerY + radius * Math.sin(angle);
        });
      };

      assignRingCoordinates(rings.ring1, 140);
      assignRingCoordinates(rings.ring2, 250);
      assignRingCoordinates(rings.ring3, 360);
    } else if (layoutMode === 'clustered') {
      // Group nodes into distinct category centroids
      const categoryClusters: Record<string, { x: number; y: number }> = {
        Candidate: { x: width / 2, y: height / 2 },
        Project: { x: width * 0.25, y: height * 0.3 },
        Skill: { x: width * 0.5, y: height * 0.2 },
        Company: { x: width * 0.75, y: height * 0.35 },
        Contact: { x: width * 0.75, y: height * 0.7 },
        Education: { x: width * 0.25, y: height * 0.7 },
        Achievement: { x: width * 0.5, y: height * 0.8 },
        Aspiration: { x: width * 0.85, y: height * 0.5 },
        Default: { x: width * 0.5, y: height * 0.5 }
      };

      nodes.forEach(n => {
        const cat = normalizeCategory(n.type, n.id, n.category);
        const centroid = categoryClusters[cat] || categoryClusters.Default;
        n.x = centroid.x + (Math.random() - 0.5) * 80;
        n.y = centroid.y + (Math.random() - 0.5) * 80;
      });
    }

    // Force Simulation Setup
    const simulation = d3.forceSimulation<GraphNode>(nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(links).id(d => d.id).distance(linkDistanceVal))
      .force('charge', d3.forceManyBody().strength(chargeStrength))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide().radius(d => getThemeForNode(d).radius + collisionRadiusVal));

    if (isPhysicsPaused) {
      simulation.stop();
    }

    simulationRef.current = simulation;

    // Render Links
    const linkGroup = g.append('g').attr('class', 'links');
    const link = linkGroup
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', defaultLinkColor)
      .attr('stroke-width', 1.3)
      .attr('marker-end', 'url(#arrow-head)')
      .attr('stroke-opacity', d => {
        const sourceId = typeof d.source === 'object' ? (d.source as GraphNode).id : d.source;
        const targetId = typeof d.target === 'object' ? (d.target as GraphNode).id : d.target;
        return (filteredNodeIds.has(sourceId) && filteredNodeIds.has(targetId)) ? 0.65 : 0.08;
      });

    // Render Relationship Labels (like Neo4j Bloom)
    const linkLabelGroup = g.append('g').attr('class', 'link-labels');
    const linkLabel = linkLabelGroup
      .selectAll('g')
      .data(links)
      .enter()
      .append('g')
      .attr('class', 'link-label-badge pointer-events-none transition-opacity duration-150')
      .attr('opacity', d => {
        const s = typeof d.source === 'object' ? (d.source as GraphNode).id : d.source;
        const t = typeof d.target === 'object' ? (d.target as GraphNode).id : d.target;
        return (filteredNodeIds.has(s) && filteredNodeIds.has(t) && showRelations) ? 0.9 : 0;
      });

    linkLabel.append('rect')
      .attr('rx', 4)
      .attr('ry', 4)
      .attr('fill', relPillBg)
      .attr('stroke', relPillBorder)
      .attr('stroke-width', 0.8)
      .attr('opacity', 0.96);

    linkLabel.append('text')
      .text(d => (d.label || d.type || d.relation || 'RELATES').toUpperCase())
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('fill', relTextColor)
      .attr('font-size', '8px')
      .attr('font-weight', '700')
      .attr('font-family', 'Inter, system-ui, sans-serif')
      .each(function() {
        const bbox = this.getBBox();
        const parent = d3.select(this.parentNode as SVGGElement);
        parent.select('rect')
          .attr('x', bbox.x - 4)
          .attr('y', bbox.y - 2)
          .attr('width', bbox.width + 8)
          .attr('height', bbox.height + 4);
      });

    // Render Nodes
    const nodeGroup = g.append('g').attr('class', 'nodes');
    const node = nodeGroup
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node-group cursor-pointer transition-opacity duration-150')
      .attr('opacity', d => (filteredNodeIds.has(d.id) ? 1 : 0.12))
      .call(
        d3.drag<SVGGElement, GraphNode>()
          .on('start', (event, d) => {
            if (!event.active && !isPhysicsPaused) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active && !isPhysicsPaused) simulation.alphaTarget(0);
            if (layoutMode === 'force') {
              d.fx = null;
              d.fy = null;
            }
          })
      )
      .on('click', (event, d) => {
        event.stopPropagation();
        focusOnNode(d);
      })
      .on('mouseenter', (_, d) => {
        setHoveredNodeId(d.id);
        const neighbors = connectedMap[d.id] || new Set();
        
        node.attr('opacity', n => {
          if (!filteredNodeIds.has(n.id)) return 0.05;
          if (n.id === d.id || neighbors.has(n.id)) return 1;
          return 0.22;
        });

        link.attr('stroke-opacity', l => {
          const s = typeof l.source === 'object' ? (l.source as GraphNode).id : l.source;
          const t = typeof l.target === 'object' ? (l.target as GraphNode).id : l.target;
          if (s === d.id || t === d.id) return 1;
          return 0.05;
        }).attr('stroke-width', l => {
          const s = typeof l.source === 'object' ? (l.source as GraphNode).id : l.source;
          const t = typeof l.target === 'object' ? (l.target as GraphNode).id : l.target;
          return (s === d.id || t === d.id) ? 2.4 : 1;
        }).attr('stroke', l => {
          const s = typeof l.source === 'object' ? (l.source as GraphNode).id : l.source;
          const t = typeof l.target === 'object' ? (l.target as GraphNode).id : l.target;
          return (s === d.id || t === d.id) ? highlightLinkColor : defaultLinkColor;
        }).attr('marker-end', l => {
          const s = typeof l.source === 'object' ? (l.source as GraphNode).id : l.source;
          const t = typeof l.target === 'object' ? (l.target as GraphNode).id : l.target;
          return (s === d.id || t === d.id) ? 'url(#arrow-head-active)' : 'url(#arrow-head)';
        });

        // Highlight relations on hover
        linkLabel.attr('opacity', l => {
          const s = typeof l.source === 'object' ? (l.source as GraphNode).id : l.source;
          const t = typeof l.target === 'object' ? (l.target as GraphNode).id : l.target;
          if (s === d.id || t === d.id) return 1;
          return showRelations ? 0.2 : 0;
        });
      })
      .on('mouseleave', () => {
        setHoveredNodeId(null);
        node.attr('opacity', d => (filteredNodeIds.has(d.id) ? 1 : 0.12));
        link
          .attr('stroke', defaultLinkColor)
          .attr('stroke-width', 1.3)
          .attr('marker-end', 'url(#arrow-head)')
          .attr('stroke-opacity', d => {
            const sourceId = typeof d.source === 'object' ? (d.source as GraphNode).id : d.source;
            const targetId = typeof d.target === 'object' ? (d.target as GraphNode).id : d.target;
            return (filteredNodeIds.has(sourceId) && filteredNodeIds.has(targetId)) ? 0.65 : 0.08;
          });

        linkLabel.attr('opacity', d => {
          const s = typeof d.source === 'object' ? (d.source as GraphNode).id : d.source;
          const t = typeof d.target === 'object' ? (d.target as GraphNode).id : d.target;
          return (filteredNodeIds.has(s) && filteredNodeIds.has(t) && showRelations) ? 0.9 : 0;
        });
      });

    // Outer subtle border / ring with glow
    node.append('circle')
      .attr('r', d => getThemeForNode(d).radius + 4)
      .attr('fill', outerRingFill)
      .attr('stroke', d => (selectedNode?.id === d.id ? getThemeForNode(d).bg : outerRingBorder))
      .attr('stroke-width', d => (selectedNode?.id === d.id ? 2.5 : 1))
      .attr('filter', d => (selectedNode?.id === d.id ? 'url(#node-glow)' : null));

    // Colored node core
    node.append('circle')
      .attr('r', d => getThemeForNode(d).radius)
      .attr('fill', d => getThemeForNode(d).bg)
      .attr('stroke', d => getThemeForNode(d).border)
      .attr('stroke-width', 1.5);

    // Node Initials or Monogram
    node.append('text')
      .text(d => {
        const cat = normalizeCategory(d.type, d.id, d.category);
        if (cat === 'Candidate') return 'YOU';
        const name = d.label || d.name || d.id;
        return name.substring(0, 2).toUpperCase();
      })
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('fill', '#FFFFFF')
      .attr('font-size', d => (normalizeCategory(d.type, d.id, d.category) === 'Candidate' ? '11px' : '9px'))
      .attr('font-weight', '700')
      .attr('font-family', 'Inter, system-ui, sans-serif')
      .attr('pointer-events', 'none');

    // AST Verified Check Badge (top-right of node)
    node.filter(d => !!(d.verified || d.properties?.verified))
      .append('circle')
      .attr('cx', d => getThemeForNode(d).radius * 0.7)
      .attr('cy', d => -getThemeForNode(d).radius * 0.7)
      .attr('r', 5)
      .attr('fill', '#10B981')
      .attr('stroke', '#FFFFFF')
      .attr('stroke-width', 1.2);

    // Crisp Label Background Pill
    node.append('rect')
      .attr('rx', 4)
      .attr('ry', 4)
      .attr('y', d => getThemeForNode(d).radius + 6)
      .attr('fill', pillBg)
      .attr('stroke', pillBorder)
      .attr('stroke-width', 1)
      .attr('opacity', 0.96)
      .attr('pointer-events', 'none');

    // Label Text
    node.append('text')
      .text(d => {
        const name = d.label || d.name || d.id;
        return name.length > 20 ? name.substring(0, 18) + '…' : name;
      })
      .attr('x', 0)
      .attr('y', d => getThemeForNode(d).radius + 17)
      .attr('text-anchor', 'middle')
      .attr('fill', pillText)
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .attr('font-family', 'Inter, system-ui, sans-serif')
      .attr('pointer-events', 'none')
      .each(function() {
        const bbox = this.getBBox();
        const parent = d3.select(this.parentNode as SVGGElement);
        parent.select('rect')
          .attr('x', bbox.x - 6)
          .attr('width', bbox.width + 12)
          .attr('height', bbox.height + 4);
      });

    // Simulation Tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as GraphNode).x || 0)
        .attr('y1', d => (d.source as GraphNode).y || 0)
        .attr('x2', d => (d.target as GraphNode).x || 0)
        .attr('y2', d => (d.target as GraphNode).y || 0);

      linkLabel.attr('transform', d => {
        const sx = (d.source as GraphNode).x || 0;
        const sy = (d.source as GraphNode).y || 0;
        const tx = (d.target as GraphNode).x || 0;
        const ty = (d.target as GraphNode).y || 0;
        return `translate(${(sx + tx) / 2}, ${(sy + ty) / 2})`;
      });

      node.attr('transform', d => `translate(${d.x || 0},${d.y || 0})`);
    });

    // Auto-fit & center when rendering a focused subgraph lens
    const isLensActive = !!(focusedSubgraph && focusedSubgraph.nodes && focusedSubgraph.nodes.length > 0);
    if (isLensActive && zoomBehavior && svgRef.current) {
      d3.select(svgRef.current).transition().duration(400).call(zoomBehavior.transform, d3.zoomIdentity);
    }

    return () => {
      simulation.stop();
    };
  }, [
    activeGraph, 
    selectedCategory, 
    searchQuery, 
    isDark, 
    showRelations, 
    layoutMode, 
    isPhysicsPaused, 
    chargeStrength, 
    linkDistanceVal, 
    collisionRadiusVal,
    selectedNode,
    hopDistance
  ]);

  // Zoom Controls
  const handleZoomIn = () => {
    if (svgRef.current && zoomBehavior) {
      d3.select(svgRef.current).transition().duration(250).call(zoomBehavior.scaleBy, 1.3);
    }
  };

  const handleZoomOut = () => {
    if (svgRef.current && zoomBehavior) {
      d3.select(svgRef.current).transition().duration(250).call(zoomBehavior.scaleBy, 0.75);
    }
  };

  const handleResetZoom = () => {
    if (svgRef.current && zoomBehavior) {
      d3.select(svgRef.current).transition().duration(350).call(zoomBehavior.transform, d3.zoomIdentity);
    }
  };

  const handleFitScreen = () => {
    if (!svgRef.current || !containerRef.current || !zoomBehavior || !activeGraph?.nodes || activeGraph.nodes.length === 0) return;
    const width = containerRef.current.clientWidth || 900;
    const height = containerRef.current.clientHeight || 650;
    d3.select(svgRef.current).transition().duration(400).call(
      zoomBehavior.transform,
      d3.zoomIdentity.translate(width * 0.05, height * 0.05).scale(0.9)
    );
  };

  // Export Graph Engine (PNG / SVG / JSON)
  const exportGraph = (format: 'png' | 'svg' | 'json') => {
    setShowExportMenu(false);
    if (!svgRef.current) return;

    if (format === 'json') {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(activeGraph, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `pathprint_knowledge_graph_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      return;
    }

    const svgElement = svgRef.current;
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgElement);

    if (format === 'svg') {
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.href = svgUrl;
      downloadAnchor.download = `pathprint_knowledge_graph_${Date.now()}.svg`;
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      URL.revokeObjectURL(svgUrl);
      return;
    }

    // High-Res PNG Rasterization
    const canvas = document.createElement('canvas');
    const width = containerRef.current?.clientWidth || 1200;
    const height = containerRef.current?.clientHeight || 800;
    const pixelRatio = 2; // High-DPI 2x
    canvas.width = width * pixelRatio;
    canvas.height = height * pixelRatio;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(pixelRatio, pixelRatio);
    const img = new Image();
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      ctx.fillStyle = isDark ? '#0B0F17' : '#F8FAFC';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);

      const pngUrl = canvas.toDataURL('image/png');
      const downloadAnchor = document.createElement('a');
      downloadAnchor.href = pngUrl;
      downloadAnchor.download = `pathprint_knowledge_graph_${Date.now()}.png`;
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    };
    img.src = url;
  };

  const activeTheme = selectedNode ? getThemeForNode(selectedNode) : CATEGORY_THEMES.Default;

  return (
    <div
      className={`relative w-full flex flex-col rounded-2xl overflow-hidden border shadow-sm transition-all duration-200 ${
        isFullscreen 
          ? 'fixed inset-0 z-50 rounded-none h-screen' 
          : 'h-[calc(100vh-125px)]'
      } ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}
    >
      {/* 1. Header & Live Graph Analytics Strip */}
      <div
        className={`px-5 py-3 border-b flex flex-col gap-2.5 transition-colors duration-200 ${
          isDark ? 'bg-slate-900/95 border-slate-800' : 'bg-slate-50/90 border-slate-200'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Title & GraphRAG Badge */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className={`text-base font-bold tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                  Knowledge Graph
                </h2>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  <ShieldCheck className="w-3 h-3 text-blue-500" /> Neo4j Multi-Hop AuraDB
                </span>
              </div>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                AST verified code topology, technical skills ontology, and warm alumni bridges
              </p>
            </div>
          </div>

          {/* Dynamic Live Graph Metric Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 scrollbar-none text-xs">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${
              isDark ? 'bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
            }`}>
              <Cpu className="w-3.5 h-3.5 text-blue-500" />
              <span className="font-semibold tabular-nums">{graphSummary.totalNodes}</span>
              <span className="text-[11px] text-slate-400">Nodes</span>
            </div>

            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${
              isDark ? 'bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
            }`}>
              <GitBranch className="w-3.5 h-3.5 text-purple-500" />
              <span className="font-semibold tabular-nums">{graphSummary.totalLinks}</span>
              <span className="text-[11px] text-slate-400">Edges</span>
            </div>

            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${
              isDark ? 'bg-emerald-950/50 border-emerald-800/80 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
            }`}>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span className="font-semibold tabular-nums">{graphSummary.verifiedSkills}</span>
              <span className="text-[11px]">AST Verified</span>
            </div>

            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${
              isDark ? 'bg-pink-950/50 border-pink-800/80 text-pink-300' : 'bg-pink-50 border-pink-200 text-pink-700'
            }`}>
              <Users className="w-3.5 h-3.5 text-pink-500" />
              <span className="font-semibold tabular-nums">{graphSummary.alumniCount}</span>
              <span className="text-[11px]">Network Bridges</span>
            </div>
          </div>
        </div>

        {/* NLP Smart Query Input & Preset Chips */}
        <div className="flex flex-col gap-2">
          <div className="relative flex-1">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
              <Sparkles className="w-4 h-4 text-purple-500 animate-pulse" />
            </div>
            <input
              type="text"
              value={nlpQuery}
              onChange={(e) => setNlpQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  executeSmartNlpQuery(nlpQuery);
                }
              }}
              placeholder="Ask Knowledge Graph in plain English (e.g. 'Show DRDO firewall stack & python', 'Alumni at Google', 'SIH hackathons')..."
              className={`w-full pl-10 pr-28 py-2 text-xs sm:text-sm rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 ${
                isDark
                  ? 'bg-slate-800/90 border-slate-700 text-slate-100 placeholder:text-slate-500'
                  : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 shadow-2xs'
              }`}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {nlpQuery && (
                <button
                  onClick={handleResetLens}
                  className={`p-1 rounded-md transition-colors ${
                    isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
                  }`}
                  title="Clear Query"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => executeSmartNlpQuery(nlpQuery)}
                disabled={isNlpLoading || !nlpQuery.trim()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs transition-all cursor-pointer"
              >
                {isNlpLoading ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>Focus Lens</span>
              </button>
            </div>
          </div>

          {/* Quick Preset Lens Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            <span className={`text-[11px] font-semibold uppercase tracking-wider shrink-0 mr-1 ${
              isDark ? 'text-slate-500' : 'text-slate-400'
            }`}>
              Quick Lenses:
            </span>
            {[
              { label: '🛡️ DRDO & Security Stack', query: 'DRDO Next Gen Firewall packet inspection Python C++' },
              { label: '🎓 Anand Eng. College Alumni', query: 'Anand Engineering College SGI alumni referral connections' },
              { label: '🏆 SIH Hackathons & Wins', query: 'Smart India Hackathon SIH 2024 awards achievements' },
              { label: '🐍 Python & AI Core', query: 'Python FastAPI Neo4j GraphRAG Gemini AI Engine' },
              { label: '⚛️ React & Frontend', query: 'React TypeScript TailwindCSS full stack repositories' },
              { label: '🤝 Warm Referral Bridges', query: 'All LinkedIn contacts and connected company employees' },
            ].map((preset) => (
              <button
                key={preset.label}
                onClick={() => {
                  setNlpQuery(preset.query);
                  executeSmartNlpQuery(preset.query);
                }}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all shrink-0 cursor-pointer ${
                  activeLens?.query === preset.query
                    ? (isDark ? 'bg-purple-950/80 text-purple-200 border-purple-700 shadow-xs' : 'bg-purple-50 text-purple-700 border-purple-300 shadow-xs')
                    : (isDark ? 'bg-slate-800/60 text-slate-300 border-slate-700/80 hover:bg-slate-700' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900')
                }`}
              >
                <span>{preset.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Controls, Category Filters & Layout Toolbar */}
      <div
        className={`flex flex-wrap items-center justify-between gap-3 px-5 py-2.5 z-10 border-b transition-colors duration-200 ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <Layers className={`w-4 h-4 shrink-0 mr-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
          {categories.map(cat => {
            const catTheme = cat === 'all' ? null : CATEGORY_THEMES[cat];
            const isSelected = selectedCategory === cat;
            const count = categoryStats[cat] || 0;

            let pillStyle = '';
            if (isSelected) {
              pillStyle = isDark 
                ? 'bg-blue-950/80 text-blue-300 border-blue-800 font-semibold shadow-xs'
                : 'bg-blue-50 text-blue-700 border-blue-200 font-semibold shadow-xs';
            } else {
              pillStyle = isDark
                ? 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900';
            }

            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all shrink-0 cursor-pointer ${pillStyle}`}
              >
                {catTheme && (
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: catTheme.bg }}
                  />
                )}
                <span>{cat === 'all' ? 'All Entities' : catTheme?.label || cat}</span>
                <span className={`text-[10px] tabular-nums px-1.5 py-0.2 rounded-full ${
                  isSelected 
                    ? (isDark ? 'bg-blue-900 text-blue-200' : 'bg-blue-200/60 text-blue-800')
                    : (isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500')
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Toolbar Controls: Search, Layouts, Relations, Physics, Export, Fullscreen, Zoom */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Instant Search with Autocomplete Dropdown */}
          <div className="relative">
            <Search className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setIsSearchDropdownOpen(true);
              }}
              onFocus={() => setIsSearchDropdownOpen(true)}
              placeholder="Search node..."
              className={`pl-8 pr-3 py-1.5 text-xs w-36 sm:w-44 rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                isDark 
                  ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500' 
                  : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'
              }`}
            />
            {isSearchDropdownOpen && searchResults.length > 0 && (
              <div className={`absolute top-full mt-1.5 left-0 w-64 rounded-xl border shadow-xl z-50 overflow-hidden py-1 ${
                isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
              }`}>
                {searchResults.map(resultNode => {
                  const nodeTheme = getThemeForNode(resultNode);
                  return (
                    <button
                      key={resultNode.id}
                      onClick={() => {
                        focusOnNode(resultNode);
                        setIsSearchDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left flex items-center gap-2.5 text-xs transition-colors cursor-pointer ${
                        isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-50'
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: nodeTheme.bg }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold truncate">{resultNode.label || resultNode.name || resultNode.id}</div>
                        <div className="text-[10px] text-slate-400 truncate">{nodeTheme.label}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Layout Mode Switcher */}
          <div className={`flex items-center border rounded-lg p-0.5 ${
            isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              onClick={() => setLayoutMode('force')}
              className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                layoutMode === 'force'
                  ? (isDark ? 'bg-slate-700 text-white shadow-xs' : 'bg-white text-slate-900 shadow-xs')
                  : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900')
              }`}
              title="Organic Force-Directed Layout"
            >
              Organic
            </button>
            <button
              onClick={() => setLayoutMode('radial')}
              className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                layoutMode === 'radial'
                  ? (isDark ? 'bg-slate-700 text-white shadow-xs' : 'bg-white text-slate-900 shadow-xs')
                  : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900')
              }`}
              title="Concentric Radial Hub Layout"
            >
              Radial
            </button>
            <button
              onClick={() => setLayoutMode('clustered')}
              className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                layoutMode === 'clustered'
                  ? (isDark ? 'bg-slate-700 text-white shadow-xs' : 'bg-white text-slate-900 shadow-xs')
                  : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900')
              }`}
              title="Clustered Community Layout"
            >
              Clusters
            </button>
          </div>

          {/* Relations Toggle Button */}
          <button
            onClick={() => setShowRelations(prev => !prev)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
              showRelations
                ? (isDark ? 'bg-purple-950/70 text-purple-300 border-purple-800' : 'bg-purple-50 text-purple-700 border-purple-200')
                : (isDark ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-white text-slate-500 border-slate-200')
            }`}
            title="Toggle relationship labels on edges"
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Relations</span>
            <span className={`text-[10px] font-bold px-1 rounded ${
              showRelations ? (isDark ? 'bg-purple-900 text-purple-200' : 'bg-purple-200/60 text-purple-800') : 'bg-slate-200/60 dark:bg-slate-700 text-slate-500'
            }`}>
              {showRelations ? 'ON' : 'OFF'}
            </span>
          </button>

          {/* Physics Tuning Settings Popover */}
          <div className="relative">
            <button
              onClick={() => setShowPhysicsSettings(prev => !prev)}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                showPhysicsSettings
                  ? (isDark ? 'bg-blue-950 border-blue-800 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-700')
                  : (isDark ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-100' : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900')
              }`}
              title="Physics Simulation Settings"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>

            {showPhysicsSettings && (
              <div className={`absolute top-full mt-2 right-0 w-72 p-4 rounded-xl border shadow-xl z-50 space-y-3.5 ${
                isDark ? 'bg-slate-900/95 border-slate-800 text-slate-200' : 'bg-white/95 border-slate-200 text-slate-800'
              }`}>
                <div className="flex items-center justify-between pb-2 border-b dark:border-slate-800">
                  <span className="text-xs font-bold uppercase tracking-wider">Physics Controls</span>
                  <button
                    onClick={() => setIsPhysicsPaused(prev => !prev)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 cursor-pointer"
                  >
                    {isPhysicsPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                    {isPhysicsPaused ? 'Resume' : 'Freeze'}
                  </button>
                </div>

                {/* Repulsion Force */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">Node Repulsion</span>
                    <span className="font-mono tabular-nums">{Math.abs(chargeStrength)}</span>
                  </div>
                  <input
                    type="range"
                    min="-600"
                    max="-100"
                    step="20"
                    value={chargeStrength}
                    onChange={e => setChargeStrength(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Link Distance */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">Link Length</span>
                    <span className="font-mono tabular-nums">{linkDistanceVal}px</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="220"
                    step="10"
                    value={linkDistanceVal}
                    onChange={e => setLinkDistanceVal(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Collision Radius */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">Collision Damping</span>
                    <span className="font-mono tabular-nums">{collisionRadiusVal}px</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="50"
                    step="5"
                    value={collisionRadiusVal}
                    onChange={e => setCollisionRadiusVal(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Export Menu */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(prev => !prev)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white' : 'bg-white border-slate-200 text-slate-700 hover:text-slate-900'
              }`}
              title="Export Graph"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export</span>
            </button>

            {showExportMenu && (
              <div className={`absolute top-full mt-1.5 right-0 w-44 rounded-xl border shadow-xl z-50 overflow-hidden py-1 ${
                isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
              }`}>
                <button
                  onClick={() => exportGraph('png')}
                  className={`w-full px-3 py-2 text-left text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                    isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-50'
                  }`}
                >
                  <span>High-Res PNG</span>
                  <span className="text-[10px] font-mono text-slate-400">2x Image</span>
                </button>
                <button
                  onClick={() => exportGraph('svg')}
                  className={`w-full px-3 py-2 text-left text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                    isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-50'
                  }`}
                >
                  <span>Vector SVG</span>
                  <span className="text-[10px] font-mono text-slate-400">Scalable</span>
                </button>
                <button
                  onClick={() => exportGraph('json')}
                  className={`w-full px-3 py-2 text-left text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                    isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-50'
                  }`}
                >
                  <span>Graph JSON</span>
                  <span className="text-[10px] font-mono text-slate-400">Dataset</span>
                </button>
              </div>
            )}
          </div>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(prev => !prev)}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              isDark ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-100' : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
            }`}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Graph Mode'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {/* Zoom Controls Bar */}
          <div className={`flex items-center border rounded-lg p-0.5 ${
            isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
          }`}>
            <button
              onClick={handleZoomIn}
              className={`p-1.5 rounded transition-colors cursor-pointer ${
                isDark ? 'hover:bg-slate-700 text-slate-400 hover:text-slate-100' : 'hover:bg-white text-slate-600 hover:text-slate-900'
              }`}
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleZoomOut}
              className={`p-1.5 rounded transition-colors cursor-pointer ${
                isDark ? 'hover:bg-slate-700 text-slate-400 hover:text-slate-100' : 'hover:bg-white text-slate-600 hover:text-slate-900'
              }`}
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleFitScreen}
              className={`p-1.5 rounded transition-colors cursor-pointer ${
                isDark ? 'hover:bg-slate-700 text-slate-400 hover:text-slate-100' : 'hover:bg-white text-slate-600 hover:text-slate-900'
              }`}
              title="Fit to Screen"
            >
              <Compass className="w-4 h-4" />
            </button>
            <button
              onClick={handleResetZoom}
              className={`p-1.5 rounded transition-colors cursor-pointer ${
                isDark ? 'hover:bg-slate-700 text-slate-400 hover:text-slate-100' : 'hover:bg-white text-slate-600 hover:text-slate-900'
              }`}
              title="Reset Zoom & Pan"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Interactive Canvas Area */}
      <div
        ref={containerRef}
        className={`relative flex-1 w-full h-full cursor-grab active:cursor-grabbing overflow-hidden ${
          isDark ? 'bg-slate-950' : 'bg-slate-50'
        }`}
        onClick={() => {
          setIsSearchDropdownOpen(false);
          setShowExportMenu(false);
          setShowPhysicsSettings(false);
        }}
      >
        {loading && (
          <div className={`absolute inset-0 flex items-center justify-center z-20 backdrop-blur-xs ${
            isDark ? 'bg-slate-900/80' : 'bg-white/80'
          }`}>
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                Simulating Career Footprint Graph…
              </p>
            </div>
          </div>
        )}

        {!loading && (!graphData?.nodes || graphData.nodes.length <= 1) && (
          <div className="absolute inset-0 flex items-center justify-center z-10 p-4 pointer-events-none">
            <div className={`max-w-md w-full p-6 rounded-2xl shadow-xl border backdrop-blur-md text-center pointer-events-auto transition-all animate-in fade-in zoom-in-95 duration-200 ${
              isDark 
                ? 'bg-slate-900/90 border-slate-800 text-slate-100 shadow-slate-950/50' 
                : 'bg-white/95 border-slate-200 text-slate-900 shadow-slate-200/50'
            }`}>
              <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
                <GitBranch className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold mb-1.5">No Graph Data Yet</h3>
              <p className={`text-xs leading-relaxed mb-5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Welcome to PathPrint! Your personal knowledge graph is ready to map your real code AST verified skills, projects, and referral connections.
              </p>
              <div className="flex items-center justify-center gap-3">
                {onOpenSyncGitHub && (
                  <button
                    onClick={onOpenSyncGitHub}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all cursor-pointer"
                  >
                    <Github className="w-4 h-4" />
                    Sync GitHub Repositories
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <svg ref={svgRef} className="w-full h-full" />

        {/* Active Focused Subgraph Lens Banner (Top Center of Canvas) */}
        {activeLens && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 max-w-xl w-[94%] sm:w-auto animate-in fade-in slide-in-from-top-2 duration-200">
            <div className={`px-4 py-2 rounded-xl border shadow-lg backdrop-blur-md flex items-center justify-between gap-4 ${
              isDark 
                ? 'bg-slate-900/95 border-purple-500/40 text-slate-100 shadow-purple-950/40' 
                : 'bg-white/95 border-purple-200 text-slate-900 shadow-purple-100/60'
            }`}>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white shrink-0 shadow-xs">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold truncate text-purple-700 dark:text-purple-300">
                      {activeLens.title}
                    </h4>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 shrink-0">
                      {activeLens.count} of {activeLens.total} Nodes Active
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {activeLens.explanation}
                  </p>
                </div>
              </div>

              <button
                onClick={handleResetLens}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all shrink-0 cursor-pointer ${
                  isDark
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                }`}
                title="Reset to view full graph entities"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Full Graph</span>
              </button>
            </div>
          </div>
        )}

        {/* 4. Interactive Docked Legend & Category Filter — Bottom Left */}
        {showLegend && (
          <div
            className={`absolute bottom-4 left-4 p-3.5 rounded-2xl z-10 backdrop-blur-md border shadow-lg max-w-sm w-[90%] sm:w-auto transition-all ${
              isDark ? 'bg-slate-900/95 border-slate-800 text-slate-100' : 'bg-white/95 border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between gap-4 mb-2.5">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                <p className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Ontology Legend & Filters
                </p>
              </div>
              <button
                onClick={() => setShowLegend(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                title="Minimize Legend"
              >
                <X className="w-3 h-3" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
              {Object.entries(CATEGORY_THEMES)
                .filter(([key]) => key !== 'Default')
                .map(([key, val]) => {
                  const isFiltered = selectedCategory === key;
                  const count = categoryStats[key] || 0;
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedCategory(selectedCategory === key ? 'all' : key)}
                      className={`flex items-center justify-between gap-2 px-2 py-1 rounded-lg text-left transition-all cursor-pointer ${
                        isFiltered 
                          ? (isDark ? 'bg-slate-800 ring-1 ring-blue-500' : 'bg-blue-50 ring-1 ring-blue-400')
                          : (isDark ? 'hover:bg-slate-800/60' : 'hover:bg-slate-100/80')
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full ring-2 shrink-0"
                          style={{ 
                            backgroundColor: val.bg,
                            ringColor: isDark ? '#1E293B' : '#FFFFFF'
                          }}
                        />
                        <span className={`text-[11px] font-medium truncate ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          {val.label}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 tabular-nums">
                        {count}
                      </span>
                    </button>
                  );
                })}
            </div>
          </div>
        )}

        {!showLegend && (
          <button
            onClick={() => setShowLegend(true)}
            className={`absolute bottom-4 left-4 p-2.5 rounded-xl z-10 backdrop-blur-md border shadow-md flex items-center gap-1.5 text-xs font-semibold cursor-pointer ${
              isDark ? 'bg-slate-900/90 border-slate-800 text-slate-300' : 'bg-white/90 border-slate-200 text-slate-700'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            <span>Show Legend</span>
          </button>
        )}
      </div>

      {/* 5. Rich Node Inspector Drawer */}
      {selectedNode && (
        <div
          className={`absolute top-14 right-4 bottom-4 w-84 sm:w-96 rounded-2xl p-5 z-30 flex flex-col justify-between border shadow-2xl backdrop-blur-md animate-in slide-in-from-right-4 duration-200 ${
            isDark ? 'bg-slate-900/95 border-slate-800 text-slate-100' : 'bg-white/95 border-slate-200 text-slate-900'
          }`}
        >
          <div className="space-y-4 overflow-y-auto pr-1">
            {/* Header Badge & Close */}
            <div className={`flex items-center justify-between pb-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{
                  backgroundColor: isDark ? `${activeTheme.bg}25` : activeTheme.pillBg,
                  color: isDark ? '#93C5FD' : activeTheme.pillText,
                  border: `1px solid ${activeTheme.border}40`,
                }}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: activeTheme.bg }}
                />
                {activeTheme.label}
              </span>
              <button
                onClick={() => setSelectedNode(null)}
                className={`p-1 rounded-lg transition-colors cursor-pointer ${
                  isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-slate-200' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-700'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Node Title & Headline */}
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`text-base font-bold tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                  {selectedNode.label || selectedNode.name || selectedNode.id}
                </h3>
                {selectedNode.verified && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shrink-0">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" /> AST Verified
                  </span>
                )}
              </div>
              {selectedNode.headline && (
                <p className={`text-xs font-medium mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {selectedNode.headline}
                </p>
              )}
            </div>

            {/* Node Descriptions */}
            {selectedNode.desc && (
              <p className={`text-xs leading-relaxed p-3 rounded-xl border ${
                isDark ? 'bg-slate-800/60 border-slate-700/60 text-slate-300' : 'bg-slate-50 border-slate-100 text-slate-600'
              }`}>
                {selectedNode.desc}
              </p>
            )}

            {selectedNode.summary && (
              <p className={`text-xs leading-relaxed p-3 rounded-xl border ${
                isDark ? 'bg-slate-800/60 border-slate-700/60 text-slate-300' : 'bg-slate-50 border-slate-100 text-slate-600'
              }`}>
                {selectedNode.summary}
              </p>
            )}

            {/* Metadata Attributes */}
            <div className="space-y-2 text-xs">
              {selectedNode.company && (
                <div className={`flex items-center justify-between p-2.5 rounded-xl border ${
                  isDark ? 'bg-slate-800/60 border-slate-700/60' : 'bg-slate-50 border-slate-100'
                }`}>
                  <span className={`flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    <Building2 className="w-3.5 h-3.5" /> Company
                  </span>
                  <span className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    {selectedNode.company}
                  </span>
                </div>
              )}

              {selectedNode.role && (
                <div className={`flex items-center justify-between p-2.5 rounded-xl border ${
                  isDark ? 'bg-slate-800/60 border-slate-700/60' : 'bg-slate-50 border-slate-100'
                }`}>
                  <span className={`flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    <Briefcase className="w-3.5 h-3.5" /> Role / Title
                  </span>
                  <span className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    {selectedNode.role}
                  </span>
                </div>
              )}

              {selectedNode.degree && (
                <div className={`flex items-center justify-between p-2.5 rounded-xl border ${
                  isDark ? 'bg-slate-800/60 border-slate-700/60' : 'bg-slate-50 border-slate-100'
                }`}>
                  <span className={`flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    <GraduationCap className="w-3.5 h-3.5" /> Degree / Major
                  </span>
                  <span className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    {selectedNode.degree} {selectedNode.field ? `in ${selectedNode.field}` : ''}
                  </span>
                </div>
              )}

              {selectedNode.timeline && (
                <div className={`flex items-center justify-between p-2.5 rounded-xl border ${
                  isDark ? 'bg-slate-800/60 border-slate-700/60' : 'bg-slate-50 border-slate-100'
                }`}>
                  <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Timeline</span>
                  <span className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    {selectedNode.timeline}
                  </span>
                </div>
              )}

              {selectedNode.lang && (
                <div className={`flex items-center justify-between p-2.5 rounded-xl border ${
                  isDark ? 'bg-slate-800/60 border-slate-700/60' : 'bg-slate-50 border-slate-100'
                }`}>
                  <span className={`flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    <Code className="w-3.5 h-3.5" /> Primary Tech
                  </span>
                  <span className="font-semibold text-blue-500">{selectedNode.lang}</span>
                </div>
              )}
            </div>

            {/* Connected Neighbors Grid */}
            {selectedNode.neighbors && selectedNode.neighbors.length > 0 && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold uppercase tracking-wider text-slate-400">Connected Relations ({selectedNode.neighbors.length})</span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                  {selectedNode.neighbors.map((nb: any, idx: number) => {
                    const nbTheme = CATEGORY_THEMES[normalizeCategory(nb.type, nb.id, nb.category)] || CATEGORY_THEMES.Default;
                    return (
                      <button
                        key={`${nb.id}-${idx}`}
                        onClick={() => {
                          const targetNode = (activeGraph?.nodes || []).find(n => n.id === nb.id);
                          if (targetNode) focusOnNode(targetNode);
                        }}
                        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-medium border transition-all cursor-pointer ${
                          isDark ? 'bg-slate-800/90 border-slate-700 hover:bg-slate-700 text-slate-200' : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-800'
                        }`}
                        title={`Relation: ${nb.relation} -> Click to focus`}
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: nbTheme.bg }}
                        />
                        <span className="truncate max-w-[130px]">{nb.label}</span>
                        <span className="text-[9px] font-mono text-slate-400 uppercase">({nb.relation})</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Action Links & Focus Subgraph */}
          <div className={`pt-4 mt-2 border-t space-y-2 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
            <button
              onClick={() => handleFocusNeighborhood(selectedNode)}
              className="w-full flex items-center justify-center gap-2 py-2 px-3.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-sm transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Focus Neighborhood Lens</span>
            </button>

            {selectedNode.url && (
              <a
                href={selectedNode.url}
                target="_blank"
                rel="noreferrer"
                className={`w-full flex items-center justify-between py-2 px-3.5 rounded-xl text-xs font-semibold border transition-colors ${
                  isDark 
                    ? 'bg-blue-950/80 text-blue-300 border-blue-800 hover:bg-blue-900' 
                    : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                }`}
              >
                <span className="flex items-center gap-2">
                  <ExternalLink className="w-3.5 h-3.5" /> View Profile / External
                </span>
                <span className="text-[10px] uppercase font-mono">&rarr;</span>
              </a>
            )}

            {selectedNode.repo_url && (
              <a
                href={selectedNode.repo_url}
                target="_blank"
                rel="noreferrer"
                className={`w-full flex items-center justify-between py-2 px-3.5 rounded-xl text-xs font-semibold border transition-colors ${
                  isDark 
                    ? 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700' 
                    : 'bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Github className="w-3.5 h-3.5" /> GitHub Repository
                </span>
                <span className="text-[10px] uppercase font-mono">&rarr;</span>
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

