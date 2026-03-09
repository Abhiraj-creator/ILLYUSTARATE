export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  bio?: string;
  experience?: string;
  plan: 'free';
  createdAt: Date;
  updatedAt: Date;
}

export interface Repository {
  id: string;
  owner: string;
  name: string;
  fullName: string;
  description?: string;
  url: string;
  language?: string;
  stars: number;
  isPrivate: boolean;
  defaultBranch: string;
  size: number;
  analyzedAt?: Date;
  status: 'pending' | 'analyzing' | 'completed' | 'failed';
  userId: string;
}

export interface GraphNode {
  id: string;
  type: 'file' | 'folder' | 'function' | 'class' | 'import' | 'export';
  label: string;
  path: string;
  language?: string;
  metrics?: {
    linesOfCode: number;
    complexity: number;
  };
  data?: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: 'imports' | 'exports' | 'calls' | 'extends' | 'contains';
  label?: string;
}

export interface CodeGraph {
  id: string;
  repositoryId: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  layout: 'cose' | 'hierarchical' | 'circle' | 'grid';
  createdAt: Date;
  updatedAt: Date;
}

export interface Documentation {
  id: string;
  repositoryId: string;
  filePath: string;
  content: string;
  summary: string;
  keyFunctions: string[];
  dependencies: string[];
  generatedAt: Date;
  confidence: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  context?: {
    filePath?: string;
    nodeId?: string;
  };
}

export interface AnalysisJob {
  id: string;
  repositoryId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  stage: 'fetching' | 'parsing' | 'analyzing' | 'generating';
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlanLimits {
  maxRepos: number;
  maxRepoSize: number;
  maxFilesPerRepo: number;
  aiChatEnabled: boolean;
  exportEnabled: boolean;
  privateRepos: boolean;
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  free: {
    maxRepos: 1000, // Unlimited for all users
    maxRepoSize: 1024 * 1024 * 1024, // 1GB
    maxFilesPerRepo: 50000,
    aiChatEnabled: true, // Enabled for all users
    exportEnabled: true, // Enabled for all users
    privateRepos: true, // Enabled for all users
  },
};
