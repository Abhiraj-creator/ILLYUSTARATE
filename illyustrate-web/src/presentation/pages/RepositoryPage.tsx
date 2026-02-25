import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { 
  FileCode, 
  MessageSquare, 
  BookOpen, 
  Loader2,
  RefreshCw,
  LayoutGrid,
  Search,
  Filter,
  X
} from 'lucide-react'
import type { CodeGraph } from '@domain/entities/CodeGraph'
import { useRepositoryStore } from '@application/stores/RepositoryStore'
import { useGraphStore } from '@application/stores/GraphStore'
import { supabase } from '@infrastructure/storage/SupabaseClient'
import { GraphViewer } from '@presentation/components/GraphViewer'
import { FileExplorer } from '@presentation/components/FileExplorer'
import { AIChat } from '@presentation/components/AIChat'
import { DocumentationPanel } from '@presentation/components/DocumentationPanel'

type Tab = 'graph' | 'files' | 'chat' | 'docs'

export function RepositoryPage() {
  const { owner, name } = useParams<{ owner: string; name: string }>()
  const [activeTab, setActiveTab] = useState<Tab>('graph')
  
  const { repositories, setCurrentRepository, updateRepositoryStatus } = useRepositoryStore()
  const { currentGraph, loadGraph, generateGraph, isLoading } = useGraphStore()

  const fullName = `${owner}/${name}`
  const repo = repositories.find(r => r.fullName === fullName)

  useEffect(() => {
    if (repo) {
      setCurrentRepository(repo)
      if (repo.isAnalyzed && !currentGraph) {
        loadGraph(repo.id)
      }
    }
  }, [repo, setCurrentRepository, loadGraph, currentGraph])

  const handleAnalyze = async () => {
    if (!repo || !owner || !name) return
    
    try {
      // Get the GitHub access token from the session
      const { data: { session } } = await supabase.auth.getSession()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const accessToken = (session as any)?.provider_token
      
      if (!accessToken) {
        alert('GitHub access token not found. Please sign out and sign in again.')
        return
      }
      
      // Update repository status to show it's being analyzed
      updateRepositoryStatus(repo.id, 'analyzing')
      
      // Generate the graph
      await generateGraph(repo.id, owner, name, accessToken)
      
      // Update repository status to show analysis is complete
      updateRepositoryStatus(repo.id, 'completed')
      
    } catch (error) {
      console.error('Failed to analyze repository:', error)
      // Reset analyzing state on error
      updateRepositoryStatus(repo.id, 'failed')
      alert('Failed to analyze repository. Please try again.')
    }
  }

  const tabs = [
    { id: 'graph' as Tab, label: 'Graph', icon: LayoutGrid },
    { id: 'files' as Tab, label: 'Files', icon: FileCode },
    { id: 'docs' as Tab, label: 'Docs', icon: BookOpen },
    { id: 'chat' as Tab, label: 'Chat', icon: MessageSquare },
  ]

  if (!repo) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading repository...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col -m-4 sm:-m-6">
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 border-b border-slate-700 bg-slate-800/50">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-white">{repo.displayName}</h1>
              <p className="text-xs sm:text-sm text-slate-400">
                {repo.language} • {repo.stars.toLocaleString()} stars • {repo.sizeInMB.toFixed(1)} MB
              </p>
            </div>
            
            {!repo.isAnalyzed && !repo.isAnalyzing && (
              <button
                onClick={handleAnalyze}
                disabled={isLoading}
                className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 text-sm sm:text-base w-full sm:w-auto"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">Analyze Repository</span>
                <span className="sm:hidden">Analyze</span>
              </button>
            )}
            
            {repo.isAnalyzing && (
              <span className="flex items-center justify-center gap-2 text-indigo-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing...
              </span>
            )}
          </div>

          {/* Tabs - scrollable on mobile, icon-only on small screens */}
          <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'graph' && (
          <div className="h-full flex flex-col lg:flex-row">
            {/* Graph */}
            <div className="flex-1 relative min-h-0">
              {repo.isAnalyzed ? (
                <GraphViewer 
                  graph={currentGraph} 
                  isLoading={isLoading}
                />
              ) : (
                <div className="h-full flex items-center justify-center p-4">
                  <div className="text-center max-w-sm">
                    <LayoutGrid className="w-12 h-12 sm:w-16 sm:h-16 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">
                      Repository not analyzed yet
                    </h3>
                    <p className="text-sm text-slate-400 mb-6">
                      Click "Analyze Repository" to generate an interactive dependency graph of your codebase.
                    </p>
                    <button
                      onClick={handleAnalyze}
                      disabled={isLoading}
                      className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 w-full sm:w-auto"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-5 h-5" />
                          Start Analysis
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar - collapsible on mobile */}
            <GraphSidebar currentGraph={currentGraph} />
          </div>
        )}

        {activeTab === 'files' && (
          <FileExplorer repository={repo} />
        )}

        {activeTab === 'docs' && (
          <DocumentationPanel repository={repo} />
        )}

        {activeTab === 'chat' && (
          <AIChat repository={repo} />
        )}
      </div>
    </div>
  )
}

// Graph Sidebar Component - Responsive with mobile toggle
interface GraphSidebarProps {
  currentGraph: CodeGraph | null
}

function GraphSidebar({ currentGraph }: GraphSidebarProps) {
  const [isOpen, setIsOpen] = useState(false)

  const sidebarContent = (
    <>
      <h3 className="font-semibold text-white mb-4">Graph Filters</h3>
      
      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search nodes..."
          className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* Node Types */}
      <div className="space-y-2">
        {['file', 'folder', 'function', 'class', 'import'].map((type) => (
          <label key={type} className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              defaultChecked
              className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-slate-300 capitalize">{type}s</span>
          </label>
        ))}
      </div>

      {/* Stats */}
      {currentGraph && (
        <div className="mt-6 pt-6 border-t border-slate-700">
          <h4 className="text-sm font-medium text-slate-400 mb-3">Graph Statistics</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-800 rounded-lg p-3">
              <p className="text-2xl font-bold text-white">{currentGraph.nodeCount}</p>
              <p className="text-xs text-slate-400">Nodes</p>
            </div>
            <div className="bg-slate-800 rounded-lg p-3">
              <p className="text-2xl font-bold text-white">{currentGraph.edgeCount}</p>
              <p className="text-xs text-slate-400">Edges</p>
            </div>
            <div className="bg-slate-800 rounded-lg p-3">
              <p className="text-2xl font-bold text-white">{currentGraph.fileNodes.length}</p>
              <p className="text-xs text-slate-400">Files</p>
            </div>
            <div className="bg-slate-800 rounded-lg p-3">
              <p className="text-2xl font-bold text-white">{currentGraph.functionNodes.length}</p>
              <p className="text-xs text-slate-400">Functions</p>
            </div>
          </div>
        </div>
      )}
    </>
  )

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed bottom-4 right-4 z-30 p-3 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-colors"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Filter className="w-5 h-5" />}
      </button>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-80 border-l border-slate-700 bg-slate-800/30 overflow-y-auto">
        <div className="p-4">
          {sidebarContent}
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <>
          <div 
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="lg:hidden fixed right-0 top-0 h-full w-80 border-l border-slate-700 bg-slate-800 z-50 overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white">Graph Filters</h3>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {sidebarContent}
            </div>
          </div>
        </>
      )}
    </>
  )
}
