import axios, { AxiosInstance } from 'axios';

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  private: boolean;
  default_branch: string;
  size: number;
  owner: {
    login: string;
    avatar_url: string;
  };
}

export interface GitHubFile {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string | null;
  type: 'file' | 'dir';
  content?: string;
  encoding?: string;
}

export interface GitHubTreeItem {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
  url: string;
}

export class GitHubApi {
  private client: AxiosInstance;

  constructor(accessToken: string) {
    this.client = axios.create({
      baseURL: 'https://api.github.com',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
  }

  async getUserRepos(): Promise<GitHubRepo[]> {
    const response = await this.client.get<GitHubRepo[]>('/user/repos', {
      params: {
        sort: 'updated',
        per_page: 100,
        affiliation: 'owner,collaborator,organization_member',
      },
    });
    return response.data;
  }

  async getRepo(owner: string, repo: string): Promise<GitHubRepo> {
    const response = await this.client.get<GitHubRepo>(`/repos/${owner}/${repo}`);
    return response.data;
  }

  async getRepoContents(owner: string, repo: string, path: string = '', ref?: string): Promise<GitHubFile[]> {
    const response = await this.client.get<GitHubFile[]>(`/repos/${owner}/${repo}/contents/${path}`, {
      params: { ref },
    });
    return Array.isArray(response.data) ? response.data : [response.data];
  }

  async getFileContent(owner: string, repo: string, path: string, ref?: string): Promise<string> {
    const response = await this.client.get<GitHubFile>(`/repos/${owner}/${repo}/contents/${path}`, {
      params: { ref },
    });
    
    if (response.data.content && response.data.encoding === 'base64') {
      return atob(response.data.content);
    }
    
    throw new Error('File content not available');
  }

  async getRepoTree(owner: string, repo: string, sha?: string): Promise<GitHubTreeItem[]> {
    const treeSha = sha || 'HEAD';
    const response = await this.client.get<{ tree: GitHubTreeItem[]; truncated: boolean }>(
      `/repos/${owner}/${repo}/git/trees/${treeSha}`,
      {
        params: { recursive: 1 },
      }
    );
    return response.data.tree;
  }

  async getRateLimit(): Promise<{ limit: number; remaining: number; reset: number }> {
    const response = await this.client.get('/rate_limit');
    return {
      limit: response.data.rate.limit,
      remaining: response.data.rate.remaining,
      reset: response.data.rate.reset,
    };
  }
}
