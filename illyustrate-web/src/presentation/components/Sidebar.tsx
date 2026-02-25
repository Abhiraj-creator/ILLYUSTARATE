import { NavLink } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Settings, 
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { useState } from 'react'
import { APP_NAME } from '@shared/constants'
import { useAuthStore } from '@application/stores/AuthStore'

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const { user } = useAuthStore()

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ]

  return (
    <aside 
      className={`bg-slate-800 border-r border-slate-700 flex flex-col h-screen transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-slate-700">
        <img 
          src="/logo.jpg" 
          alt="ILLYUSTRATE"
          className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
        />
        {!collapsed && (
          <span className="ml-3 font-bold text-lg text-white truncate">
            {APP_NAME}
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `
              flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
              ${isActive 
                ? 'bg-indigo-600 text-white' 
                : 'text-slate-400 hover:bg-slate-700 hover:text-white'
              }
            `}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="ml-3">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-slate-700">
        <div className={`flex items-center ${collapsed ? 'justify-center' : ''}`}>
          {user?.avatarUrl ? (
            <img 
              src={user.avatarUrl} 
              alt={user.name}
              className="w-8 h-8 rounded-full"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-medium">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
          )}
          {!collapsed && (
            <div className="ml-3 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-slate-400 capitalize">{user?.plan} Plan</p>
            </div>
          )}
        </div>
      </div>

      {/* Collapse Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="p-2 mx-4 mb-4 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
      >
        {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
      </button>
    </aside>
  )
}
