import { useState, useEffect } from 'react'
import { 
  RefreshCw, 
  ThumbsUp, 
  ThumbsDown, 
  Loader2,
  ChevronRight,
  Folder,
  FileCode
} from 'lucide-react'
import type { Repository } from '@domain/entities/Repository'
import type { Documentation } from '@shared/types'

interface DocumentationPanelProps {
  repository: Repository
}

export function DocumentationPanel({ repository }: DocumentationPanelProps) {
  const [docs, setDocs] = useState<Documentation[]>([])
  const [selectedDoc, setSelectedDoc] = useState<Documentation | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    loadDocumentation()
  }, [repository])

  const loadDocumentation = async () => {
    setLoading(true)
    // Simulate loading docs
    setTimeout(() => {
      const mockDocs: Documentation[] = [
        {
          id: '1',
          repositoryId: repository.id,
          filePath: 'src/App.tsx',
          content: `# App.tsx

## Overview
This is the main application component that serves as the entry point for the React application.

## Key Features
- Initializes the application context
- Sets up routing configuration
- Provides global state management

## Functions

### App()
The main component that renders the application.

**Returns:** JSX.Element

## Dependencies
- React
- React Router
- Custom hooks and stores

## Usage
\`\`\`tsx
import { App } from './App';

// Render the app
<App />
\`\`\``,
          summary: 'Main application component and entry point',
          keyFunctions: ['App', 'initializeApp'],
          dependencies: ['react', 'react-router-dom'],
          generatedAt: new Date(),
          confidence: 0.92,
        },
        {
          id: '2',
          repositoryId: repository.id,
          filePath: 'src/components/Button.tsx',
          content: `# Button Component

## Overview
A reusable button component with multiple variants and sizes.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| variant | 'primary' \| 'secondary' \| 'ghost' | 'primary' | Button style variant |
| size | 'sm' \| 'md' \| 'lg' | 'md' | Button size |
| disabled | boolean | false | Whether the button is disabled |
| onClick | () => void | - | Click handler |

## Usage
\`\`\`tsx
<Button variant="primary" size="md" onClick={handleClick}>
  Click me
</Button>
\`\`\``,
          summary: 'Reusable button component with variants',
          keyFunctions: ['Button'],
          dependencies: ['react', 'classnames'],
          generatedAt: new Date(),
          confidence: 0.88,
        },
        {
          id: '3',
          repositoryId: repository.id,
          filePath: 'src/utils/helpers.ts',
          content: `# Helper Functions

## Overview
Collection of utility functions used throughout the application.

## Functions

### formatDate(date: Date): string
Formats a date object to a human-readable string.

**Parameters:**
- date: Date object to format

**Returns:** Formatted date string

### debounce<T>(fn: T, delay: number): T
Debounce function to limit execution rate.

**Parameters:**
- fn: Function to debounce
- delay: Delay in milliseconds

**Returns:** Debounced function

### generateId(): string
Generates a unique identifier.

**Returns:** Unique string ID`,
          summary: 'Utility helper functions for the application',
          keyFunctions: ['formatDate', 'debounce', 'generateId'],
          dependencies: [],
          generatedAt: new Date(),
          confidence: 0.95,
        },
      ]
      setDocs(mockDocs)
      setSelectedDoc(mockDocs[0])
      setLoading(false)
    }, 1000)
  }

  const handleRegenerate = async () => {
    if (!selectedDoc) return
    
    setGenerating(true)
    // Simulate regeneration
    setTimeout(() => {
      setGenerating(false)
    }, 2000)
  }

  const handleFeedback = (positive: boolean) => {
    // Send feedback to backend
    console.log(`Feedback received: ${positive ? 'positive' : 'negative'}`)
  }

  const getFileIcon = (path: string) => {
    if (path.includes('/')) {
      return <Folder className="w-4 h-4 text-indigo-400" />
    }
    return <FileCode className="w-4 h-4 text-blue-400" />
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-full flex">
      {/* File List */}
      <div className="w-80 border-r border-slate-700 bg-slate-900 overflow-y-auto">
        <div className="p-4 border-b border-slate-700">
          <h3 className="text-sm font-medium text-white">Documentation</h3>
          <p className="text-xs text-slate-400 mt-1">
            {docs.length} files documented
          </p>
        </div>
        <div className="py-2">
          {docs.map((doc) => (
            <button
              key={doc.id}
              onClick={() => setSelectedDoc(doc)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-800 transition-colors ${
                selectedDoc?.id === doc.id ? 'bg-slate-800 border-l-2 border-indigo-500' : ''
              }`}
            >
              {getFileIcon(doc.filePath)}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-300 truncate">{doc.filePath}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    doc.confidence > 0.9 ? 'bg-emerald-500/20 text-emerald-400' :
                    doc.confidence > 0.7 ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {Math.round(doc.confidence * 100)}% confidence
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
          ))}
        </div>
      </div>

      {/* Documentation Content */}
      <div className="flex-1 overflow-y-auto bg-slate-900">
        {selectedDoc ? (
          <div className="max-w-3xl mx-auto p-8">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-white mb-2">
                  {selectedDoc.filePath.split('/').pop()}
                </h1>
                <p className="text-slate-400">{selectedDoc.filePath}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleFeedback(true)}
                  className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors"
                  title="Helpful"
                >
                  <ThumbsUp className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleFeedback(false)}
                  className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                  title="Not helpful"
                >
                  <ThumbsDown className="w-5 h-5" />
                </button>
                <button
                  onClick={handleRegenerate}
                  disabled={generating}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors disabled:opacity-50"
                >
                  {generating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  Regenerate
                </button>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-slate-800/50 rounded-lg p-4 mb-6">
              <h2 className="text-sm font-medium text-slate-300 mb-2">Summary</h2>
              <p className="text-slate-400">{selectedDoc.summary}</p>
            </div>

            {/* Content */}
            <div className="prose prose-invert prose-slate max-w-none">
              <div className="text-slate-300 whitespace-pre-wrap">
                {selectedDoc.content}
              </div>
            </div>

            {/* Metadata */}
            <div className="mt-8 pt-6 border-t border-slate-700">
              <div className="flex items-center justify-between text-sm text-slate-500">
                <span>Generated on {selectedDoc.generatedAt.toLocaleDateString()}</span>
                <span>Confidence: {Math.round(selectedDoc.confidence * 100)}%</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-500">
            Select a file to view its documentation
          </div>
        )}
      </div>
    </div>
  )
}
