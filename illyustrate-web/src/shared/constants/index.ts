export const APP_NAME = 'ILLYUSTRATE';
export const APP_TAGLINE = 'See your codebase. Understand everything.';

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  REPOSITORY: '/repo/:owner/:name',
  GRAPH: '/repo/:owner/:name/graph',
  CHAT: '/repo/:owner/:name/chat',
  DOCS: '/repo/:owner/:name/docs',
  SETTINGS: '/settings',
  BILLING: '/billing',
} as const;

export const GITHUB_SCOPES = ['repo', 'read:user', 'read:org'];

export const SUPPORTED_LANGUAGES = [
  'javascript',
  'typescript',
  'python',
  'go',
  'rust',
  'java',
  'csharp',
  'cpp',
  'c',
  'ruby',
  'php',
  'swift',
  'kotlin',
] as const;

export const LANGUAGE_COLORS: Record<string, string> = {
  javascript: '#f1e05a',
  typescript: '#2b7489',
  python: '#3572A5',
  go: '#00ADD8',
  rust: '#dea584',
  java: '#b07219',
  csharp: '#178600',
  cpp: '#f34b7d',
  c: '#555555',
  ruby: '#701516',
  php: '#4F5D95',
  swift: '#ffac45',
  kotlin: '#A97BFF',
};

export const NODE_TYPE_COLORS: Record<string, string> = {
  file: '#60a5fa',
  folder: '#94a3b8',
  function: '#34d399',
  class: '#f472b6',
  import: '#fbbf24',
  export: '#a78bfa',
};

export const ANALYSIS_STAGES = {
  FETCHING: { label: 'Fetching Repository', progress: 10 },
  PARSING: { label: 'Parsing Code', progress: 40 },
  ANALYZING: { label: 'Analyzing Dependencies', progress: 70 },
  GENERATING: { label: 'Generating Documentation', progress: 90 },
} as const;
