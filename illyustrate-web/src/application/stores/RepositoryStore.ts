import { create } from 'zustand';
import { supabase } from '@infrastructure/storage/SupabaseClient';
import { GitHubApi } from '@infrastructure/api/GitHubApi';
import { Repository } from '@domain/entities/Repository';
import type { AnalysisJob } from '@shared/types';

interface RepositoryState {
  repositories: Repository[];
  currentRepository: Repository | null;
  analysisJobs: Map<string, AnalysisJob>;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchRepositories: (userId: string) => Promise<void>;
  fetchGitHubRepos: (accessToken: string) => Promise<Repository[]>;
  addRepository: (repoData: Omit<Repository, 'id' | 'analyzedAt'>, userId: string) => Promise<Repository>;
  removeRepository: (id: string) => Promise<void>;
  setCurrentRepository: (repo: Repository | null) => void;
  updateRepositoryStatus: (id: string, status: Repository['status']) => void;
  startAnalysis: (repositoryId: string) => Promise<void>;
  getAnalysisJob: (repositoryId: string) => AnalysisJob | undefined;
}

export const useRepositoryStore = create<RepositoryState>()((set, get) => ({
  repositories: [],
  currentRepository: null,
  analysisJobs: new Map(),
  isLoading: false,
  error: null,

  fetchRepositories: async (userId: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const { data, error } = await supabase
        .from('repositories')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const repos = (data || []).map(r => new Repository({
        id: r.id,
        owner: r.owner,
        name: r.name,
        fullName: r.full_name,
        description: r.description || undefined,
        url: r.url,
        language: r.language || undefined,
        stars: r.stars,
        isPrivate: r.is_private,
        defaultBranch: r.default_branch,
        size: r.size,
        analyzedAt: r.analyzed_at ? new Date(r.analyzed_at) : undefined,
        status: r.status,
        userId: r.user_id,
      }));

      set({ repositories: repos, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  fetchGitHubRepos: async (accessToken: string) => {
    const github = new GitHubApi(accessToken);
    const repos = await github.getUserRepos();
    
    return repos.map(r => new Repository({
      id: `github-${r.id}`,
      owner: r.owner.login,
      name: r.name,
      fullName: r.full_name,
      description: r.description || undefined,
      url: r.html_url,
      language: r.language || undefined,
      stars: r.stargazers_count,
      isPrivate: r.private,
      defaultBranch: r.default_branch,
      size: r.size,
      status: 'pending',
      userId: '',
    }));
  },

  addRepository: async (repoData, userId) => {
    set({ isLoading: true, error: null });
    
    try {
      const { data, error } = await supabase
        .from('repositories')
        .insert({
          owner: repoData.owner,
          name: repoData.name,
          full_name: repoData.fullName,
          description: repoData.description,
          url: repoData.url,
          language: repoData.language,
          stars: repoData.stars,
          is_private: repoData.isPrivate,
          default_branch: repoData.defaultBranch,
          size: repoData.size,
          status: 'pending',
          user_id: userId,
        })
        .select()
        .single();

      if (error) throw error;

      const repo = new Repository({
        id: data.id,
        owner: data.owner,
        name: data.name,
        fullName: data.full_name,
        description: data.description || undefined,
        url: data.url,
        language: data.language || undefined,
        stars: data.stars,
        isPrivate: data.is_private,
        defaultBranch: data.default_branch,
        size: data.size,
        status: data.status,
        userId: data.user_id,
      });

      set(state => ({
        repositories: [repo, ...state.repositories],
        isLoading: false,
      }));

      return repo;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  removeRepository: async (id: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const { error } = await supabase
        .from('repositories')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set(state => ({
        repositories: state.repositories.filter(r => r.id !== id),
        isLoading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  setCurrentRepository: (repo) => {
    set({ currentRepository: repo });
  },

  updateRepositoryStatus: (id, status) => {
    set(state => {
      const updateRepo = (r: Repository) => {
        // Create new Repository instance with updated status
        return new Repository({
          ...r,
          status,
          analyzedAt: status === 'completed' ? new Date() : r.analyzedAt,
        });
      };

      return {
        repositories: state.repositories.map(r =>
          r.id === id ? updateRepo(r) : r
        ),
        currentRepository: state.currentRepository?.id === id
          ? updateRepo(state.currentRepository)
          : state.currentRepository,
      };
    });
  },

  startAnalysis: async (repositoryId: string) => {
    const job: AnalysisJob = {
      id: `job-${Date.now()}`,
      repositoryId,
      status: 'queued',
      progress: 0,
      stage: 'fetching',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    set(state => ({
      analysisJobs: new Map(state.analysisJobs).set(repositoryId, job),
    }));

    // Update repository status
    get().updateRepositoryStatus(repositoryId, 'analyzing');

    // Simulate analysis progress (in real app, this would be a WebSocket or polling)
    const stages: AnalysisJob['stage'][] = ['fetching', 'parsing', 'analyzing', 'generating'];
    let currentStage = 0;

    const interval = setInterval(() => {
      const currentJob = get().analysisJobs.get(repositoryId);
      if (!currentJob || currentJob.status === 'completed' || currentJob.status === 'failed') {
        clearInterval(interval);
        return;
      }

      if (currentStage < stages.length - 1) {
        currentStage++;
        const progress = Math.min(25 * (currentStage + 1), 95);
        
        const updatedJob: AnalysisJob = {
          ...currentJob,
          status: 'processing',
          stage: stages[currentStage],
          progress,
          updatedAt: new Date(),
        };

        set(state => ({
          analysisJobs: new Map(state.analysisJobs).set(repositoryId, updatedJob),
        }));
      } else {
        // Complete
        const completedJob: AnalysisJob = {
          ...currentJob,
          status: 'completed',
          progress: 100,
          updatedAt: new Date(),
        };

        set(state => ({
          analysisJobs: new Map(state.analysisJobs).set(repositoryId, completedJob),
        }));

        get().updateRepositoryStatus(repositoryId, 'completed');
        clearInterval(interval);
      }
    }, 2000);
  },

  getAnalysisJob: (repositoryId: string) => {
    return get().analysisJobs.get(repositoryId);
  },
}));
