import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Loader2,
  CheckCircle2
} from 'lucide-react'
import { useAuthStore } from '@application/stores/AuthStore'

export function SettingsPage() {
  const { user, signOut, updateProfile, deleteAccount } = useAuthStore()
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState('profile')
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState(user?.name || '')
  const [bio, setBio] = useState(user?.bio || '')
  const [experience, setExperience] = useState(user?.experience || '')
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false)

  useEffect(() => {
    if (user) {
      setName(user.name)
      setBio(user.bio || '')
      setExperience(user.experience || '')
    }
  }, [user])

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setIsSaving(true)
    try {
      await updateProfile({ name, bio, experience })
      setIsSaving(false)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (error) {
      console.error('Failed to save profile:', error)
      setIsSaving(false)
    }
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUpdatingAvatar(true)
    try {
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

  const handleDeleteAccount = async () => {
    if (confirm('CRITICAL: This will permanently delete your account and all associated data. This action is irreversible. Are you sure?')) {
      try {
        await deleteAccount()
        navigate('/')
      } catch (error) {
        console.error('Failed to delete account:', error)
        alert('Failed to delete account. Please try again or contact support.')
      }
    }
  }

  const sections = [
    { id: 'profile', label: 'Profile', icon: 'account_circle' },
    { id: 'notifications', label: 'Notifications', icon: 'notifications' },
    { id: 'security', label: 'Security', icon: 'shield' },
  ]

  const handleSectionChange = (sectionId: string) => {
    setActiveSection(sectionId)
  }

  return (
    <div className="flex flex-col min-h-screen w-full bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 antialiased selection:bg-primary selection:text-white relative">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[120px] rounded-full pointer-events-none"></div>

      {/* Top Navbar */}
      <header className="min-h-[4rem] h-auto lg:h-16 glass-navbar border-b border-[#5e2d52] flex items-center justify-between px-4 sm:px-8 sticky top-0 z-40 py-2 sm:py-0">
        <div className="flex items-center gap-4 sm:gap-6 flex-1">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors cursor-pointer group">
            <span className="material-symbols-outlined text-lg transition-transform group-hover:-translate-x-1">arrow_back</span>
            <span className="text-sm font-medium font-serif italic hidden xs:inline">Back to Dashboard</span>
            <span className="text-sm font-medium font-serif italic xs:hidden">Back</span>
          </button>
        </div>
        <div className="flex items-center gap-6">
          <button onClick={() => signOut()} className="flex items-center gap-2 px-2 text-sm text-slate-400 hover:text-white transition-colors cursor-pointer" title="Sign Out">
            <span className="material-symbols-outlined text-[20px]">logout</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 relative items-stretch">
        {/* Sidebar Nav */}
        <aside className="w-64 border-r border-[#5e2d52] flex flex-col pt-8 px-6 lg:fixed lg:bottom-0 lg:top-16 lg:left-0 z-30 hidden lg:flex bg-[#191022]">
          <div className="mb-8 px-2">
            <h2 className="text-2xl font-serif text-milk italic tracking-tight">Settings</h2>
          </div>

          <nav className="flex flex-col gap-2">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => handleSectionChange(section.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeSection === section.id
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'text-slate-400 hover:bg-[#4a2040]/50 hover:text-milk border border-transparent'
                  } cursor-pointer`}
              >
                <span className="material-symbols-outlined text-[20px]">{section.icon}</span>
                {section.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 lg:ml-64 p-8 lg:p-12 relative min-h-screen">
          <div className="max-w-3xl">

            {/* Mobile Menu Dropdown */}
            <div className="lg:hidden mb-8 border-b border-[#5e2d52] pb-4 flex gap-4 overflow-x-auto custom-scrollbar">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => handleSectionChange(section.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-all ${activeSection === section.id
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : 'text-slate-400 bg-[#4a2040]/30 hover:text-milk border border-[#5e2d52]'
                    }`}
                >
                  <span className="material-symbols-outlined text-[16px]">{section.icon}</span>
                  {section.label}
                </button>
              ))}
            </div>

            {activeSection === 'profile' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-8">
                <div className="border-b border-[#5e2d52] pb-6 mb-8 flex items-end justify-between">
                  <div>
                    <h2 className="text-xl font-serif text-milk mb-1">Public Profile</h2>
                    <p className="text-sm text-slate-400">Manage how your professional identity appears.</p>
                  </div>
                  <div className="hidden sm:block">
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className={`px-6 h-10 rounded-full text-sm font-bold tracking-tight shadow-lg shadow-primary/20 transition-transform active:scale-95 flex items-center gap-2 ${saveSuccess ? 'bg-emerald-500 text-[#191022] hover:bg-emerald-400' : 'bg-primary text-white hover:bg-primary/90'} disabled:opacity-50`}
                    >
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : saveSuccess ? <><CheckCircle2 className="w-4 h-4" /> SECURED</> : 'SAVE CHANGES'}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-8 items-start">
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleAvatarChange}
                  />
                  <div
                    className={`shrink-0 group relative overflow-visible cursor-pointer ${isUpdatingAvatar ? 'opacity-50' : ''}`}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="absolute inset-[-10px] bg-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity rounded-full"></div>
                    <div className="size-24 rounded-full border border-[#5e2d52] relative z-10 overflow-hidden group-hover:border-primary transition-colors bg-[#4a2040] flex items-center justify-center">
                      {user?.avatarUrl ? (
                        <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url('${user.avatarUrl}')` }}></div>
                      ) : (
                        <span className="text-4xl font-bold text-white">{user?.name?.charAt(0).toUpperCase() || 'U'}</span>
                      )}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                        <span className="material-symbols-outlined text-white">{isUpdatingAvatar ? 'sync' : 'edit'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 space-y-6 w-full">
                    <div className="group">
                      <label className="block text-xs font-mono uppercase tracking-widest text-slate-400 mb-2 ml-1">Display Name</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full h-12 bg-[#2a1127]/50 border border-[#5e2d52] rounded-xl px-4 text-milk placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all font-serif italic text-lg"
                      />
                    </div>
                    <div className="group">
                      <label className="block text-xs font-mono uppercase tracking-widest text-slate-400 mb-2 ml-1">Work Email</label>
                      <input
                        type="email"
                        defaultValue={user?.email || ''}
                        disabled
                        className="w-full h-12 bg-[#2a1127]/30 border border-[#5e2d52]/50 rounded-xl px-4 text-slate-500 cursor-not-allowed font-mono text-sm"
                      />
                    </div>
                    <div className="group">
                      <label className="block text-xs font-mono uppercase tracking-widest text-slate-400 mb-2 ml-1">Creative Statement (Bio)</label>
                      <textarea
                        rows={3}
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        className="w-full bg-[#2a1127]/50 border border-[#5e2d52] rounded-xl p-4 text-milk placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all text-sm custom-scrollbar resize-none"
                        placeholder="Crafting digital experiences..."
                      />
                    </div>
                    <div className="group">
                      <label className="block text-xs font-mono uppercase tracking-widest text-slate-400 mb-2 ml-1">Professional Experience (JSON/Text)</label>
                      <textarea
                        rows={4}
                        value={experience}
                        onChange={(e) => setExperience(e.target.value)}
                        className="w-full bg-[#2a1127]/50 border border-[#5e2d52] rounded-xl p-4 text-milk font-mono placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all text-xs custom-scrollbar resize-none"
                        placeholder="Previous roles, projects, or technical milestones..."
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-8 border-t border-[#5e2d52] pt-6 sm:hidden flex justify-end">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full sm:w-auto px-6 h-10 bg-primary hover:bg-primary/90 text-white rounded-full text-sm font-bold tracking-tight shadow-lg shadow-primary/20 transition-transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'SAVE CHANGES'}
                  </button>
                </div>
              </motion.div>
            )}

            {activeSection === 'notifications' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-8">
                <div className="border-b border-[#5e2d52] pb-6 mb-8 flex items-end justify-between">
                  <div>
                    <h2 className="text-xl font-serif text-milk mb-1">Notification Streams</h2>
                    <p className="text-sm text-slate-400">Control your digital telemetry.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {[
                    { id: 'analysis', label: 'Analysis Complete Event', desc: 'Trigger webhook when repository scanning finishes.' },
                    { id: 'security', label: 'Security Vulnerability Pulse', desc: 'Alerts regarding outdated or compromised dependencies.' },
                    { id: 'feature', label: 'Core Platform Updates', desc: 'Major ILLYUSTRATE engine updates and new nodes.' }
                  ].map(item => (
                    <div key={item.id} className="bg-[#2a1127]/30 border border-[#5e2d52] p-5 rounded-2xl flex items-center justify-between">
                      <div>
                        <h4 className="text-milk font-medium text-sm mb-1">{item.label}</h4>
                        <p className="text-slate-400 text-xs max-w-[80%]">{item.desc}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer overflow-hidden rounded-full">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-[#4a2040] peer-focus:outline-none peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeSection === 'security' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-8">
                <div className="border-b border-[#5e2d52] pb-6 mb-8 flex items-end justify-between">
                  <div>
                    <h2 className="text-xl font-serif text-milk mb-1">Identity & Security</h2>
                    <p className="text-sm text-slate-400">Manage bindings and critical access parameters.</p>
                  </div>
                </div>

                <div className="bg-[#2a1127]/30 border border-[#5e2d52] p-6 rounded-2xl mb-8">
                  <h3 className="text-milk font-medium text-sm mb-4">OAuth Bindings</h3>
                  <div className="flex items-center justify-between border border-[#5e2d52] bg-[#191022] p-4 rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className="size-10 rounded-lg bg-[#4a2040] flex items-center justify-center text-slate-300">
                        <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.041-1.412-4.041-1.412-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"></path></svg>
                      </div>
                      <div>
                        <p className="font-medium text-milk">GitHub Access Token</p>
                        <p className="text-xs font-mono text-slate-500">Bound to {user?.name}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono tracking-widest text-[#7df9ff] uppercase px-2 py-1 bg-[#7df9ff]/10 rounded border border-[#7df9ff]/20">Active</span>
                  </div>
                </div>

                <div className="bg-red-500/5 items-center border border-red-500/20 p-6 rounded-2xl flex flex-col sm:flex-row justify-between gap-4">
                  <div>
                    <h3 className="text-red-400 font-medium text-sm mb-1">Purge Ecosystem</h3>
                    <p className="text-slate-400 text-xs">Permanently disconnect and delete all relational data, graphs, and settings.</p>
                  </div>
                  <button
                    onClick={handleDeleteAccount}
                    className="shrink-0 px-5 h-10 border border-red-500/50 text-red-400 hover:bg-red-500 hover:text-[#191022] font-bold text-xs tracking-wider rounded-lg transition-colors cursor-pointer"
                  >
                    DELETE ACCOUNT
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
