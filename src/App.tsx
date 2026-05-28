import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { useSettingsStore } from '@/store/useSettingsStore'
import { useBrandingStore } from '@/store/useBrandingStore'
import { applyTheme } from '@/styles/themes'

// Pages
import Landing from '@/pages/Landing'
import Auth from '@/pages/Auth'
import AppLayout from '@/components/layout/AppLayout'
import Dashboard from '@/pages/app/Dashboard'
import Memories from '@/pages/app/Memories'
import Categories from '@/pages/app/Categories'
import Settings from '@/pages/app/Settings'
import Ask from '@/pages/app/Ask'
import Conversation from '@/pages/app/Conversation'
import Templates from '@/pages/app/Templates'
import { Toaster } from '@/components/ui/Toaster'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, initialized } = useAuthStore()
  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--accent)' }} />
          <p style={{ color: 'var(--text-muted)' }}>Memuat...</p>
        </div>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  const { initialize, user, initialized } = useAuthStore()
  const { settings } = useSettingsStore()
  const { fetchBranding } = useBrandingStore()

  useEffect(() => {
    initialize()
    fetchBranding()
  }, [initialize, fetchBranding])

  useEffect(() => {
    if (settings?.theme) {
      applyTheme(settings.theme)
    } else {
      applyTheme('bright-glass')
    }
  }, [settings?.theme])

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0f' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full" style={{ background: 'linear-gradient(135deg, #7c5cfc, #9d7dff)', boxShadow: '0 0 30px rgba(124,92,252,0.5)' }} />
            <div className="absolute inset-0 rounded-full animate-ping opacity-30" style={{ background: '#7c5cfc' }} />
          </div>
          <p className="text-lg font-semibold" style={{ color: '#e2e2ff' }}>MemoryVault</p>
          <p style={{ color: '#606080' }}>Memuat aplikasi...</p>
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Toaster />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={user ? <Navigate to="/app" replace /> : <Auth />} />
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="memories" element={<Memories />} />
          <Route path="categories" element={<Categories />} />
          <Route path="settings" element={<Settings />} />
          <Route path="ask" element={<Ask />} />
          <Route path="conversation" element={<Conversation />} />
          <Route path="templates" element={<Templates />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
