import { GraphData, Contact, MatchAnalysisResponse, PitchResponse, TailoredResumeResponse } from '../types';

const API_BASE = (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
  ? ''
  : (import.meta.env.VITE_API_BASE_URL || 'https://pathprint.onrender.com');

export interface ProfileAnalysis {
  repos_count: number;
  connections_count: number;
  alumni_count: number;
  top_skills: string[];
  graph_nodes_count: number;
}

export const apiService = {
  async getGraph(headers: Record<string, string>): Promise<GraphData> {
    try {
      const res = await fetch(`${API_BASE}/api/v1/profile/graph`, {
        headers,
        signal: AbortSignal.timeout(25000)
      });
      if (!res.ok) throw new Error(`Failed to load graph (${res.status})`);
      return await res.json();
    } catch (err) {
      console.warn("Graph fetch failed or timed out, returning fallback graph:", err);
      return { nodes: [], links: [] };
    }
  },

  async getAnalysis(headers: Record<string, string>): Promise<ProfileAnalysis> {
    try {
      const res = await fetch(`${API_BASE}/api/v1/profile/analysis`, {
        headers,
        signal: AbortSignal.timeout(25000)
      });
      if (!res.ok) throw new Error(`Failed to load profile analysis (${res.status})`);
      const data = await res.json();
      return {
        repos_count: data.repos_count ?? data.metrics?.total_projects ?? 0,
        connections_count: data.connections_count ?? data.metrics?.network_reach_connections ?? 0,
        alumni_count: data.alumni_count ?? 0,
        top_skills: data.top_skills ?? [],
        graph_nodes_count: data.graph_nodes_count ?? 0,
        ...data
      };
    } catch (err) {
      console.warn("Analysis fetch failed or timed out, returning fallback:", err);
      return {
        repos_count: 0,
        connections_count: 0,
        alumni_count: 0,
        top_skills: [],
        graph_nodes_count: 0,
      };
    }
  },

  async getConnections(query: string = '', headers: Record<string, string>): Promise<Contact[]> {
    const url = `${API_BASE}/api/v1/profile/connections?search=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`Failed to load connections (${res.status})`);
    const data = await res.json();
    return data.contacts || data.connections || [];
  },

  async analyzeMatch(
    payload: { target_company: string; target_role: string; job_description: string },
    headers: Record<string, string>
  ): Promise<MatchAnalysisResponse> {
    const res = await fetch(`${API_BASE}/api/v1/matches/analyze`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Match analysis failed (${res.status})`);
    }
    return await res.json();
  },

  async generatePitch(
    payload: {
      contact_name: string;
      contact_company: string;
      contact_role: string;
      target_role: string;
      job_description?: string;
      pitch_type: 'linkedin' | 'inmail' | 'email';
    },
    headers: Record<string, string>
  ): Promise<PitchResponse> {
    const res = await fetch(`${API_BASE}/api/v1/matches/generate-pitch`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Pitch generation failed (${res.status})`);
    }
    return await res.json();
  },

  async tailorResume(
    payload: { 
      target_role: string; 
      target_company: string; 
      job_description: string;
      confirmed_skills?: Array<{
        skill: string;
        has_experience: boolean;
        evidence_url?: string;
        notes?: string;
      }>;
    },
    headers: Record<string, string>
  ): Promise<TailoredResumeResponse> {
    const res = await fetch(`${API_BASE}/api/v1/resume/tailor`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Resume tailoring failed (${res.status})`);
    }
    return await res.json();
  },


  async getMasterResume(headers: Record<string, string>): Promise<{
    status: string;
    has_master_resume: boolean;
    blueprint: any | null;
  }> {
    const res = await fetch(`${API_BASE}/api/v1/resume/master`, { headers });
    if (!res.ok) throw new Error(`Failed to load master resume (${res.status})`);
    return await res.json();
  },

  async updateMasterResume(blueprint: any, headers: Record<string, string>): Promise<{
    status: string;
    message: string;
    blueprint: any;
  }> {
    const res = await fetch(`${API_BASE}/api/v1/resume/master`, {
      method: 'PUT',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(blueprint),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to update master resume (${res.status})`);
    }
    return await res.json();
  },

  async uploadResumePdf(file: File, headers: Record<string, string>): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    
    // Copy auth headers but do NOT set Content-Type header so browser sets multipart/form-data boundary automatically
    const reqHeaders: Record<string, string> = {};
    if (headers['Authorization'] || headers['authorization']) {
      reqHeaders['Authorization'] = headers['Authorization'] || headers['authorization'];
    }
    if (headers['x-user-id']) {
      reqHeaders['x-user-id'] = headers['x-user-id'];
    }

    const res = await fetch(`${API_BASE}/api/v1/ingest/resume`, {
      method: 'POST',
      headers: reqHeaders,
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Resume upload failed (${res.status})`);
    }
    return await res.json();
  },

  async resetProfile(headers: Record<string, string>): Promise<{ status: string; message: string }> {
    const res = await fetch(`${API_BASE}/api/v1/profile/reset`, {
      method: 'POST',
      headers,
    });
    if (!res.ok) throw new Error(`Failed to reset profile (${res.status})`);
    return await res.json();
  },

  async wipeDatabase(headers: Record<string, string>): Promise<{ status: string; message: string }> {
    return await this.resetProfile(headers);
  },

  async getGithubSyncStatus(username: string, headers: Record<string, string>, token?: string): Promise<{
    status: string;
    username: string;
    total_github_repos: number;
    synced_projects_count: number;
    unsynced_repos_count: number;
    synced_projects: Array<{ id: string; name: string; repo_url: string; primary_language: string; stars?: number }>;
  }> {
    const params = new URLSearchParams({ username });
    if (token) params.append('token', token);
    const res = await fetch(`${API_BASE}/api/v1/ingest/github/status?${params.toString()}`, { headers });
    if (!res.ok) throw new Error(`Failed to load GitHub sync status (${res.status})`);
    return await res.json();
  },

  async ingestGithub(
    username: string, 
    headers: Record<string, string>, 
    maxRepos: number = 0, 
    token?: string,
    includeForks: boolean = false,
    onlyUnsynced: boolean = false
  ): Promise<{
    status: string;
    username: string;
    repos_processed: number;
    repos_total_found: number;
    new_repos_synced: number;
    already_synced_count: number;
    skills_extracted: number;
    projects: any[];
    graph_nodes_merged: number;
  }> {
    const res = await fetch(`${API_BASE}/api/v1/ingest/github`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ 
        username, 
        max_repos: maxRepos,
        github_token: token || undefined,
        include_forks: includeForks,
        only_unsynced: onlyUnsynced
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `GitHub ingestion failed (${res.status})`);
    }
    return await res.json();
  },


  async ingestLinkedinCsv(file: File, headers: Record<string, string>): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    
    // Copy headers without Content-Type so browser sets multipart boundary
    const reqHeaders: Record<string, string> = {};
    if (headers['Authorization']) reqHeaders['Authorization'] = headers['Authorization'];
    if (headers['x-user-id']) reqHeaders['x-user-id'] = headers['x-user-id'];

    const res = await fetch(`${API_BASE}/api/v1/ingest/linkedin/connections`, {
      method: 'POST',
      headers: reqHeaders,
      body: formData,
    });
    if (!res.ok) throw new Error(`LinkedIn ingestion failed (${res.status})`);
    return await res.json();
  },

  async getBenchmarkPeers(headers: Record<string, string>): Promise<{ peers: any[]; total: number }> {
    const res = await fetch(`${API_BASE}/api/v1/benchmark/peers`, { headers });
    if (!res.ok) throw new Error(`Failed to load benchmark peers (${res.status})`);
    return await res.json();
  },

  async addBenchmarkPeer(
    payload: { github_username?: string; name?: string; role?: string; company?: string; custom_skills?: string[] },
    headers: Record<string, string>
  ): Promise<any> {
    const res = await fetch(`${API_BASE}/api/v1/benchmark/peers`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to add benchmark peer (${res.status})`);
    }
    return await res.json();
  },

  async getBenchmarkComparison(peerId?: string, headers: Record<string, string> = {}): Promise<any> {
    const url = peerId 
      ? `${API_BASE}/api/v1/benchmark/compare?peer_id=${encodeURIComponent(peerId)}`
      : `${API_BASE}/api/v1/benchmark/compare`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to generate comparison (${res.status})`);
    }
    return await res.json();
  },

  async deleteBenchmarkPeer(peerId: string, headers: Record<string, string>): Promise<any> {
    const res = await fetch(`${API_BASE}/api/v1/benchmark/peers/${encodeURIComponent(peerId)}`, {
      method: 'DELETE',
      headers,
    });
    if (!res.ok) throw new Error(`Failed to delete peer (${res.status})`);
    return await res.json();
  },

  async getUserPreferences(headers: Record<string, string>): Promise<{
    status: string;
    preferences: import('../types').UserPreferences;
  }> {
    const res = await fetch(`${API_BASE}/api/v1/profile/preferences`, { headers });
    if (!res.ok) throw new Error(`Failed to load user preferences (${res.status})`);
    return await res.json();
  },

  async updateUserPreferences(
    preferences: import('../types').UserPreferences,
    headers: Record<string, string>
  ): Promise<{
    status: string;
    message: string;
    preferences: import('../types').UserPreferences;
  }> {
    const res = await fetch(`${API_BASE}/api/v1/profile/preferences`, {
      method: 'PUT',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preferences),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to update preferences (${res.status})`);
    }
    return await res.json();
  },

  async getProfileDetails(headers: Record<string, string>): Promise<{
    status: string;
    profile: import('../types').UserProfileDetails;
  }> {
    const res = await fetch(`${API_BASE}/api/v1/profile/details`, { headers });
    if (!res.ok) throw new Error(`Failed to load profile details (${res.status})`);
    return await res.json();
  },

  async updateProfileDetails(
    profile: Partial<import('../types').UserProfileDetails>,
    headers: Record<string, string>
  ): Promise<{
    status: string;
    message: string;
    profile: import('../types').UserProfileDetails;
  }> {
    const res = await fetch(`${API_BASE}/api/v1/profile/details`, {
      method: 'PUT',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(profile),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to update profile details (${res.status})`);
    }
    return await res.json();
  },

  async getMarketIntelligence(headers: Record<string, string>): Promise<import('../types').MarketIntelligenceResponse> {
    const res = await fetch(`${API_BASE}/api/v1/profile/market-intelligence`, { headers });
    if (!res.ok) throw new Error(`Failed to load market intelligence (${res.status})`);
    return await res.json();
  },

  async toggleLearningAction(
    skillName: string,
    action: 'start_learning' | 'mark_mastered' | 'remove',
    headers: Record<string, string>
  ): Promise<{ status: string; message: string; action: string }> {
    const res = await fetch(`${API_BASE}/api/v1/profile/learning-action`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ skill_name: skillName, action }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Learning action failed (${res.status})`);
    }
    return await res.json();
  },

  async getOpportunities(
    params: { category?: string; search?: string; remote_only?: boolean; location_filter?: string; sort_by?: string; refresh?: boolean } = {},
    headers: Record<string, string> = {}
  ): Promise<{
    status: string;
    total: number;
    category_counts: {
      all: number;
      jobs: number;
      internships: number;
      hackathons: number;
      opensource: number;
    };
    opportunities: any[];
  }> {
    const query = new URLSearchParams();
    if (params.category && params.category !== 'all') query.append('category', params.category);
    if (params.search) query.append('search', params.search);
    if (params.remote_only) query.append('remote_only', 'true');
    if (params.location_filter) query.append('location_filter', params.location_filter);
    if (params.sort_by) query.append('sort_by', params.sort_by);
    if (params.refresh) query.append('refresh', 'true');

    const url = `${API_BASE}/api/v1/opportunities?${query.toString()}`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`Failed to load opportunities (${res.status})`);
    return await res.json();
  },



  async parseJobUrl(jobUrl: string, headers: Record<string, string>): Promise<{
    status: string;
    url: string;
    parsed_job: {
      title: string;
      company: string;
      location: string;
      skills_required: string[];
      job_description: string;
    };
  }> {
    const res = await fetch(`${API_BASE}/api/v1/opportunities/parse-url`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url: jobUrl })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to parse job URL (${res.status})`);
    }
    return await res.json();
  },

  async chatWithBrain(
    query: string,
    history: Array<{ role: string; content: string }>,
    contextMode: string = 'general',
    headers: Record<string, string> = {}
  ): Promise<{
    status: string;
    reply: string;
    citations: Array<{ type: string; label: string; detail: string }>;
    graph_nodes_referenced: string[];
    graph_lens?: {
      query: string;
      title: string;
      explanation: string;
    } | null;
    suggested_followups: string[];
    context_stats?: {
      verified_skills_count: number;
      projects_count: number;
      opportunities_found: number;
    };
  }> {
    const res = await fetch(`${API_BASE}/api/v1/brain/chat`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query,
        conversation_history: history,
        context_mode: contextMode
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Brain Chat request failed (${res.status})`);
    }
    return await res.json();
  },

  async queryGraphNLP(
    query: string,
    headers: Record<string, string> = {}
  ): Promise<{
    status: string;
    query: string;
    title: string;
    explanation: string;
    total_nodes: number;
    matched_nodes_count: number;
    matched_node_ids: string[];
    subgraph: GraphData;
  }> {
    const res = await fetch(`${API_BASE}/api/v1/brain/graph-query`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Smart graph query failed (${res.status})`);
    }
    return await res.json();
  },

  async extractJobNotice(rawText: string, headers: Record<string, string>): Promise<{
    status: string;
    extracted_job: import('../types').ExtractedJobNotice;
  }> {
    const res = await fetch(`${API_BASE}/api/v1/interview/extract-notice`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw_text: rawText }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to extract job notice (${res.status})`);
    }
    return await res.json();
  },

  async getJobIntelligence(
    payload: { company: string; role: string; job_description?: string },
    headers: Record<string, string>
  ): Promise<{
    status: string;
    intelligence: import('../types').JobIntelligence;
  }> {
    const res = await fetch(`${API_BASE}/api/v1/interview/job-intelligence`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to generate job intelligence (${res.status})`);
    }
    return await res.json();
  },

  async startInterviewSession(
    payload: {
      company: string;
      role: string;
      job_description?: string;
      round_type?: string;
      difficulty?: string;
      blueprint_override?: any;
    },
    headers: Record<string, string>
  ): Promise<import('../types').InterviewSessionState> {
    const res = await fetch(`${API_BASE}/api/v1/interview/session/start`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to start interview session (${res.status})`);
    }
    return await res.json();
  },

  async respondInterviewSession(
    payload: {
      company: string;
      role: string;
      round_type: string;
      current_question: string;
      candidate_answer: string;
      step: number;
      total_steps: number;
      history?: any[];
    },
    headers: Record<string, string>
  ): Promise<{
    status: string;
    evaluation: import('../types').InterviewEvaluationResponse;
  }> {
    const res = await fetch(`${API_BASE}/api/v1/interview/session/respond`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to submit interview answer (${res.status})`);
    }
    return await res.json();
  },

  async finishInterviewSession(
    payload: {
      company: string;
      role: string;
      round_type: string;
      history: any[];
    },
    headers: Record<string, string>
  ): Promise<{
    status: string;
    scorecard: import('../types').InterviewScorecard;
  }> {
    const res = await fetch(`${API_BASE}/api/v1/interview/session/finish`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to generate interview scorecard (${res.status})`);
    }
    return await res.json();
  },
};

