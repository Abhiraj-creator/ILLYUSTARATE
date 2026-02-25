import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Github, Code2, GitGraph, FileText, MessageSquare, Loader2 } from 'lucide-react'
import { useAuthStore } from '@application/stores/AuthStore'
import { APP_NAME, APP_TAGLINE } from '@shared/constants'

export function LoginPage() {
  const { signInWithGitHub, isAuthenticated, isLoading: authLoading } = useAuthStore()
  const navigate = useNavigate()
  const [isRedirecting, setIsRedirecting] = useState(false)

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

  const features = [
    {
      icon: GitGraph,
      title: 'Interactive Code Graphs',
      description: 'Visualize your entire codebase as an interactive dependency graph. Navigate files, functions, and imports with ease.',
    },
    {
      icon: FileText,
      title: 'AI-Generated Documentation',
      description: 'Get instant, comprehensive documentation for any file. Our AI understands your code and explains it clearly.',
    },
    {
      icon: MessageSquare,
      title: 'Codebase Chat',
      description: 'Ask questions about your code in natural language. Get answers about architecture, dependencies, and functionality.',
    },
    {
      icon: Code2,
      title: 'Multi-Language Support',
      description: 'Works with JavaScript, TypeScript, Python, Go, Rust, Java, and more. One tool for all your projects.',
    },
  ]

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col lg:flex-row">
      {/* Left Side - Hero */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-20 py-12 lg:py-0">
        <div className="max-w-xl mx-auto lg:mx-0">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-6">
            <img 
              src="/logo.jpg" 
              alt="ILLYUSTRATE"
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl object-cover"
            />
            <span className="text-2xl sm:text-3xl font-bold text-white">{APP_NAME}</span>
          </div>

          {/* Tagline */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
            {APP_TAGLINE}
          </h1>
          
          <p className="text-base sm:text-lg text-slate-400 mb-8">
            Connect your GitHub repository and get a live, interactive map of your entire codebase. 
            Auto-generated docs and an AI assistant that understands your code — in minutes.
          </p>

          {/* Login Button */}
          <button
            onClick={handleGitHubLogin}
            disabled={isRedirecting || authLoading}
            className="w-full flex items-center justify-center gap-3 px-6 sm:px-8 py-3 sm:py-4 bg-white text-slate-900 rounded-xl font-semibold text-base sm:text-lg hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRedirecting || authLoading ? (
              <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" />
            ) : (
              <Github className="w-5 h-5 sm:w-6 sm:h-6" />
            )}
            {isRedirecting || authLoading ? 'Connecting to GitHub...' : 'Continue with GitHub'}
          </button>

          <p className="mt-4 text-xs sm:text-sm text-slate-500">
            Free to use. No credit card required.
          </p>
        </div>
      </div>

      {/* Right Side - Features */}
      <div className="hidden lg:flex flex-1 bg-slate-800/50 items-center justify-center px-12">
        <div className="max-w-lg">
          <h2 className="text-2xl font-bold text-white mb-8">Why developers love {APP_NAME}</h2>
          
          <div className="space-y-6">
            {features.map((feature, index) => (
              <div key={index} className="flex gap-4">
                <div className="w-12 h-12 bg-indigo-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <feature.icon className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">{feature.title}</h3>
                  <p className="text-sm text-slate-400">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
