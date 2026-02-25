import type { Repository } from '../entities/Repository';

export interface IRepositoryRepository {
  findById(id: string): Promise<Repository | null>;
  findByUserId(userId: string): Promise<Repository[]>;
  findByFullName(fullName: string): Promise<Repository | null>;
  create(repo: Omit<Repository, 'id' | 'analyzedAt'>): Promise<Repository>;
  update(id: string, data: Partial<Repository>): Promise<Repository>;
  delete(id: string): Promise<void>;
  countByUserId(userId: string): Promise<number>;
}
