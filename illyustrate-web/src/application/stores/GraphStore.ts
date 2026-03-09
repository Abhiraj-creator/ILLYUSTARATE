import { create } from 'zustand';
import { supabase } from '@infrastructure/storage/SupabaseClient';
import { CodeGraph } from '@domain/entities/CodeGraph';
import { CodeParser } from '@infrastructure/parser/CodeParser';
import { GitHubApi } from '@infrastructure/api/GitHubApi';
import type { GraphNode, GraphEdge } from '@shared/types';

interface GraphState {
  currentGraph: CodeGraph | null;
  selectedNode: GraphNode | null;
  isLoading: boolean;
  error: string | null;
  layout: 'cose' | 'hierarchical' | 'circle' | 'grid';

  // Filters
  visibleNodeTypes: Set<GraphNode['type']>;
  searchQuery: string;

  // Actions
  loadGraph: (repositoryId: string) => Promise<void>;
  generateGraph: (repositoryId: string, owner: string, name: string, accessToken: string) => Promise<void>;
  setSelectedNode: (node: GraphNode | null) => void;
  setLayout: (layout: GraphState['layout']) => void;
  toggleNodeType: (type: GraphNode['type']) => void;
  setSearchQuery: (query: string) => void;
  getFilteredNodes: () => GraphNode[];
  getFilteredEdges: () => GraphEdge[];
}

export const useGraphStore = create<GraphState>()((set, get) => ({
  currentGraph: null,
  selectedNode: null,
  isLoading: false,
  error: null,
  layout: 'cose',
  visibleNodeTypes: new Set(['file', 'folder', 'function', 'class', 'import', 'export']),
  searchQuery: '',

  loadGraph: async (repositoryId: string) => {
    set({ isLoading: true, error: null });

    try {
      const { data, error } = await supabase
        .from('graphs')
        .select('*')
        .eq('repository_id', repositoryId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No graph found
          set({ currentGraph: null, isLoading: false });
          return;
        }
        throw error;
      }

      const graph = new CodeGraph({
        id: data.id,
        repositoryId: data.repository_id,
        nodes: data.nodes as GraphNode[],
        edges: data.edges as GraphEdge[],
        layout: data.layout,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      });

      set({ currentGraph: graph, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  generateGraph: async (repositoryId: string, owner: string, name: string, accessToken: string) => {
    set({ isLoading: true, error: null });

    try {
      const github = new GitHubApi(accessToken);
      const parser = CodeParser.getInstance();

      // Get repository tree
      const treeItems = await github.getRepoTree(owner, name);

      // Comprehensive list of paths/patterns to ignore (gitignore-like)
      const IGNORED_PATH_SEGMENTS = [
        'node_modules', '.git', 'dist', 'build', 'out', '.next', '.nuxt',
        '.cache', 'coverage', '.nyc_output', '.vscode', '.idea', '__pycache__',
        '.pytest_cache', 'venv', 'env', '.env', '.tox', 'vendor', 'bower_components',
        'jspm_packages', '.yarn', '.pnp', 'packages/*/node_modules',
      ];
      const IGNORED_EXTENSIONS = [
        '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.bmp',
        '.mp4', '.webm', '.mov', '.mp3', '.wav', '.ogg', '.ttf', '.woff',
        '.woff2', '.eot', '.pdf', '.zip', '.tar', '.gz', '.lock',
        '.min.js', '.min.css', '.map', '.snap', '.bin', '.exe',
      ];
      const IGNORED_FILENAMES = [
        'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb',
        'Thumbs.db', '.DS_Store', '.gitignore', '.gitattributes',
      ];

      const shouldIgnore = (path: string): boolean => {
        const lowerPath = path.toLowerCase();
        if (IGNORED_PATH_SEGMENTS.some(seg => lowerPath.includes(`/${seg}/`) || lowerPath.startsWith(`${seg}/`) || lowerPath === seg)) return true;
        if (IGNORED_EXTENSIONS.some(ext => lowerPath.endsWith(ext))) return true;
        const filename = path.split('/').pop() || '';
        if (IGNORED_FILENAMES.includes(filename)) return true;
        return false;
      };

      const nodes: GraphNode[] = [];
      const edges: GraphEdge[] = [];
      const fileNodes = new Map<string, string>(); // path -> nodeId

      // Filter tree items
      const cleanTreeItems = treeItems.filter(item => !shouldIgnore(item.path));

      // Create folder nodes (only from clean items)
      const folders = new Set<string>();
      cleanTreeItems.forEach(item => {
        const parts = item.path.split('/');
        parts.pop();
        let currentPath = '';
        parts.forEach(part => {
          currentPath = currentPath ? `${currentPath}/${part}` : part;
          folders.add(currentPath);
        });
      });

      folders.forEach((folder) => {
        const folderId = `folder:${folder}`;
        nodes.push({
          id: folderId,
          type: 'folder',
          label: folder.split('/').pop() || folder,
          path: folder,
        });

        const parentPath = folder.split('/').slice(0, -1).join('/');
        if (parentPath && folders.has(parentPath)) {
          edges.push({
            id: `edge:folder:${parentPath}:${folder}`,
            source: `folder:${parentPath}`,
            target: folderId,
            type: 'contains',
          });
        }
      });

      // Parse code files only — capped at 60 for performance
      const codeExts = ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'go', 'rs', 'php', 'rb', 'cs', 'cpp', 'c', 'h', 'swift', 'kt'];
      const codeFiles = cleanTreeItems.filter(item =>
        item.type === 'blob' &&
        codeExts.includes(item.path.split('.').pop()?.toLowerCase() || '')
      );

      for (const file of codeFiles.slice(0, 60)) { // Cap at 60 files for a clean, fast graph
        try {
          const content = await github.getFileContent(owner, name, file.path);
          const parsed = await parser.parseFile(file.path, content);

          if (parsed) {
            // Add file node
            const fileId = `file:${file.path}`;
            fileNodes.set(file.path, fileId);

            nodes.push({
              id: fileId,
              type: 'file',
              label: file.path.split('/').pop() || file.path,
              path: file.path,
              language: parsed.language,
              metrics: {
                linesOfCode: content.split('\n').length,
                complexity: parsed.nodes[0]?.metrics?.complexity || 1,
              },
            });

            // Add folder-file relationship
            const parentPath = file.path.split('/').slice(0, -1).join('/');
            if (parentPath && folders.has(parentPath)) {
              edges.push({
                id: `edge:folder:${parentPath}:file:${file.path}`,
                source: `folder:${parentPath}`,
                target: fileId,
                type: 'contains',
              });
            }

            // Add parsed nodes and edges
            parsed.nodes.slice(1).forEach(node => {
              nodes.push({
                ...node,
                id: `${fileId}:${node.id}`,
              });
            });

            parsed.edges.forEach(edge => {
              edges.push({
                ...edge,
                id: `${fileId}:${edge.id}`,
                source: edge.source.startsWith('file:') ? edge.source : `${fileId}:${edge.source}`,
                target: edge.target.startsWith('file:') ? edge.target : `${fileId}:${edge.target}`,
              });
            });
          }
        } catch (error) {
          console.warn(`Failed to parse ${file.path}:`, error);
        }
      }

      // Note: inter-file import edges are resolved during the first pass above.

      // Save graph to database
      const { data: savedGraph, error: saveError } = await supabase
        .from('graphs')
        .upsert({
          repository_id: repositoryId,
          nodes,
          edges,
          layout: 'cose',
        }, {
          onConflict: 'repository_id',
        })
        .select()
        .single();

      if (saveError) throw saveError;

      const graph = new CodeGraph({
        id: savedGraph.id,
        repositoryId: savedGraph.repository_id,
        nodes: savedGraph.nodes as GraphNode[],
        edges: savedGraph.edges as GraphEdge[],
        layout: savedGraph.layout,
        createdAt: new Date(savedGraph.created_at),
        updatedAt: new Date(savedGraph.updated_at),
      });

      set({ currentGraph: graph, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  setSelectedNode: (node) => {
    set({ selectedNode: node });
  },

  setLayout: (layout) => {
    set({ layout });
  },

  toggleNodeType: (type) => {
    set(state => {
      const newTypes = new Set(state.visibleNodeTypes);
      if (newTypes.has(type)) {
        newTypes.delete(type);
      } else {
        newTypes.add(type);
      }
      return { visibleNodeTypes: newTypes };
    });
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
  },

  getFilteredNodes: () => {
    const { currentGraph, visibleNodeTypes, searchQuery } = get();
    if (!currentGraph) return [];

    return currentGraph.nodes.filter(node => {
      const typeVisible = visibleNodeTypes.has(node.type);
      const matchesSearch = !searchQuery ||
        node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.path.toLowerCase().includes(searchQuery.toLowerCase());
      return typeVisible && matchesSearch;
    });
  },

  getFilteredEdges: () => {
    const { currentGraph } = get();
    const visibleNodes = new Set(get().getFilteredNodes().map(n => n.id));

    if (!currentGraph) return [];

    return currentGraph.edges.filter(edge =>
      visibleNodes.has(edge.source) && visibleNodes.has(edge.target)
    );
  },
}));
