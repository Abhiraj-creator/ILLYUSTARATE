import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Loader2,
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
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<Tab>('graph')
  const [mountedTabs, setMountedTabs] = useState<Set<Tab>>(new Set(['graph']))

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
      const { data: { session } } = await supabase.auth.getSession()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const accessToken = (session as any)?.provider_token

      if (!accessToken) {
        alert('GitHub access token not found. Please sign out and sign in again.')
        return
      }

      updateRepositoryStatus(repo.id, 'analyzing')
      await generateGraph(repo.id, owner, name, accessToken)
      updateRepositoryStatus(repo.id, 'completed')

    } catch (error) {
      console.error('Failed to analyze repository:', error)
      updateRepositoryStatus(repo.id, 'failed')
      alert('Failed to analyze repository. Please try again.')
    }
  }

  const handleTabChange = (tab: Tab) => {
    setMountedTabs(prev => new Set([...prev, tab]))
    setActiveTab(tab)
  }

  const tabs = [
    { id: 'graph' as Tab, label: 'Visual Graph', icon: 'account_tree' },
    { id: 'files' as Tab, label: 'Code Explorer', icon: 'folder_open' },
    { id: 'docs' as Tab, label: 'Documentation', icon: 'description' },
    { id: 'chat' as Tab, label: 'Neural Chat', icon: 'forum' },
  ]

  if (!repo) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#191022]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
          <p className="text-slate-400 font-serif italic text-lg">Initializing Workspace...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#191022] font-display text-slate-100 relative selection:bg-primary selection:text-white">

      {/* Main Viewport */}
      <div className={`flex-1 flex flex-col h-full relative z-10 w-full transition-all duration-300 ${activeTab === 'graph' ? 'lg:pr-80' : ''}`}>

        {/* Navbar (Sticky) */}
        <header className="h-16 glass-navbar border-b border-[#5e2d52] flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-8 z-40 relative">

          {/* Breadcrumbs */}
          <div className="flex items-center gap-3 py-2 sm:py-0">
            <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors cursor-pointer group shrink-0">
              <span className="material-symbols-outlined text-lg transition-transform group-hover:-translate-x-1">arrow_back</span>
            </button>
            <div className="h-4 w-px bg-slate-700 mx-1"></div>
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="material-symbols-outlined text-[#C084FC] text-lg shrink-0">code_blocks</span>
              <div className="font-serif italic text-milk text-lg truncate flex-1 min-w-0 flex space-x-1.5 items-baseline">
                <span className="opacity-60">{owner}</span>
                <span className="opacity-40 text-sm">/</span>
                <span className="font-bold">{name}</span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar sm:-mb-0 -mb-2 pb-2 sm:pb-0 h-full">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`h-full flex items-center gap-2 px-4 border-b-2 text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${activeTab === tab.id
                  ? 'border-primary text-primary bg-primary/10'
                  : 'border-transparent text-slate-400 hover:text-milk hover:bg-white/5'
                  }`}
              >
                <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Analyze Status Area */}
          <div className="flex items-center gap-4">
            {!repo.isAnalyzed && !repo.isAnalyzing && (
              <button
                onClick={handleAnalyze}
                disabled={isLoading}
                className="bg-primary hover:bg-primary/90 text-white px-4 h-8 rounded-full text-xs font-bold tracking-tight shadow-lg shadow-primary/20 flex items-center gap-2 transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="material-symbols-outlined text-[16px]">sync</span>}
                RUN ANALYSIS
              </button>
            )}
            {repo.isAnalyzing && (
              <span className="text-primary text-xs font-mono font-bold flex items-center gap-2 px-6">
                <Loader2 className="w-4 h-4 animate-spin" /> ANALYZING...
              </span>
            )}
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 relative w-full h-full overflow-hidden">

          {/* Graph Tab */}
          <div className={`absolute inset-0 h-full ${activeTab === 'graph' ? 'block' : 'hidden'}`}>
            <div className="absolute inset-0 bg-[#1e0a1b] bg-[radial-gradient(#2a1127_1px,transparent_1px)] [background-size:20px_20px] flex items-center justify-center overflow-hidden">
              {repo.isAnalyzed ? (
                <div id="cy-wrapper" className="absolute inset-0 w-full h-full">
                  <GraphViewer graph={currentGraph} isLoading={isLoading} />
                </div>
              ) : (
                <div className="text-center z-10 max-w-sm px-4">
                  <div className="size-20 mx-auto rounded-2xl bg-[#191022] border border-[#5e2d52] flex items-center justify-center mb-6 shadow-2xl">
                    <span className="material-symbols-outlined text-4xl text-slate-400">account_tree</span>
                  </div>
                  <h2 className="text-2xl font-serif text-milk mb-3">Graph Not Rendered</h2>
                  <p className="text-slate-400 text-sm mb-8">Initiate the analysis sequence to construct a spatial representation of this codebase.</p>
                  <button
                    onClick={handleAnalyze}
                    disabled={isLoading}
                    className="bg-gradient-to-r from-[#7B4FA6] to-[#C084FC] text-white px-8 h-12 rounded-full text-sm font-bold shadow-xl shadow-[#7B4FA6]/20 transition-transform hover:scale-105 active:scale-95 flex items-center gap-2 mx-auto cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span className="material-symbols-outlined text-[18px]">play_arrow</span>}
                    INITIALIZE ANALYSIS
                  </button>
                </div>
              )}
              {repo.isAnalyzed && currentGraph && (
                <div className="absolute top-6 left-6 z-10 hidden sm:flex gap-2">
                  <button className="h-10 px-4 bg-[#191022]/80 backdrop-blur-md border border-[#5e2d52] rounded-full text-slate-300 hover:text-milk text-sm font-medium flex items-center gap-2 cursor-pointer transition-colors shadow-lg">
                    <span className="material-symbols-outlined text-[18px]">zoom_in</span>
                  </button>
                  <button className="h-10 px-4 bg-[#191022]/80 backdrop-blur-md border border-[#5e2d52] rounded-full text-slate-300 hover:text-milk text-sm font-medium flex items-center gap-2 cursor-pointer transition-colors shadow-lg">
                    <span className="material-symbols-outlined text-[18px]">zoom_out</span>
                  </button>
                  <button className="h-10 px-4 bg-[#191022]/80 backdrop-blur-md border border-[#5e2d52] rounded-full text-slate-300 hover:text-milk text-sm font-medium flex items-center gap-2 cursor-pointer transition-colors shadow-lg">
                    <span className="material-symbols-outlined text-[18px]">center_focus_strong</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Files Tab */}
          {mountedTabs.has('files') && (
            <div className={`absolute inset-0 h-full ${activeTab === 'files' ? 'block' : 'hidden'}`}>
              <FileExplorer repository={repo} />
            </div>
          )}

          {/* Docs Tab */}
          {mountedTabs.has('docs') && (
            <div className={`absolute inset-0 h-full ${activeTab === 'docs' ? 'block' : 'hidden'}`}>
              <DocumentationPanel repository={repo} />
            </div>
          )}

          {/* Chat Tab */}
          {mountedTabs.has('chat') && (
            <div className={`absolute inset-0 h-full ${activeTab === 'chat' ? 'block' : 'hidden'}`}>
              <AIChat repository={repo} />
            </div>
          )}
        </main>
      </div>

      {/* Right Sidebar (Specific to Graph View) */}
      {activeTab === 'graph' && <GraphSidebar currentGraph={currentGraph} />}
    </div>
  )
}

interface GraphSidebarProps {
  currentGraph: CodeGraph | null
}

function GraphSidebar({ currentGraph }: GraphSidebarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { visibleNodeTypes, toggleNodeType, setSearchQuery } = useGraphStore()

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#191022] w-full">
      <div className="mb-8">
        <h3 className="font-serif italic text-xl text-milk mb-6">Display Filters</h3>
        <div className="relative mb-6">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-primary text-sm font-bold">search</span>
          <input
            type="text"
            className="w-full bg-[#2a1127] border border-[#5e2d52] rounded-xl py-2.5 pl-11 pr-4 text-sm text-milk placeholder:text-slate-600 focus:outline-none focus:border-primary/50 transition-all font-mono"
            placeholder="Query node..."
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="space-y-3">
          {[
            { id: 'file', label: 'File References', icon: 'description', color: 'text-emerald-400' },
            { id: 'folder', label: 'Directory Structures', icon: 'folder', color: 'text-indigo-400' },
            { id: 'function', label: 'Function Calls', icon: 'data_object', color: 'text-primary' },
            { id: 'class', label: 'Object Classes', icon: 'category', color: 'text-rose-400' }
          ].map(type => (
            <label key={type.id} className="flex items-center justify-between p-3 bg-[#2a1127]/50 border border-[#5e2d52] rounded-xl cursor-pointer hover:border-primary/50 transition-colors group">
              <div className="flex items-center gap-3">
                <span className={`material-symbols-outlined text-[20px] ${type.color}`}>{type.icon}</span>
                <span className="text-sm text-slate-300 font-medium group-hover:text-milk transition-colors">{type.label}</span>
              </div>
              <div className="relative inline-flex items-center">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={visibleNodeTypes.has(type.id as any)}
                  onChange={() => toggleNodeType(type.id as any)}
                />
                <div className="w-9 h-5 bg-[#4a2040] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {currentGraph && (
        <div className="mt-auto">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-sm text-slate-500">analytics</span>
            <h4 className="text-xs font-mono uppercase tracking-widest text-slate-500">Topology Stats</h4>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#2a1127]/50 border border-[#5e2d52] rounded-xl p-4 flex flex-col justify-center">
              <span className="text-3xl font-serif text-milk italic leading-none mb-1">{currentGraph.nodeCount.toLocaleString()}</span>
              <span className="text-[10px] font-mono uppercase text-slate-500 tracking-wider">Total Nodes</span>
            </div>
            <div className="bg-[#2a1127]/50 border border-[#5e2d52] rounded-xl p-4 flex flex-col justify-center">
              <span className="text-3xl font-serif text-primary italic leading-none mb-1">{currentGraph.edgeCount.toLocaleString()}</span>
              <span className="text-[10px] font-mono uppercase text-primary/60 tracking-wider">Active Edges</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed bottom-6 right-6 z-50 size-14 flex items-center justify-center bg-primary text-white rounded-full shadow-2xl shadow-primary/40 cursor-pointer"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Filter className="w-6 h-6" />}
      </button>

      {/* Desktop Sidebar */}
      <aside className="w-80 border-l border-[#5e2d52] flex flex-col pt-6 px-6 fixed right-0 top-16 bottom-0 bg-[#191022] z-30 hidden lg:flex">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setIsOpen(false)}>
          <div
            className="absolute right-0 top-0 bottom-0 w-80 max-w-[80vw] bg-[#191022] border-l border-[#5e2d52] p-6 flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  )
}
