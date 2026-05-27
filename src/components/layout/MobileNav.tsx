import { NavLink } from 'react-router-dom'
import { LayoutDashboard, BookOpen, Tag, Mic, Settings, Home } from 'lucide-react'

const items = [
  { to: '/', label: 'Beranda', icon: Home, end: true },
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/app/memories', label: 'Ingatan', icon: BookOpen },
  { to: '/app/ask', label: 'Tanya', icon: Mic },
  { to: '/app/settings', label: 'Setelan', icon: Settings },
]

export default function MobileNav() {
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t flex items-center"
      style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
    >
      {items.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className="flex-1 flex flex-col items-center py-2.5 gap-1 text-xs"
          style={({ isActive }) => ({
            color: isActive ? 'var(--accent)' : 'var(--text-muted)',
          })}
        >
          <item.icon size={20} />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
