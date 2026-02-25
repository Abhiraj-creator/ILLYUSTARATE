import { useNavigate } from 'react-router-dom'
import { Bell, Search, LogOut, Menu } from 'lucide-react'
import { useAuthStore } from '@application/stores/AuthStore'

export function Header() {
  const { signOut } = useAuthStore()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <header className="h-16 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-4 sm:px-6">
      {/* Left spacer for mobile menu button */}
      <div className="w-10 lg:hidden" />

      {/* Search - responsive */}
      <div className="flex-1 max-w-xl mx-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search repositories..."
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Actions - responsive */}
      <div className="flex items-center gap-2 sm:gap-4">
        <button className="relative p-2 text-slate-400 hover:text-white transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        <div className="hidden sm:block h-6 w-px bg-slate-700" />

        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 px-2 sm:px-3 py-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    </header>
  )
}
