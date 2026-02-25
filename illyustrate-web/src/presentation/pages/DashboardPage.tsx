import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Plus, 
  Github, 
  Star, 
  Loader2, 
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock
} from 'lucide-react'
import { useAuthStore } from '@application/stores/AuthStore'
import { useRepositoryStore } from '@application/stores/RepositoryStore'
import { GitHubApi } from '@infrastructure/api/GitHubApi'
import { supabase } from '@infrastructure/storage/SupabaseClient'
import { Repository } from '@domain/entities/Repository'
import { PLAN_LIMITS } from '@shared/types'

export function DashboardPage() {
  const { user } = useAuthStore()
  const { 
    repositories, 
    fetchRepositories, 
    addRepository, 
    removeRepository,
    startAnalysis,
    getAnalysisJob
  } = useRepositoryStore()
  
  const [showAddModal, setShowAddModal] = useState(false)
  const [githubRepos, setGithubRepos] = useState<Repository[]>([])
  const [fetchingGithub, setFetchingGithub] = useState(false)
  const navigate = useNavigate()

  const planLimits = PLAN_LIMITS.free
  const repoCount = repositories.length
  const canAddMore = true // No limits on repositories

  useEffect(() => {
    if (user?.id) {
      fetchRepositories(user.id)
    }
  }, [user?.id, fetchRepositories])

  const handleAddRepository = async (repo: Repository) => {
    if (!user?.id) return
    
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newRepo = await addRepository({
        owner: repo.owner,
        name: repo.name,
        fullName: repo.fullName,
        description: repo.description,
        url: repo.url,
        language: repo.language,
        stars: repo.stars,
        isPrivate: repo.isPrivate,
        defaultBranch: repo.defaultBranch,
        size: repo.size,
        status: 'pending',
        userId: user.id,
      } as any, user.id)

      setShowAddModal(false)
      
      // Start analysis
      await startAnalysis(newRepo.id)
      
      // Navigate to the repository
      navigate(`/repo/${newRepo.owner}/${newRepo.name}`)
    } catch (error) {
      console.error('Failed to add repository:', error)
    }
  }

  const handleRemoveRepository = async (id: string) => {
    if (confirm('Are you sure you want to remove this repository?')) {
      await removeRepository(id)
    }
  }

  const fetchGitHubRepos = async () => {
    setFetchingGithub(true)
    
    try {
      // Get the current session to retrieve the GitHub access token
      const { data: { session } } = await supabase.auth.getSession()
      
      // Get the provider token (GitHub access token) from the session
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const accessToken = (session as any)?.provider_token
      
      if (!accessToken) {
        console.error('No GitHub access token found. Please sign in again.')
        alert('GitHub authentication required. Please sign out and sign in again.')
        setFetchingGithub(false)
        return
      }

      // Create GitHub API client and fetch repos
      const github = new GitHubApi(accessToken)
      const repos = await github.getUserRepos()
      
      // Convert GitHub repos to our Repository format
      const convertedRepos = repos.map(repo => new Repository({
        id: `github-${repo.id}`,
        owner: repo.owner.login,
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description || undefined,
        url: repo.html_url,
        language: repo.language || undefined,
        stars: repo.stargazers_count,
        isPrivate: repo.private,
        defaultBranch: repo.default_branch,
        size: repo.size,
        status: 'pending',
        userId: user?.id || '',
      }))
      
      setGithubRepos(convertedRepos)
    } catch (error) {
      console.error('Failed to fetch GitHub repos:', error)
      alert('Failed to fetch repositories. Please check your GitHub connection.')
    } finally {
      setFetchingGithub(false)
    }
  }

  const getStatusIcon = (repo: Repository) => {
    const job = getAnalysisJob(repo.id)
    
    if (repo.isAnalyzed) {
      return <CheckCircle2 className="w-5 h-5 text-emerald-500" />
    }
    if (repo.isAnalyzing || job?.status === 'processing') {
      return <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
    }
    if (repo.hasFailed) {
      return <AlertCircle className="w-5 h-5 text-red-500" />
    }
    return <Clock className="w-5 h-5 text-slate-500" />
  }

  const getStatusText = (repo: Repository) => {
    const job = getAnalysisJob(repo.id)
    
    if (repo.isAnalyzed) return 'Analyzed'
    if (repo.isAnalyzing) return job?.stage ? `Analyzing: ${job.stage}` : 'Analyzing...'
    if (repo.hasFailed) return 'Failed'
    return 'Pending'
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 mt-1 text-sm sm:text-base">
            {repoCount} repositories
          </p>
        </div>
        
        <button
          onClick={() => setShowAddModal(true)}
          disabled={!canAddMore}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
        >
          <Plus className="w-5 h-5" />
          Add Repository
        </button>
      </div>

      {/* Repositories Grid */}
      {repositories.length === 0 ? (
        <div className="card p-12 text-center">
          <Github className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No repositories yet</h3>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">
            Connect a GitHub repository to start visualizing your codebase and generating documentation.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary"
          >
            <Plus className="w-5 h-5" />
            Add Your First Repository
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {repositories.map((repo) => (
            <div 
              key={repo.id} 
              className="card hover:border-indigo-500/50 transition-colors cursor-pointer group"
              onClick={() => navigate(`/repo/${repo.owner}/${repo.name}`)}
            >
              <div className="card-header flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Github className="w-8 h-8 text-slate-400" />
                  <div>
                    <h3 className="font-semibold text-white group-hover:text-indigo-400 transition-colors">
                      {repo.displayName}
                    </h3>
                    <p className="text-sm text-slate-400">{repo.language || 'Unknown'}</p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRemoveRepository(repo.id)
                  }}
                  className="p-2 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              
              <div className="card-body">
                <p className="text-sm text-slate-400 line-clamp-2 mb-4">
                  {repo.description || 'No description'}
                </p>
                
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1 text-slate-400">
                      <Star className="w-4 h-4" />
                      {repo.stars.toLocaleString()}
                    </span>
                    <span className="text-slate-400">
                      {repo.sizeInMB.toFixed(1)} MB
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {getStatusIcon(repo)}
                    <span className={`text-sm ${
                      repo.isAnalyzed ? 'text-emerald-500' : 
                      repo.isAnalyzing ? 'text-indigo-500' :
                      repo.hasFailed ? 'text-red-500' : 'text-slate-500'
                    }`}>
                      {getStatusText(repo)}
                    </span>
                  </div>
                </div>

                {/* Progress bar for analyzing repos */}
                {repo.isAnalyzing && (
                  <div className="mt-4">
                    <div className="progress-bar">
                      <div 
                        className="progress-bar-fill" 
                        style={{ width: `${getAnalysisJob(repo.id)?.progress || 0}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Repository Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Add Repository</h2>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ×
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {githubRepos.length === 0 ? (
                <div className="text-center py-8">
                  <button
                    onClick={fetchGitHubRepos}
                    disabled={fetchingGithub}
                    className="btn btn-primary"
                  >
                    {fetchingGithub ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Fetching...
                      </>
                    ) : (
                      <>
                        <Github className="w-5 h-5" />
                        Load GitHub Repositories
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {githubRepos.map((repo) => (
                    <div 
                      key={repo.id}
                      className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Github className="w-5 h-5 text-slate-400" />
                        <div>
                          <p className="font-medium text-white">{repo.fullName}</p>
                          <p className="text-sm text-slate-400">{repo.description}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleAddRepository(repo)}
                        className="btn btn-primary text-sm"
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
