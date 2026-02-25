import type { CodeGraph as CodeGraphType, GraphNode, GraphEdge } from '@shared/types';

export class CodeGraph implements CodeGraphType {
  id: string;
  repositoryId: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  layout: 'cose' | 'hierarchical' | 'circle' | 'grid';
  createdAt: Date;
  updatedAt: Date;

  constructor(data: CodeGraphType) {
    this.id = data.id;
    this.repositoryId = data.repositoryId;
    this.nodes = data.nodes;
    this.edges = data.edges;
    this.layout = data.layout;
    this.createdAt = new Date(data.createdAt);
    this.updatedAt = new Date(data.updatedAt);
  }

  get nodeCount(): number {
    return this.nodes.length;
  }

  get edgeCount(): number {
    return this.edges.length;
  }

  get fileNodes(): GraphNode[] {
    return this.nodes.filter(n => n.type === 'file');
  }

  get folderNodes(): GraphNode[] {
    return this.nodes.filter(n => n.type === 'folder');
  }

  get functionNodes(): GraphNode[] {
    return this.nodes.filter(n => n.type === 'function');
  }

  get classNodes(): GraphNode[] {
    return this.nodes.filter(n => n.type === 'class');
  }

  getNodesByType(type: GraphNode['type']): GraphNode[] {
    return this.nodes.filter(n => n.type === type);
  }

  getEdgesForNode(nodeId: string): GraphEdge[] {
    return this.edges.filter(e => e.source === nodeId || e.target === nodeId);
  }

  getIncomingEdges(nodeId: string): GraphEdge[] {
    return this.edges.filter(e => e.target === nodeId);
  }

  getOutgoingEdges(nodeId: string): GraphEdge[] {
    return this.edges.filter(e => e.source === nodeId);
  }

  findNodeByPath(path: string): GraphNode | undefined {
    return this.nodes.find(n => n.path === path);
  }

  findNodeById(id: string): GraphNode | undefined {
    return this.nodes.find(n => n.id === id);
  }
}
