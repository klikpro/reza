import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain, LayoutDashboard, BookOpen, Tag, Settings, Mic,
  ChevronLeft, ChevronRight, LogOut, User, Plus, MessageSquare, Home
} from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { useCategoryStore } from '@/store/useCategoryStore'
import { useBrandingStore } from '@/store/useBrandingStore'
import { cn } from '@/lib/utils'

interface SidebarProps {
  open: boolean
  onToggle: () => void
}

const navItems = [
  { to: '/', label: 'Beranda', icon: Home, isHome: true },
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/app/memories', label: 'Ingatan', icon: BookOpen },
  { to: '/app/categories', label: 'Kategori', icon: Tag },
  { to: '/app/templates', label: 'Template', icon: MessageSquare },
  { to: '/app/ask', label: 'Tanya AI', icon: Mic },
  { to: '/app/settings', label: 'Pengaturan', icon: Settings },
]

export default function Sidebar({ open, onToggle }: SidebarProps) {
  const { user, signOut } = useAuthStore()
  const { categories } = useCategoryStore()
  const { branding } = useBrandingStore()
  const navigate = useNavigate()

  return (
    <>
      {/* Desktop sidebar */}
      <motion.aside
        animate={{ width: open ? 228 : 58 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className="hidden md:flex flex-col h-full border-r overflow-hidden relative z-20 flex-shrink-0"
        style={{
          background: 'rgba(255,255,255,0.72)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderColor: 'rgba(6,182,212,0.15)',
          boxShadow: '2px 0 24px rgba(0,0,0,0.05)',
        }}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-2.5 px-3 h-13 border-b flex-shrink-0"
          style={{ borderColor: 'rgba(6,182,212,0.1)', minHeight: 52 }}
        >
          <div
            className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center shadow-md"
            style={{ background: 'linear-gradient(135deg, var(--accent), #8b5cf6)' }}
          >
            <Brain size={14} className="text-white" />
          </div>
          <AnimatePresence>
            {open && (
              <motion.span
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                className="font-black text-sm whitespace-nowrap"
                style={{ color: 'var(--accent)' }}
              >
                {branding?.site_name || 'MemoryVault'}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2.5 px-1.5 space-y-0.5">
          {navItems.map((item, idx) => (
            <div key={item.to}>
              {/* Divider after Beranda */}
              {idx === 1 && (
                <div className="mx-2 my-1 border-t" style={{ borderColor: 'rgba(6,182,212,0.1)' }} />
              )}
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) => cn(
                  'flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg transition-all duration-200',
                  isActive && !item.isHome ? 'text-white' : ''
                )}
                style={({ isActive }) => ({
                  background:
                    isActive && !item.isHome
                      ? 'linear-gradient(135deg, var(--accent), #8b5cf6)'
                      : 'transparent',
                  color:
                    isActive && !item.isHome
                      ? 'white'
                      : item.isHome
                      ? 'var(--text-muted)'
                      : 'var(--text-secondary)',
                  boxShadow:
                    isActive && !item.isHome
                      ? '0 2px 10px rgba(6,182,212,0.25)'
                      : undefined,
                })}
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      size={16}
                      className="flex-shrink-0"
                      style={{ opacity: item.isHome ? 0.6 : 1 }}
                    />
                    <AnimatePresence>
                      {open && (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="text-sm font-medium whitespace-nowrap"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </>
                )}
              </NavLink>
            </div>
          ))}

          {/* Categories */}
          {open && categories.length > 0 && (
            <div className="pt-3">
              <div className="mx-1 mb-2 border-t" style={{ borderColor: 'rgba(6,182,212,0.1)' }} />
              <p className="px-2.5 pb-1 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Kategori
              </p>
              {categories.slice(0, 5).map(cat => (
                <NavLink
                  key={cat.id}
                  to={`/app/memories?category=${cat.id}`}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm transition-colors hover:bg-white/60"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <span className="text-sm">{cat.icon}</span>
                  <span className="flex-1 truncate text-xs">{cat.name}</span>
                  <span
                    className="text-xs px-1.5 py-0.5 rounded-full"
                    style={{ background: 'rgba(6,182,212,0.1)', color: 'var(--accent)' }}
                  >
                    {cat.memory_count || 0}
                  </span>
                </NavLink>
              ))}
              <button
                onClick={() => navigate('/app/categories')}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs w-full text-left transition-colors hover:bg-white/60"
                style={{ color: 'var(--text-muted)' }}
              >
                <Plus size={12} />
                <span>Tambah Kategori</span>
              </button>
            </div>
          )}
        </nav>

        {/* User footer */}
        <div className="border-t p-2 flex-shrink-0" style={{ borderColor: 'rgba(6,182,212,0.1)' }}>
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold cursor-pointer shadow-md transition-transform hover:scale-110"
              style={{ background: 'linear-gradient(135deg, var(--accent), #8b5cf6)', color: 'white' }}
              onClick={() => navigate('/app/settings')}
            >
              {user?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || <User size={11} />}
            </div>
            <AnimatePresence>
              {open && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 min-w-0"
                >
                  <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                    {user?.full_name || 'Pengguna'}
                  </p>
                  <p className="truncate" style={{ color: 'var(--text-muted)', fontSize: 10 }}>
                    {user?.email}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
            <button
              onClick={() => signOut()}
              className="p-1.5 rounded-lg transition-colors flex-shrink-0 hover:bg-red-50 hover:text-red-500"
              style={{ color: 'var(--text-muted)' }}
              title="Keluar"
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>

        {/* Toggle button */}
        <button
          onClick={onToggle}
          className="absolute top-1/2 -right-3 w-6 h-6 rounded-full border flex items-center justify-center z-30 transition-all hover:scale-110 shadow-md"
          style={{
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(8px)',
            borderColor: 'rgba(6,182,212,0.25)',
            color: 'var(--text-muted)',
          }}
        >
          {open ? <ChevronLeft size={11} /> : <ChevronRight size={11} />}
        </button>
      </motion.aside>
    </>
  )
}
