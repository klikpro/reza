import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain, LayoutDashboard, BookOpen, Tag, Settings, Mic,
  ChevronLeft, ChevronRight, LogOut, User, Plus
} from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { useCategoryStore } from '@/store/useCategoryStore'
import { cn } from '@/lib/utils'

interface SidebarProps {
  open: boolean
  onToggle: () => void
}

const navItems = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/app/memories', label: 'Ingatan', icon: BookOpen },
  { to: '/app/categories', label: 'Kategori', icon: Tag },
  { to: '/app/ask', label: 'Tanya', icon: Mic },
  { to: '/app/settings', label: 'Pengaturan', icon: Settings },
]

export default function Sidebar({ open, onToggle }: SidebarProps) {
  const { user, signOut } = useAuthStore()
  const { categories } = useCategoryStore()
  const navigate = useNavigate()

  return (
    <>
      {/* Desktop sidebar */}
      <motion.aside
        animate={{ width: open ? 240 : 64 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className="hidden md:flex flex-col h-full border-r overflow-hidden relative z-20 flex-shrink-0"
        style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-16 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
          <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-light))', boxShadow: '0 0 12px rgba(124,92,252,0.4)' }}>
            <Brain size={16} className="text-white" />
          </div>
          <AnimatePresence>
            {open && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="font-bold text-base whitespace-nowrap"
                style={{ color: 'var(--text-primary)' }}
              >
                MemoryVault
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group',
                isActive
                  ? 'text-white'
                  : 'hover:text-primary'
              )}
              style={({ isActive }) => ({
                background: isActive ? 'var(--accent)' : 'transparent',
                color: isActive ? 'white' : 'var(--text-secondary)',
                boxShadow: isActive ? '0 0 12px rgba(124,92,252,0.3)' : undefined,
              })}
            >
              <item.icon size={18} className="flex-shrink-0" />
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
            </NavLink>
          ))}

          {/* Categories */}
          {open && categories.length > 0 && (
            <div className="pt-4">
              <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Kategori
              </p>
              {categories.slice(0, 6).map(cat => (
                <NavLink
                  key={cat.id}
                  to={`/app/memories?category=${cat.id}`}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <span className="text-base">{cat.icon}</span>
                  <span className="flex-1 truncate">{cat.name}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
                    {cat.memory_count || 0}
                  </span>
                </NavLink>
              ))}
              <button
                onClick={() => navigate('/app/categories')}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm w-full text-left transition-colors"
                style={{ color: 'var(--text-muted)' }}
              >
                <Plus size={14} />
                <span>Tambah Kategori</span>
              </button>
            </div>
          )}
        </nav>

        {/* User */}
        <div className="border-t p-3 flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold cursor-pointer"
              style={{ background: 'var(--accent)', color: 'white' }}
              onClick={() => navigate('/app/settings')}
            >
              {user?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || <User size={14} />}
            </div>
            <AnimatePresence>
              {open && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 min-w-0"
                >
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {user?.full_name || 'Pengguna'}
                  </p>
                  <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                    {user?.email}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
            <button
              onClick={() => signOut()}
              className="p-1.5 rounded-lg transition-colors flex-shrink-0"
              style={{ color: 'var(--text-muted)' }}
              title="Keluar"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>

        {/* Toggle button */}
        <button
          onClick={onToggle}
          className="absolute top-1/2 -right-3 w-6 h-6 rounded-full border flex items-center justify-center z-30 transition-colors"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}
        >
          {open ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
        </button>
      </motion.aside>
    </>
  )
}
