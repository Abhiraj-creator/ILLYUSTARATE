import { useState, useEffect } from 'react'
import {
  Loader2,
  BookOpen,
  FileCode,
  RefreshCw,
  Copy,
  Check,
  ChevronRight,
  AlertCircle,
  Sparkles,
  FolderOpen,
  Layers,
  Terminal,
  GitBranch,
  Zap,
} from 'lucide-react'
import type { Repository } from '@domain/entities/Repository'
import { AIService } from '@infrastructure/ai/AIService'
import { GitHubApi } from '@infrastructure/api/GitHubApi'
import { supabase } from '@infrastructure/storage/SupabaseClient'

interface DocumentationPanelProps {
  repository: Repository
}

interface ReadmeDocs {
  overview: string
  features: string[]
  architecture: string
  techStack: { name: string; purpose: string }[]
  gettingStarted: string
  fileStructure: string
  keyModules: { name: string; description: string }[]
  generatedAt: Date
}

const getAIService = () => {
  const env = (import.meta as any).env
  const provider = (env?.VITE_AI_PROVIDER || 'gemini').toLowerCase()
  const apiKeyString = env?.VITE_AI_API_KEY
  const model = env?.VITE_AI_MODEL

  if (!apiKeyString || apiKeyString === 'your-ai-api-key-here') return null

  const apiKeys = apiKeyString.split(',').map((k: string) => k.trim()).filter((k: string) => k.length > 0)
  if (apiKeys.length === 0) return null

  const validProviders = ['gemini', 'groq', 'openai']
  if (!validProviders.includes(provider)) return null

  return new AIService({
    provider: provider as any,
    apiKeys,
    model
  })
}

function buildReadmePrompt(repo: Repository, files: string[], readmeContent: string | null): string {
  return `You are an elite Staff Developer and technical writer. Your task is to analyze this GitHub repository and generate extremely comprehensive, high-quality, professional README documentation. Do not be lazy. Fill in all details thoroughly.

Repository: ${repo.fullName}
Description: ${repo.description || 'No description provided'}
Primary Language: ${repo.language || 'Unknown'}
Stars: ${repo.stars}

${readmeContent ? `Existing README content:\n${readmeContent.slice(0, 3000)}\n\n` : ''}

Generate documentation as a JSON object with EXACTLY this structure (no markdown code fences, pure JSON):
{
  "overview": "3-4 paragraphs of deep technical overview describing the vision, problem solved, and target audience.",
  "features": ["Deep dive feature 1", "Deep dive feature 2", "Deep dive feature 3"],
  "architecture": "A detailed multi-paragraph explanation of the system architecture, design patterns, data flow, and core design decisions.",
  "techStack": [{"name": "React", "purpose": "Details on how/why it is used in this specific project"}],
  "gettingStarted": "Detailed step-by-step instructions to clone, install, configure env, and run the project locally. Include exact shell commands on new lines.",
  "fileStructure": "A descriptive overview of the real directory structure and what each major folder does in the architecture.",
  "keyModules": [{"name": "ModuleName", "description": "Highly technical description of the module's responsibilities"}]
}

Base everything on the actual files, dependencies, and existing README. Generate robust, detailed documentation.
DO NOT return any conversational text like 'Here is your JSON'. Return ONLY the valid JSON object string.

File structure:
${files.slice(0, 80).join('\n')}`
}

export function DocumentationPanel({ repository }: DocumentationPanelProps) {
  const storageKey = `readme_docs_${repository.id}`

  const [docs, setDocs] = useState<ReadmeDocs | null>(() => {
    const saved = sessionStorage.getItem(storageKey)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        return { ...parsed, generatedAt: new Date(parsed.generatedAt) }
      } catch (e) { /* ignore */ }
    }
    return null
  })

  const [loading, setLoading] = useState(docs === null)
  const [error, setError] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<string>('overview')
  const [copied, setCopied] = useState(false)
  const [progress, setProgress] = useState('')

  useEffect(() => {
    if (!docs) {
      generateDocs()
    }
  }, [repository.id])

  const generateDocs = async () => {
    setLoading(true)
    setError(null)
    setProgress('Fetching repository files...')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = (session as any)?.provider_token

      if (!accessToken) {
        setError('GitHub access token not found. Please sign out and sign in again.')
        setLoading(false)
        return
      }

      const github = new GitHubApi(accessToken)

      const treeItems = await github.getRepoTree(repository.owner, repository.name)

      const IGNORED = ['node_modules', 'dist', 'build', '.git', '.next', 'vendor', '__pycache__']
      const cleanItems = treeItems.filter(item =>
        !IGNORED.some(seg => item.path.includes(seg)) &&
        !item.path.startsWith('.')
      )
      const filePaths = cleanItems.map(item => item.path)

      setProgress('Reading repository context & dependencies...')
      let readmeContent: string | null = null
      let dependenciesContent: string | null = null

      const readmeFile = cleanItems.find(item =>
        item.type === 'blob' && item.path.toLowerCase().match(/^readme\.(md|txt|rst)$/i)
      )
      if (readmeFile) {
        try { readmeContent = await github.getFileContent(repository.owner, repository.name, readmeFile.path) } catch (e) { }
      }

      const packageJsonFile = cleanItems.find(item => item.path === 'package.json')
      if (packageJsonFile) {
        try { dependenciesContent = await github.getFileContent(repository.owner, repository.name, packageJsonFile.path) } catch (e) { }
      } else {
        const reqFile = cleanItems.find(item => item.path === 'requirements.txt' || item.path === 'pom.xml' || item.path === 'go.mod' || item.path === 'Cargo.toml')
        if (reqFile) {
          try { dependenciesContent = await github.getFileContent(repository.owner, repository.name, reqFile.path) } catch (e) { }
        }
      }

      const aiService = getAIService()
      if (!aiService) {
        setError('AI service not configured. Please add your API key to the .env file (VITE_AI_API_KEY).')
        setLoading(false)
        return
      }

      setProgress('AI is generating documentation...')

      let prompt = buildReadmePrompt(repository, filePaths, readmeContent)
      if (dependenciesContent) {
        prompt += `\n\nProject Configuration / Dependencies:\n${dependenciesContent.slice(0, 3000)}`
      }

      const response = await aiService.chat({
        messages: [{
          id: `docs-${Date.now()}`,
          role: 'user',
          content: prompt,
          timestamp: new Date(),
        }]
      })

      let parsed: any = null
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/)
        const cleaned = jsonMatch ? jsonMatch[0] : response.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim()
        parsed = JSON.parse(cleaned)
      } catch (e) {
        console.warn('Failed to parse AI response as JSON:', response)
        parsed = {
          overview: "Notice: AI returned unstructured data instead of structured JSON. Raw output included below.\n\n" + response,
          features: ["Unable to explicitly parse features"],
          architecture: "Architecture details not available due to format mismatch.",
          techStack: [{ name: repository.language || 'Unknown', purpose: 'Primary language' }],
          gettingStarted: "Follow standard clone procedures.",
          fileStructure: "Structure not parsed.",
          keyModules: [],
        }
      }

      const result: ReadmeDocs = {
        overview: parsed.overview || '',
        features: Array.isArray(parsed.features) ? parsed.features : [],
        architecture: parsed.architecture || '',
        techStack: Array.isArray(parsed.techStack) ? parsed.techStack : [],
        gettingStarted: parsed.gettingStarted || '',
        fileStructure: parsed.fileStructure || '',
        keyModules: Array.isArray(parsed.keyModules) ? parsed.keyModules : [],
        generatedAt: new Date(),
      }

      setDocs(result)
      sessionStorage.setItem(storageKey, JSON.stringify(result))
    } catch (err: any) {
      console.error('Documentation generation failed:', err)
      setError(err?.message || 'Failed to generate documentation. Please try again.')
    } finally {
      setLoading(false)
      setProgress('')
    }
  }

  const handleCopyMarkdown = () => {
    if (!docs) return
    const md = buildMarkdown(docs, repository)
    navigator.clipboard.writeText(md)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const sections = [
    { id: 'overview', label: 'Overview', icon: BookOpen },
    { id: 'features', label: 'Features', icon: Zap },
    { id: 'architecture', label: 'Architecture', icon: Layers },
    { id: 'techstack', label: 'Tech Stack', icon: Terminal },
    { id: 'structure', label: 'Structure', icon: FolderOpen },
    { id: 'getting-started', label: 'Getting Started', icon: GitBranch },
    { id: 'modules', label: 'Key Modules', icon: FileCode },
  ]

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-6 bg-slate-950/30">
        <div className="relative">
          <div className="w-20 h-20 rounded-full border-2 border-indigo-500/20 flex items-center justify-center">
            <div className="w-14 h-14 rounded-full border-2 border-indigo-500/40 flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-indigo-400 animate-pulse" />
            </div>
          </div>
          <div className="absolute inset-0 rounded-full border-t-2 border-indigo-500 animate-spin" />
        </div>
        <div className="text-center">
          <p className="text-slate-300 font-semibold text-sm">Generating Documentation</p>
          <p className="text-slate-500 text-xs mt-1 font-mono">{progress || 'Analyzing repository...'}</p>
        </div>
        <div className="text-xs text-slate-600 max-w-xs text-center">
          Reading your files and leveraging AI to build a comprehensive README.
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 p-8">
        <AlertCircle className="w-12 h-12 text-red-500/70" />
        <div className="text-center max-w-md">
          <p className="text-white font-semibold mb-1">Documentation Error</p>
          <p className="text-slate-400 text-sm">{error}</p>
        </div>
        <button
          onClick={generateDocs}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    )
  }

  if (!docs) return null

  return (
    <div className="h-full flex flex-col lg:flex-row bg-[#191022]">
      {/* Documentation Navigation */}
      <div className="lg:w-52 flex-shrink-0 border-b lg:border-r border-slate-700/50 bg-slate-900/60 flex flex-col">
        <div className="p-4 border-b border-slate-700/50 hidden lg:block">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Docs</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1 font-mono truncate">{repository.fullName}</p>
        </div>

        <nav className="flex flex-row lg:flex-col p-2 gap-1 lg:gap-0.5 overflow-x-auto lg:overflow-y-auto custom-scrollbar scrollbar-hide">
          {sections.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`flex-shrink-0 lg:w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] sm:text-xs transition-all text-left ${activeSection === s.id
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent'
                }`}
            >
              <s.icon className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="whitespace-nowrap">{s.label}</span>
              {activeSection === s.id && <ChevronRight className="w-3 h-3 ml-auto opacity-60 hidden lg:block" />}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-700/50 space-y-2 hidden lg:block">
          <button
            onClick={handleCopyMarkdown}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700/50"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Copy as Markdown'}
          </button>
          <button
            onClick={() => {
              sessionStorage.removeItem(storageKey)
              generateDocs()
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs text-slate-500 hover:text-slate-300 rounded-lg transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Regenerate
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-3xl mx-auto p-4 sm:p-8">
          <div className="mb-6 lg:mb-8 pb-6 border-b border-slate-700/50">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                <GitBranch className="w-5 h-5 text-indigo-400" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-white font-mono truncate">{repository.displayName}</h1>
                <p className="text-[10px] sm:text-xs text-slate-500 font-mono truncate">{repository.fullName}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {repository.language && (
                <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-slate-800 border border-slate-700 rounded-md text-[10px] sm:text-xs text-slate-300 font-mono">
                  {repository.language}
                </span>
              )}
              <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-slate-800 border border-slate-700 rounded-md text-[10px] sm:text-xs text-slate-500 font-mono">
                ★ {repository.stars}
              </span>
              <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-emerald-600/10 border border-emerald-500/20 rounded-md text-[10px] sm:text-xs text-emerald-400 font-mono flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                AI
              </span>
            </div>
          </div>

          {activeSection === 'overview' && (
            <Section title="Project Overview" icon={BookOpen}>
              <p className="text-slate-300 leading-7 whitespace-pre-line">{docs.overview}</p>
            </Section>
          )}

          {activeSection === 'features' && (
            <Section title="Features" icon={Zap}>
              <ul className="space-y-3">
                {docs.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-[10px] text-indigo-400 font-bold">{i + 1}</span>
                    </div>
                    <p className="text-slate-300 text-sm leading-relaxed">{f}</p>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {activeSection === 'architecture' && (
            <Section title="Architecture" icon={Layers}>
              <div className="text-slate-300 leading-7 whitespace-pre-line">{docs.architecture}</div>
            </Section>
          )}

          {activeSection === 'techstack' && (
            <Section title="Tech Stack" icon={Terminal}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {docs.techStack.map((t, i) => (
                  <div key={i} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-teal-400 mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="text-white font-semibold text-sm font-mono">{t.name}</p>
                      <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">{t.purpose}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {activeSection === 'structure' && (
            <Section title="File Structure" icon={FolderOpen}>
              <div className="bg-slate-900 border border-slate-700/50 rounded-xl p-5">
                <p className="text-slate-300 text-sm leading-7 font-mono whitespace-pre-line">{docs.fileStructure}</p>
              </div>
            </Section>
          )}

          {activeSection === 'getting-started' && (
            <Section title="Getting Started" icon={GitBranch}>
              <div className="space-y-4">
                {docs.gettingStarted.split('\n').filter(l => l.trim()).map((line, i) => {
                  const isCode = line.trim().startsWith('\`\`\`') || line.includes('npm ') || line.includes('git ') || line.includes('yarn ') || line.includes('cd ') || line.includes('docker')
                  return isCode ? (
                    <div key={i} className="bg-slate-900 border border-slate-700/50 rounded-lg px-4 py-3 font-mono text-sm text-teal-300/90 overflow-x-auto">
                      {line.replace(/\`\`\`\w*/g, '').trim()}
                    </div>
                  ) : (
                    <p key={i} className="text-slate-300 text-sm leading-relaxed">{line}</p>
                  )
                })}
              </div>
            </Section>
          )}

          {activeSection === 'modules' && (
            <Section title="Key Modules" icon={FileCode}>
              <div className="space-y-3">
                {docs.keyModules.length > 0 ? docs.keyModules.map((m, i) => (
                  <div key={i} className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4">
                    <p className="text-indigo-300 font-mono text-sm font-semibold mb-1">{m.name}</p>
                    <p className="text-slate-400 text-sm leading-relaxed">{m.description}</p>
                  </div>
                )) : (
                  <p className="text-slate-500 text-sm">No key modules identified.</p>
                )}
              </div>
            </Section>
          )}
        </div>
      </div>
    </div>
  )
}

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2.5 mb-5">
        <Icon className="w-5 h-5 text-indigo-400" />
        <h2 className="text-lg font-bold text-white">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function buildMarkdown(docs: ReadmeDocs, repo: Repository): string {
  return `# ${repo.displayName}

${docs.overview}

## Features

${docs.features.map(f => `- ${f}`).join('\n')}

## Architecture

${docs.architecture}

## Tech Stack

${docs.techStack.map(t => `- **${t.name}**: ${t.purpose}`).join('\n')}

## Project Structure

${docs.fileStructure}

## Getting Started

${docs.gettingStarted}

## Key Modules

${docs.keyModules.map(m => `### ${m.name}\n${m.description}`).join('\n\n')}

---
*Documentation generated by ILLYUSTRATE at ${docs.generatedAt.toLocaleString()}*
`
}
