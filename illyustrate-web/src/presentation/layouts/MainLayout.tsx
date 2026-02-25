import { Outlet } from 'react-router-dom'
import { Sidebar } from '@presentation/components/Sidebar'
import { Header } from '@presentation/components/Header'

export function MainLayout() {
  return (
    <div className="min-h-screen flex bg-slate-900">
      {/* Sidebar - hidden on mobile, shown on lg screens */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>
      
      {/* Mobile sidebar overlay */}
      <MobileSidebar />
      
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <Header />
        <main className="flex-1 overflow-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

// Mobile sidebar component
import { useState } from 'react'
import { Menu, X, LayoutDashboard, Settings } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { APP_NAME } from '@shared/constants'
import { useAuthStore } from '@application/stores/AuthStore'

function MobileSidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const { user } = useAuthStore()

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ]

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2 bg-slate-800 text-white rounded-lg shadow-lg"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Mobile sidebar overlay */}
      {isOpen && (
        <>
          <div 
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsOpen(false)}
          />
          <aside className="lg:hidden fixed left-0 top-0 h-full w-64 bg-slate-800 border-r border-slate-700 z-50 flex flex-col">
            {/* Logo */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-slate-700">
              <div className="flex items-center">
                <img 
                  src="/logo.jpg" 
                  alt="ILLYUSTRATE"
                  className="w-8 h-8 rounded-lg object-cover"
                />
                <span className="ml-3 font-bold text-lg text-white">{APP_NAME}</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-4 px-2 space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsOpen(false)}
                  className={({ isActive }) => `
                    flex items-center px-3 py-3 rounded-lg text-sm font-medium transition-colors
                    ${isActive 
                      ? 'bg-indigo-600 text-white' 
                      : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                    }
                  `}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="ml-3">{item.label}</span>
                </NavLink>
              ))}
            </nav>

            {/* User Profile */}
            <div className="p-4 border-t border-slate-700">
              <div className="flex items-center">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className="w-8 h-8 rounded-full" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-medium text-white">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                <div className="ml-3">
                  <p className="text-sm font-medium text-white">{user?.name}</p>
                  <p className="text-xs text-slate-400">Free Plan</p>
                </div>
              </div>
            </div>
          </aside>
        </>
      )}
    </>
  )
}
