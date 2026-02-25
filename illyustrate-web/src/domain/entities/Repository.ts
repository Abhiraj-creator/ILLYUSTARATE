import type { Repository as RepositoryType } from '@shared/types';

export class Repository implements RepositoryType {
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

  constructor(data: RepositoryType) {
    this.id = data.id;
    this.owner = data.owner;
    this.name = data.name;
    this.fullName = data.fullName;
    this.description = data.description;
    this.url = data.url;
    this.language = data.language;
    this.stars = data.stars;
    this.isPrivate = data.isPrivate;
    this.defaultBranch = data.defaultBranch;
    this.size = data.size;
    this.analyzedAt = data.analyzedAt ? new Date(data.analyzedAt) : undefined;
    this.status = data.status;
    this.userId = data.userId;
  }

  get sizeInMB(): number {
    return this.size / (1024 * 1024);
  }

  get isAnalyzed(): boolean {
    return this.status === 'completed';
  }

  get isAnalyzing(): boolean {
    return this.status === 'analyzing';
  }

  get hasFailed(): boolean {
    return this.status === 'failed';
  }

  get githubUrl(): string {
    return `https://github.com/${this.fullName}`;
  }

  get displayName(): string {
    return `${this.owner}/${this.name}`;
  }
}
