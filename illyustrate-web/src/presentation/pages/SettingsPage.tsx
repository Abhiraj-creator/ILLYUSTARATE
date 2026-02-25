import { useState } from 'react'
import { 
  User, 
  Bell, 
  Shield, 
  Github,
  Loader2,
  CheckCircle2
} from 'lucide-react'
import { useAuthStore } from '@application/stores/AuthStore'

export function SettingsPage() {
  const { user } = useAuthStore()
  const [activeSection, setActiveSection] = useState('profile')
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)



  const handleSave = async () => {
    setIsSaving(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsSaving(false)
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 3000)
  }

  const sections = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
  ]

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-64 flex-shrink-0">
          <nav className="space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  activeSection === section.id
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <section.icon className="w-5 h-5" />
                {section.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeSection === 'profile' && (
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold text-white">Profile Settings</h2>
              </div>
              <div className="card-body space-y-6">
                {/* Avatar */}
                <div className="flex items-center gap-4">
                  {user?.avatarUrl ? (
                    <img 
                      src={user.avatarUrl} 
                      alt={user.name}
                      className="w-20 h-20 rounded-full"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-indigo-600 flex items-center justify-center text-2xl font-bold text-white">
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                  <div>
                    <button className="btn btn-secondary text-sm">
                      Change Avatar
                    </button>
                    <p className="text-sm text-slate-400 mt-2">
                      JPG, GIF or PNG. Max size 2MB.
                    </p>
                  </div>
                </div>

                {/* Form */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Display Name
                    </label>
                    <input
                      type="text"
                      defaultValue={user?.name}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      defaultValue={user?.email}
                      className="input"
                      disabled
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Bio
                  </label>
                  <textarea
                    rows={3}
                    className="input resize-none"
                    placeholder="Tell us about yourself..."
                  />
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-700">
                  <div className="flex items-center gap-2">
                    {saveSuccess && (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        <span className="text-sm text-emerald-500">Saved successfully</span>
                      </>
                    )}
                  </div>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="btn btn-primary"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'notifications' && (
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold text-white">Notification Preferences</h2>
              </div>
              <div className="card-body space-y-4">
                {[
                  { id: 'analysis', label: 'Analysis completed', desc: 'Get notified when repository analysis is done' },
                  { id: 'updates', label: 'Product updates', desc: 'Receive updates about new features' },
                  { id: 'security', label: 'Security alerts', desc: 'Get notified about security issues in your repositories' },
                ].map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium text-white">{item.label}</p>
                      <p className="text-sm text-slate-400">{item.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'security' && (
            <div className="space-y-6">
              <div className="card">
                <div className="card-header">
                  <h2 className="text-lg font-semibold text-white">Connected Accounts</h2>
                </div>
                <div className="card-body">
                  <div className="flex items-center justify-between p-4 bg-slate-800 rounded-lg">
                    <div className="flex items-center gap-4">
                      <Github className="w-8 h-8 text-white" />
                      <div>
                        <p className="font-medium text-white">GitHub</p>
                        <p className="text-sm text-slate-400">Connected as {user?.name}</p>
                      </div>
                    </div>
                    <span className="badge badge-success">Connected</span>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h2 className="text-lg font-semibold text-white">Danger Zone</h2>
                </div>
                <div className="card-body space-y-4">
                  <div className="flex items-center justify-between p-4 border border-red-500/30 rounded-lg">
                    <div>
                      <p className="font-medium text-white">Delete Account</p>
                      <p className="text-sm text-slate-400">
                        Permanently delete your account and all data
                      </p>
                    </div>
                    <button className="btn bg-red-600 text-white hover:bg-red-700">
                      Delete Account
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
