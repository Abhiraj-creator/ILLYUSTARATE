import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, Variants } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '@application/stores/AuthStore'
import { useRepositoryStore } from '@application/stores/RepositoryStore'
import { supabase } from '@infrastructure/storage/SupabaseClient'
import { Repository } from '@domain/entities/Repository'

export function DashboardPage() {
  const { user, session, signOut, updateProfile, signInWithGitHub } = useAuthStore()
  const {
    repositories,
    fetchRepositories,
    fetchGitHubRepos: storeFetchGitHubRepos,
    isFetchingGitHub,
    addRepository,
    removeRepository,
    startAnalysis,
    getAnalysisJob
  } = useRepositoryStore()

  const [showAddModal, setShowAddModal] = useState(false)
  const [githubRepos, setGithubRepos] = useState<Repository[]>([])
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false)
  const [showGitHubPromo, setShowGitHubPromo] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    // Show promo if user is logged in via email
    if (session?.user?.app_metadata?.provider === 'email' || !((session as any)?.provider_token)) {
      setShowGitHubPromo(true)
    } else {
      setShowGitHubPromo(false)
    }
  }, [session])

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

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUpdatingAvatar(true)
    try {
      // In a real app, you'd upload this to a storage bucket
      // For this demo, we'll use a local data URL
      const reader = new FileReader()
      reader.onload = async (event) => {
        const result = event.target?.result as string
        if (result) {
          await updateProfile({ avatarUrl: result })
        }
        setIsUpdatingAvatar(false)
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error('Failed to update avatar:', error)
      setIsUpdatingAvatar(false)
    }
  }

  const handleRemoveRepository = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation()
    if (confirm(`Are you sure you want to disconnect ${name} from your workspace? All analysis data for this repository will be lost.`)) {
      try {
        await removeRepository(id)
      } catch (error) {
        console.error('Failed to remove repository:', error)
      }
    }
  }

  const fetchGitHubRepos = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()

      // Attempt to find provider_token (only available on fresh login in session)
      const accessToken = (session as any)?.provider_token

      if (!accessToken) {
        // Most common cause of "stuck" feeling - missing token after refresh
        console.warn('GitHub access token not found in session.')
        alert('Your GitHub session has expired or requires re-authentication. Please sign out and sign in with GitHub again to refresh your repository list.')
        return
      }

      const repos = await storeFetchGitHubRepos(accessToken)
      setGithubRepos(repos)
    } catch (err) {
      console.error('Failed to trigger repository sync:', err)
      alert('Sync failed. Please ensure you are logged in with GitHub correctly.')
    }
  }

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.1 }
    }
  }

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
  }

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 antialiased selection:bg-primary selection:text-white relative">
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar - Desktop and Mobile */}
      <aside className={`fixed lg:static inset-y-0 left-0 w-64 lg:w-20 bg-plum-deep flex flex-col items-center py-8 border-r border-[#5e2d52] h-full shrink-0 z-[70] transition-transform duration-300 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="mb-10 w-full flex flex-col items-center px-6">
          <div className="size-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20 mb-4 lg:mb-0">
            <span className="material-symbols-outlined">auto_awesome</span>
          </div>
          <span className="lg:hidden text-milk font-serif italic text-xl ml-3">ILLYUSTRATE</span>
        </div>

        <nav className="flex flex-col gap-4 lg:gap-6 flex-1 w-full px-4 lg:px-0">
          <div className="relative group w-full flex justify-center">
            <div className="hidden lg:block absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full"></div>
            <button onClick={() => { navigate('/dashboard'); setIsMobileMenuOpen(false); }} className="w-full lg:size-12 h-12 rounded-xl bg-[#4a2040] text-primary flex items-center lg:justify-center gap-3 px-4 lg:px-0 transition-colors cursor-pointer" title="Dashboard">
              <span className="material-symbols-outlined font-light">dashboard</span>
              <span className="lg:hidden text-sm font-medium">Dashboard</span>
            </button>
          </div>
          <button onClick={() => { navigate('/settings'); setIsMobileMenuOpen(false); }} className="w-full lg:size-12 h-12 rounded-xl text-slate-400 hover:bg-[#4a2040]/50 hover:text-slate-100 flex items-center lg:justify-center gap-3 px-4 lg:px-0 transition-all cursor-pointer" title="Analysis Stats">
            <span className="material-symbols-outlined font-light">analytics</span>
            <span className="lg:hidden text-sm font-medium">Analytics</span>
          </button>
          <button onClick={() => { navigate('/settings'); setIsMobileMenuOpen(false); }} className="w-full lg:size-12 h-12 rounded-xl text-slate-400 hover:bg-[#4a2040]/50 hover:text-slate-100 flex items-center lg:justify-center gap-3 px-4 lg:px-0 transition-all cursor-pointer" title="Settings">
            <span className="material-symbols-outlined font-light">settings</span>
            <span className="lg:hidden text-sm font-medium">Settings</span>
          </button>
        </nav>

        <div className="mt-auto w-full px-4 lg:px-0 flex flex-col items-center gap-4">
          <button onClick={() => signOut()} className="lg:hidden w-full flex items-center gap-3 px-4 h-12 rounded-xl text-red-100 bg-red-500/10 hover:bg-red-500/20 transition-colors">
            <span className="material-symbols-outlined">logout</span>
            <span className="text-sm font-medium">Sign Out</span>
          </button>
          <div className="w-full flex justify-center py-4 lg:py-0">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleAvatarChange}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUpdatingAvatar}
              className={`size-10 rounded-full bg-[#4a2040] border border-[#5e2d52] overflow-hidden p-0.5 hover:scale-110 transition-transform cursor-pointer relative group ${isUpdatingAvatar ? 'opacity-50' : ''}`}
              title="Update Profile Picture"
            >
              {user?.avatarUrl ? (
                <div className="w-full h-full rounded-full bg-cover bg-center" style={{ backgroundImage: `url('${user.avatarUrl}')` }}></div>
              ) : (
                <div className="w-full h-full rounded-full bg-indigo-600 flex items-center justify-center text-sm font-medium text-white">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="material-symbols-outlined text-white text-xs">edit</span>
              </div>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full relative overflow-hidden">
        {/* Slim Top Navbar */}
        <header className="h-16 glass-navbar border-b border-[#5e2d52] flex items-center justify-between px-4 sm:px-8 sticky top-0 z-40">
          <div className="flex items-center gap-2 lg:gap-4 flex-1">
            <button
              className="lg:hidden p-2 text-slate-400 hover:text-milk transition-colors mr-1 shrink-0"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <span className="material-symbols-outlined text-2xl">menu</span>
            </button>
            <div className="relative w-full max-w-[200px] sm:max-w-md group">
              <span className="material-symbols-outlined absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
              <input
                className="w-full bg-[#2a1127]/50 border-none outline-none rounded-full py-2 pl-10 sm:pl-12 pr-4 text-xs sm:text-sm text-slate-200 focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-slate-500 font-mono transition-shadow h-9 sm:h-10"
                placeholder="Search..."
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setShowSearchSuggestions(e.target.value.length > 0)
                }}
                onFocus={() => {
                  if (searchQuery.length > 0) setShowSearchSuggestions(true)
                }}
                onBlur={() => {
                  setTimeout(() => setShowSearchSuggestions(false), 200)
                }}
              />

              <AnimatePresence>
                {showSearchSuggestions && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-12 left-0 w-[280px] sm:w-full bg-[#191022] border border-[#5e2d52] rounded-2xl shadow-2xl z-50 overflow-hidden py-2"
                  >
                    {repositories.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase())).length > 0 ? (
                      repositories
                        .filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()))
                        .slice(0, 5)
                        .map(repo => (
                          <button
                            key={repo.id}
                            onClick={() => navigate(`/repo/${repo.owner}/${repo.name}`)}
                            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-[#4a2040]/30 transition-colors text-left group"
                          >
                            <span className="material-symbols-outlined text-primary text-sm">code_blocks</span>
                            <div>
                              <p className="text-milk text-sm font-medium group-hover:text-primary transition-colors">{repo.name}</p>
                              <p className="text-slate-500 text-xs">{repo.owner}</p>
                            </div>
                          </button>
                        ))
                    ) : (
                      <div className="px-4 py-4 text-center">
                        <p className="text-slate-500 text-sm italic">No matching repositories</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-6">
            <div className="relative">
              <div
                onClick={() => setShowNotifications(!showNotifications)}
                className={`flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-full border transition-all cursor-pointer ${showNotifications ? 'bg-primary/20 border-primary/40 text-milk shadow-lg shadow-primary/10' : 'text-slate-400 border-transparent hover:text-white hover:bg-white/5'}`}
              >
                <span className="material-symbols-outlined text-xl">notifications</span>
                {showNotifications && <span className="absolute top-1 right-2 size-2 bg-primary rounded-full animate-pulse"></span>}
              </div>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-12 right-0 w-72 sm:w-80 bg-[#191022] border border-[#5e2d52] rounded-2xl shadow-2xl z-50 overflow-hidden"
                  >
                    <div className="px-5 py-4 border-b border-[#5e2d52] bg-[#2a1127]/30">
                      <h3 className="text-milk font-serif italic text-lg">System Telemetry</h3>
                    </div>
                    <div className="p-8 text-center bg-gradient-to-b from-transparent to-[#2a1127]/20">
                      <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 border border-primary/20">
                        <span className="material-symbols-outlined text-primary text-2xl">done_all</span>
                      </div>
                      <p className="text-milk text-sm mb-1">Ecosystem Stable</p>
                      <p className="text-slate-500 text-xs">No active alerts at this cycle.</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="bg-primary hover:bg-primary/90 text-white px-3 sm:px-5 h-9 sm:h-10 rounded-full text-xs sm:text-sm font-bold tracking-tight transition-transform active:scale-95 shadow-lg shadow-primary/20 flex items-center gap-2 cursor-pointer shrink-0"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              <span className="hidden xs:inline">Add Repo</span>
            </button>
            <div className="h-6 w-px bg-slate-700 hidden md:block"></div>
            <button onClick={() => signOut()} className="hidden md:flex items-center gap-2 px-2 text-sm text-slate-400 hover:text-white transition-colors cursor-pointer">
              <span className="material-symbols-outlined text-[20px]">logout</span>
            </button>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto custom-scrollbar p-8 lg:p-12 relative z-0">
          <motion.div initial="hidden" animate="visible" variants={containerVariants} className="max-w-7xl mx-auto">

            <AnimatePresence>
              {showGitHubPromo && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -20 }}
                  className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-primary/20 via-[#C084FC]/10 to-transparent border border-primary/30 relative overflow-hidden group"
                >
                  <div className="absolute -right-12 -top-12 size-48 bg-primary/10 blur-[60px] rounded-full group-hover:bg-primary/20 transition-all"></div>
                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-start gap-4">
                      <div className="size-12 rounded-xl bg-background-dark flex items-center justify-center shrink-0 shadow-lg border border-[#5e2d52]">
                        <svg className="w-6 h-6 fill-milk" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.041-1.412-4.041-1.412-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"></path></svg>
                      </div>
                      <div>
                        <h4 className="text-milk text-lg font-serif">Unlock Global Insight with GitHub</h4>
                        <p className="text-slate-400 text-sm max-w-lg">Connect your GitHub account to directly analyze your repositories, track dependencies, and visualize neural code paths across your entire portfolio.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setShowGitHubPromo(false)}
                        className="px-6 py-2.5 rounded-full text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
                      >
                        MAYBE LATER
                      </button>
                      <button
                        onClick={() => signInWithGitHub()}
                        className="bg-[#C084FC] hover:bg-white text-background-dark px-8 py-2.5 rounded-full text-xs font-bold shadow-xl shadow-primary/20 transition-all flex items-center gap-2 cursor-pointer"
                      >
                        CONNECT GITHUB
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex flex-col gap-2 mb-12">
              <motion.h1 variants={itemVariants} className="font-serif text-5xl lg:text-6xl text-slate-900 dark:text-milk italic tracking-tight">Dashboard</motion.h1>
              <motion.p variants={itemVariants} className="text-slate-500 font-display text-sm tracking-wider uppercase">Your curated creative ecosystem</motion.p>
            </div>

            {repositories.length === 0 ? (
              <motion.div variants={itemVariants} className="col-span-1 md:col-span-2 lg:col-span-3 min-h-[40vh] border border-dashed border-[#5e2d52] bg-[#4a2040]/10 rounded-2xl flex flex-col items-center justify-center gap-6 p-8 relative overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/10 blur-[100px] rounded-full pointer-events-none"></div>
                <div className="size-16 bg-[#2a1127] border border-[#5e2d52] rounded-2xl flex items-center justify-center text-slate-400 z-10">
                  <span className="material-symbols-outlined text-3xl">account_tree</span>
                </div>
                <div className="text-center z-10">
                  <h3 className="text-xl font-serif text-milk mb-2">No active repositories</h3>
                  <p className="text-slate-400 max-w-sm mb-6">Initialize a new creative synapse by connecting a GitHub repository to ILLYUSTRATE.</p>
                  <button onClick={() => setShowAddModal(true)} className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-full text-sm font-bold tracking-tight shadow-lg shadow-primary/20 flex items-center gap-2 mx-auto transition-transform hover:scale-105 active:scale-95 cursor-pointer">
                    <span className="material-symbols-outlined text-sm">add</span>
                    Connect Workspace
                  </button>
                </div>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {repositories.map((repo, idx) => (
                  <motion.div
                    key={repo.id}
                    variants={itemVariants}
                    className={`${idx === 0 ? 'md:col-span-2 min-h-[320px] pb-6' : 'min-h-[220px]'} bg-[#4a2040] border border-[#5e2d52] rounded-2xl p-6 lg:p-8 flex flex-col justify-between relative overflow-hidden group cursor-pointer hover:border-primary/50 transition-all`}
                    onClick={() => navigate(`/repo/${repo.owner}/${repo.name}`)}
                  >
                    {idx === 0 && <div className="absolute -right-12 -top-12 size-64 bg-primary/20 blur-[100px] rounded-full group-hover:bg-primary/30 transition-all pointer-events-none"></div>}
                    <div className="relative z-10">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="size-10 rounded-lg bg-background-dark flex items-center justify-center">
                          <svg className="w-5 h-5 fill-milk" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.041-1.412-4.041-1.412-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"></path></svg>
                        </div>
                        <span className={`font-mono text-[10px] leading-tight px-2 py-1 rounded bg-black/20 ${repo.isAnalyzed ? 'text-emerald-400' : repo.isAnalyzing ? 'text-indigo-400' : repo.hasFailed ? 'text-red-400' : 'text-primary'}`}>
                          {repo.isAnalyzed ? 'ANALYZED' : repo.isAnalyzing ? 'ANALYZING' : repo.hasFailed ? 'FAILED' : 'PENDING'}
                        </span>
                        <button
                          onClick={(e) => handleRemoveRepository(e, repo.id, repo.name)}
                          className="ml-auto size-8 rounded-full flex items-center justify-center hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors"
                          title="Disconnect Repository"
                        >
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      </div>
                      <h2 className={`${idx === 0 ? 'text-3xl' : 'text-xl'} font-serif text-milk mb-2 truncate`}>{repo.name}</h2>
                      <p className="text-slate-400 text-sm max-w-sm line-clamp-2">{repo.description || "No creative statement provided."}</p>
                    </div>

                    <div className={`relative z-10 flex ${idx === 0 ? 'flex-col sm:flex-row sm:items-center sm:justify-between mt-8 pt-6 border-t border-[#5e2d52]/50' : 'items-end justify-between mt-6'} `}>
                      <div className="flex items-center gap-4 font-mono text-[10px] text-slate-400 mb-4 sm:mb-0">
                        <div className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">star</span>
                          <span>{repo.stars.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">code</span>
                          <span>{repo.language || 'Mixed'}</span>
                        </div>
                      </div>

                      {idx === 0 && (
                        <div className="text-milk group-hover:text-primary transition-colors flex items-center gap-1 text-xs sm:text-sm font-medium">
                          View Protocol <span className="material-symbols-outlined text-[16px] transition-transform group-hover:translate-x-1 group-hover:-translate-y-1">arrow_outward</span>
                        </div>
                      )}
                    </div>

                    {repo.isAnalyzing && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#2a1127]">
                        <motion.div className="h-full bg-primary" initial={{ width: 0 }} animate={{ width: `${getAnalysisJob(repo.id)?.progress || 0}%` }} transition={{ duration: 0.5 }} />
                      </div>
                    )}
                  </motion.div>
                ))}

                {/* Quick actions row content removed as per user request */}
              </div>
            )}
          </motion.div>
        </main>
      </div>

      {/* Add Repository Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-[#191022] border border-[#5e2d52] rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-[#2a1127] flex items-center justify-between bg-[#2a1127]/30">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">add_circle</span>
                  <h2 className="text-xl font-serif text-milk">Add Repository to Grid</h2>
                </div>
                <motion.button whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }} onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white cursor-pointer size-8 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </motion.button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[60vh] custom-scrollbar">
                {githubRepos.length === 0 ? (
                  <div className="text-center py-12 flex flex-col items-center">
                    <div className="size-16 bg-[#2a1127] border border-[#5e2d52] rounded-full flex items-center justify-center text-slate-400 mb-6">
                      <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.041-1.412-4.041-1.412-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"></path></svg>
                    </div>
                    <motion.button
                      onClick={fetchGitHubRepos}
                      disabled={isFetchingGitHub}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="bg-[#C084FC] hover:bg-[#A855F7] text-[#191022] font-bold px-8 py-3 rounded-full transition-all shadow-lg flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-50"
                    >
                      {isFetchingGitHub ? (
                        <><Loader2 className="w-5 h-5 animate-spin text-[#191022]" /> ANALYZING GITHUB DATA...</>
                      ) : (
                        <><span className="material-symbols-outlined text-xl group-hover:rotate-12 transition-transform">cloud_sync</span> LOAD GITHUB REPOSITORIES</>
                      )}
                    </motion.button>
                  </div>
                ) : (
                  <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-3">
                    {githubRepos.map((repo) => {
                      const isAdded = repositories.some(r => r.fullName === repo.fullName);
                      return (
                        <motion.div
                          key={repo.id}
                          variants={itemVariants}
                          className={`flex items-center justify-between p-4 bg-[#2a1127] border ${isAdded ? 'border-primary' : 'border-[#5e2d52]'} rounded-xl transition-colors hover:border-primary group`}
                        >
                          <div className="flex items-center gap-4">
                            <div className="size-10 rounded-lg bg-[#4a2040] flex items-center justify-center relative overflow-hidden">
                              {isAdded && <div className="absolute inset-0 bg-primary/20"></div>}
                              <svg className={`w-5 h-5 ${isAdded ? 'fill-primary' : 'fill-slate-400'}`} viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.041-1.412-4.041-1.412-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"></path></svg>
                            </div>
                            <div>
                              <p className="font-serif text-milk text-lg">
                                {repo.name}
                                {repo.isPrivate && <span className="ml-2 inline-block material-symbols-outlined text-[12px] text-slate-500">lock</span>}
                              </p>
                              <p className="text-xs font-mono text-slate-400">{repo.owner} • {repo.stars} stars</p>
                            </div>
                          </div>
                          <motion.button
                            onClick={() => handleAddRepository(repo)}
                            disabled={isAdded}
                            whileHover={isAdded ? {} : { scale: 1.05 }}
                            whileTap={isAdded ? {} : { scale: 0.95 }}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer disabled:cursor-default ${isAdded ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-milk text-background-dark hover:bg-white'}`}
                          >
                            {isAdded ? 'INITIALIZED' : 'IMPORT'}
                          </motion.button>
                        </motion.div>
                      )
                    })}
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
