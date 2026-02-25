# ILLYUSTRATE

**See your codebase. Understand everything.**

ILLYUSTRATE is an AI-powered codebase visualization tool that helps developers understand any GitHub repository through interactive dependency graphs, auto-generated documentation, and an AI assistant.

## Features

- **Interactive Code Graphs**: Visualize your entire codebase as an interactive dependency graph with files, functions, classes, and imports
- **AI-Generated Documentation**: Get instant, comprehensive documentation for any file in your repository
- **Codebase Chat**: Ask questions about your code in natural language and get AI-powered answers
- **Multi-Language Support**: Works with JavaScript, TypeScript, Python, Go, Rust, Java, and more
- **GitHub Integration**: One-click import from your GitHub repositories

## Architecture

This project follows a **4-Layer Clean Architecture** pattern:

```
src/
├── domain/              # Enterprise business rules
│   ├── entities/        # Domain entities (User, Repository, CodeGraph)
│   └── repositories/    # Repository interfaces
│
├── application/         # Application business rules
│   ├── services/        # Use cases and application services
│   ├── hooks/           # React hooks for application logic
│   └── stores/          # Zustand state management stores
│
├── infrastructure/      # External concerns
│   ├── api/             # GitHub API client
│   ├── storage/         # Supabase client
│   ├── ai/              # AI service integration (Gemini/Groq)
│   └── parser/          # Code parsing with Tree-sitter
│
├── presentation/        # UI layer
│   ├── components/      # React components
│   ├── layouts/         # Layout components
│   └── pages/           # Page components
│
├── features/            # Feature-based modules
│   ├── auth/
│   ├── dashboard/
│   ├── repository/
│   ├── graph/
│   ├── chat/
│   └── docs/
│
└── shared/              # Shared resources
    ├── components/      # Shared UI components
    ├── hooks/           # Shared hooks
    ├── utils/           # Utility functions
    ├── types/           # TypeScript types
    └── constants/       # Constants
```

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **Authentication**: Supabase Auth with GitHub OAuth
- **Database**: Supabase (PostgreSQL)
- **Graph Visualization**: Cytoscape.js with cose-bilkent layout
- **Code Parsing**: Tree-sitter
- **AI Integration**: Gemini / Groq APIs

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- GitHub OAuth app

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/illyustrate.git
cd illyustrate/illyustrate-web
```

2. Install dependencies:
```bash
npm install
```

3. Create environment variables:
```bash
cp .env.example .env
```

4. Update `.env` with your credentials:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

5. Start the development server:
```bash
npm run dev
```

### Database Setup

Run the following SQL in your Supabase SQL editor to create the required tables:

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'team')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Repositories table
CREATE TABLE repositories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner TEXT NOT NULL,
  name TEXT NOT NULL,
  full_name TEXT UNIQUE NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  language TEXT,
  stars INTEGER DEFAULT 0,
  is_private BOOLEAN DEFAULT false,
  default_branch TEXT DEFAULT 'main',
  size INTEGER DEFAULT 0,
  analyzed_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'analyzing', 'completed', 'failed')),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Graphs table
CREATE TABLE graphs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repository_id UUID REFERENCES repositories(id) ON DELETE CASCADE UNIQUE,
  nodes JSONB DEFAULT '[]'::jsonb,
  edges JSONB DEFAULT '[]'::jsonb,
  layout TEXT DEFAULT 'cose',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Documentation table
CREATE TABLE documentation (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repository_id UUID REFERENCES repositories(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  content TEXT NOT NULL,
  summary TEXT,
  key_functions TEXT[] DEFAULT '{}',
  dependencies TEXT[] DEFAULT '{}',
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  confidence FLOAT DEFAULT 0.8,
  UNIQUE(repository_id, file_path)
);

-- Chat messages table
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repository_id UUID REFERENCES repositories(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  context JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analysis jobs table
CREATE TABLE analysis_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repository_id UUID REFERENCES repositories(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  progress INTEGER DEFAULT 0,
  stage TEXT DEFAULT 'fetching' CHECK (stage IN ('fetching', 'parsing', 'analyzing', 'generating')),
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE graphs ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentation ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can only access their own data" ON users
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can only access their own repositories" ON repositories
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own graphs" ON graphs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM repositories 
      WHERE repositories.id = graphs.repository_id 
      AND repositories.user_id = auth.uid()
    )
  );
```

## Project Structure Details

### Domain Layer
Contains enterprise business logic independent of any framework:
- **Entities**: Core business objects with behavior (User, Repository, CodeGraph)
- **Repository Interfaces**: Contracts for data access

### Application Layer
Contains application-specific business rules:
- **Stores**: Zustand stores for state management (Auth, Repository, Graph)
- **Services**: Application services orchestrating use cases
- **Hooks**: React hooks for application logic

### Infrastructure Layer
Contains external concerns and implementations:
- **API**: GitHub API client for repository fetching
- **Storage**: Supabase client for database operations
- **AI**: Service for AI-powered documentation and chat
- **Parser**: Code parsing using Tree-sitter

### Presentation Layer
Contains UI components and pages:
- **Components**: Reusable React components
- **Layouts**: Layout wrappers
- **Pages**: Route-level page components

## License

MIT License - see LICENSE file for details

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.
