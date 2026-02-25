import type { User as UserType } from '@shared/types';

export class User implements UserType {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  plan: 'free';
  createdAt: Date;
  updatedAt: Date;

  constructor(data: UserType) {
    this.id = data.id;
    this.email = data.email;
    this.name = data.name;
    this.avatarUrl = data.avatarUrl;
    this.plan = 'free';
    this.createdAt = new Date(data.createdAt);
    this.updatedAt = new Date(data.updatedAt);
  }

  // All users have full access - no pricing tiers
  get isPro(): boolean {
    return true;
  }

  canAccessPrivateRepos(): boolean {
    return true;
  }

  canUseAIChat(): boolean {
    return true;
  }

  canExport(): boolean {
    return true;
  }
}
