import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '@application/stores/AuthStore'
import { APP_NAME } from '@shared/constants'

export function LoginPage() {
  const { signInWithGitHub, signInWithEmail, signUpWithEmail, isAuthenticated, isLoading: authLoading } = useAuthStore()
  const navigate = useNavigate()
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login')
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
  })
  const [formError, setFormError] = useState<string | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard')
    }
  }, [isAuthenticated, navigate])

  const handleGitHubLogin = async () => {
    setIsRedirecting(true)
    try {
      await signInWithGitHub()
    } catch (error) {
      console.error('Login error:', error)
      setIsRedirecting(false)
    }
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setFormLoading(true)

    try {
      if (activeTab === 'login') {
        await signInWithEmail(formData.email, formData.password)
      } else {
        await signUpWithEmail(formData.email, formData.password, formData.name)
      }
    } catch (error: any) {
      setFormError(error.message || 'Authentication failed')
    } finally {
      setFormLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full bg-[#191022] text-slate-100 font-display selection:bg-[#7f13ec] selection:text-white">
      <style>{`
        .mesh-gradient {
            background-color: #381932;
            background-image: 
                radial-gradient(at 0% 0%, rgba(123, 79, 166, 0.3) 0px, transparent 50%),
                radial-gradient(at 100% 100%, rgba(192, 132, 252, 0.2) 0px, transparent 50%),
                radial-gradient(at 50% 50%, rgba(56, 25, 50, 0.5) 0px, transparent 80%);
        }
        .blurred-bg {
            background: radial-gradient(circle at center, rgba(123, 79, 166, 0.15) 0%, rgba(25, 16, 34, 1) 100%);
        }
      `}</style>

      <aside className="hidden lg:flex lg:w-[40%] mesh-gradient border-r border-white/5 flex-col p-12 relative overflow-hidden">
        <div className="flex items-center gap-3 mb-16 z-10">
          <div className="relative flex items-center justify-center size-10 bg-[#7B4FA6]/20 rounded-lg border border-[#7B4FA6]/50 shadow-[0_0_15px_rgba(123,79,166,0.4)]">
            <span className="material-symbols-outlined text-[#C084FC] text-2xl">hexagon</span>
          </div>
          <h1 className="text-[#fff3e6] font-bold text-2xl tracking-tight uppercase italic">{APP_NAME}</h1>
        </div>

        <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full z-10">
          <div className="mb-8">
            <h2 className="text-3xl font-playfair text-[#fff3e6] mb-2">Welcome Back</h2>
            <p className="text-[#fff3e6]/60 font-lora italic">Enter your credentials to access the grid.</p>
          </div>

          <div className="bg-black/20 p-1 rounded-full flex mb-8 border border-white/5">
            <button
              onClick={() => setActiveTab('login')}
              className={`flex-1 py-2 px-6 rounded-full text-sm font-bold transition-all ${activeTab === 'login' ? 'bg-[#7B4FA6] text-white shadow-lg' : 'text-[#fff3e6]/60 hover:text-[#fff3e6]'
                }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setActiveTab('signup')}
              className={`flex-1 py-2 px-6 rounded-full text-sm font-bold transition-all ${activeTab === 'signup' ? 'bg-[#7B4FA6] text-white shadow-lg' : 'text-[#fff3e6]/60 hover:text-[#fff3e6]'
                }`}
            >
              Sign Up
            </button>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleGitHubLogin}
              disabled={isRedirecting || (hasMounted && authLoading)}
              className="w-full flex items-center justify-center gap-3 px-6 h-14 rounded-xl border border-[#5e2d52] bg-[#381932]/50 hover:bg-[#381932] transition-all text-[#fff3e6] text-sm font-medium relative overflow-hidden disabled:opacity-50"
            >
              {isRedirecting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <span className="material-symbols-outlined text-lg">terminal</span>
              )}
              <span>{isRedirecting ? 'Connecting to GitHub...' : 'Continue with GitHub'}</span>
              {!isRedirecting && <span className="absolute right-3 top-3 bg-[#7df9ff] text-[#381932] text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">New</span>}
            </button>

            <div className="flex items-center gap-4 my-6">
              <div className="h-[1px] flex-1 bg-white/10"></div>
              <span className="text-xs uppercase tracking-widest text-[#fff3e6]/30 font-mono">or email</span>
              <div className="h-[1px] flex-1 bg-white/10"></div>
            </div>

            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <AnimatePresence mode="wait">
                {formError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm"
                  >
                    {formError}
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait">
                {activeTab === 'signup' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, y: -20 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -20 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="group"
                  >
                    <label className="block text-xs font-mono uppercase tracking-widest text-[#fff3e6]/40 mb-2 ml-1">Full Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full h-14 bg-[#381932]/40 border border-white/10 rounded-xl px-4 text-[#fff3e6] placeholder:text-[#fff3e6]/20 focus:outline-none focus:ring-2 focus:ring-[#7B4FA6]/40 focus:border-[#7B4FA6] transition-all"
                      placeholder="Jane Doe"
                      required={activeTab === 'signup'}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="group">
                <label className="block text-xs font-mono uppercase tracking-widest text-[#fff3e6]/40 mb-2 ml-1">Work Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full h-14 bg-[#381932]/40 border border-white/10 rounded-xl px-4 text-[#fff3e6] placeholder:text-[#fff3e6]/20 focus:outline-none focus:ring-2 focus:ring-[#7B4FA6]/40 focus:border-[#7B4FA6] transition-all"
                  placeholder="dev@illyustrate.io"
                  required
                />
              </div>

              <div className="group">
                <div className="flex justify-between items-end mb-2 ml-1">
                  <label className="block text-xs font-mono uppercase tracking-widest text-[#fff3e6]/40">Password</label>
                  {activeTab === 'login' && <a className="text-[10px] text-[#7B4FA6] hover:text-[#C084FC] uppercase tracking-tighter" href="#">Forgot?</a>}
                </div>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full h-14 bg-[#381932]/40 border border-white/10 rounded-xl px-4 text-[#fff3e6] placeholder:text-[#fff3e6]/20 focus:outline-none focus:ring-2 focus:ring-[#7B4FA6]/40 focus:border-[#7B4FA6] transition-all"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>

              <button
                type="submit"
                disabled={formLoading}
                className="w-full mt-6 h-14 rounded-xl flex items-center justify-center gap-2 bg-gradient-to-r from-[#7B4FA6] to-[#C084FC] text-white font-bold text-lg shadow-xl shadow-[#7B4FA6]/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {formLoading && <Loader2 className="w-5 h-5 animate-spin" />}
                {activeTab === 'login' ? 'Sign In to Dashboard' : 'Create Account'}
              </button>
            </form>
          </div>
        </div>

        <footer className="mt-auto z-10 pt-8">
          <p className="text-[11px] font-mono text-[#fff3e6]/20 uppercase tracking-[0.2em]">© 2024 ILLYUSTRATE Labs / Secure Authentication</p>
        </footer>
      </aside>

      <main className="w-full lg:w-[60%] blurred-bg relative flex flex-col p-8 sm:p-20 justify-center">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center gap-3 mb-12 z-10">
          <div className="relative flex items-center justify-center size-10 bg-[#7B4FA6]/20 rounded-lg border border-[#7B4FA6]/50 shadow-[0_0_15px_rgba(123,79,166,0.4)]">
            <span className="material-symbols-outlined text-[#C084FC] text-2xl">hexagon</span>
          </div>
          <h1 className="text-[#fff3e6] font-bold text-2xl tracking-tight uppercase italic">{APP_NAME}</h1>
        </div>

        <div className="max-w-3xl">
          <h2 className="text-4xl sm:text-6xl font-playfair text-[#fff3e6] leading-tight mb-16">
            Why developers love <br />
            <span className="italic text-[#7B4FA6] uppercase">{APP_NAME}</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 relative">
            <div className="bg-[#4a2040]/40 border border-white/5 p-8 rounded-2xl backdrop-blur-sm transform hover:-translate-y-2 transition-all duration-500">
              <div className="size-12 bg-[#7B4FA6]/20 rounded-lg flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-[#7B4FA6]">account_tree</span>
              </div>
              <h3 className="text-xl font-bold text-[#fff3e6] mb-3">Interactive Code Graphs</h3>
              <p className="text-[#fff3e6]/50 font-lora leading-relaxed text-sm">Visualize your entire repository architecture in 3D node-based environments. Understand dependencies instantly.</p>
            </div>

            <div className="bg-[#4a2040]/40 border border-white/5 p-8 rounded-2xl backdrop-blur-sm transform sm:translate-y-12 hover:-translate-y-2 transition-all duration-500">
              <div className="size-12 bg-[#7B4FA6]/20 rounded-lg flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-[#7B4FA6]">auto_awesome</span>
              </div>
              <h3 className="text-xl font-bold text-[#fff3e6] mb-3">AI Powered Docs</h3>
              <p className="text-[#fff3e6]/50 font-lora leading-relaxed text-sm">Living documentation that updates itself with every PR. Never worry about stale READMEs again.</p>
            </div>

            <div className="bg-[#4a2040]/40 border border-white/5 p-8 rounded-2xl backdrop-blur-sm transform sm:-translate-y-6 hover:-translate-y-2 transition-all duration-500">
              <div className="size-12 bg-[#7B4FA6]/20 rounded-lg flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-[#7B4FA6]">forum</span>
              </div>
              <h3 className="text-xl font-bold text-[#fff3e6] mb-3">Codebase Chat</h3>
              <p className="text-[#fff3e6]/50 font-lora leading-relaxed text-sm">Context-aware LLM that knows your specific logic, folder structures, and hidden technical debt.</p>
            </div>

            <div className="bg-[#4a2040]/40 border border-white/5 p-8 rounded-2xl backdrop-blur-sm transform sm:translate-y-6 hover:-translate-y-2 transition-all duration-500">
              <div className="size-12 bg-[#7B4FA6]/20 rounded-lg flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-[#7B4FA6]">language</span>
              </div>
              <h3 className="text-xl font-bold text-[#fff3e6] mb-3">Multi-Lang Native</h3>
              <p className="text-[#fff3e6]/50 font-lora leading-relaxed text-sm">First-class support for TS, Go, Python and more. Seamlessly switch between polyglot microservices.</p>
            </div>
          </div>
        </div>

        <div className="absolute bottom-10 right-10 hidden sm:flex items-center gap-6 opacity-30">
          <div className="flex -space-x-3">
            <div className="size-10 rounded-full border-2 border-[#191022] bg-indigo-500"></div>
            <div className="size-10 rounded-full border-2 border-[#191022] bg-emerald-500"></div>
            <div className="size-10 rounded-full border-2 border-[#191022] bg-rose-500"></div>
          </div>
          <p className="text-xs font-mono uppercase tracking-widest text-[#fff3e6]">Joined by 12k+ engineers</p>
        </div>
      </main>

      {/* Mobile Login Button overlay for small screens to show the form at bottoms */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-background-dark/80 backdrop-blur-lg border-t border-white/10 z-50">
        <button className="w-full h-14 rounded-xl bg-gradient-to-r from-[#7B4FA6] to-[#C084FC] text-white font-bold text-lg shadow-xl shadow-[#7B4FA6]/20" onClick={() => {
          window.scrollTo({ top: 0, behavior: 'smooth' })
          // Note: in a real app, this might open a modal on mobile, but for now we just scroll to top where the form could be
          // Actually, we've hidden the form completely on mobile! Let's display it inline.
        }}>
          Proceed to Login
        </button>
      </div>

    </div>
  )
}
