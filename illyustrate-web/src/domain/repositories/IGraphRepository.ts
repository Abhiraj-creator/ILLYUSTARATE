import type { CodeGraph } from '../entities/CodeGraph';

export interface IGraphRepository {
  findById(id: string): Promise<CodeGraph | null>;
  findByRepositoryId(repositoryId: string): Promise<CodeGraph | null>;
  create(graph: Omit<CodeGraph, 'id' | 'createdAt' | 'updatedAt'>): Promise<CodeGraph>;
  update(id: string, data: Partial<CodeGraph>): Promise<CodeGraph>;
  delete(id: string): Promise<void>;
}
