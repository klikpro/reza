import { useState } from 'react'
import { motion } from 'framer-motion'
import { Brain, Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { useBrandingStore } from '@/store/useBrandingStore'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const { signIn, loading } = useAuthStore()
  const { branding } = useBrandingStore()

  const accentColor = branding?.accent_color || '#06b6d4'
  const siteName = branding?.site_name || 'MemoryVault'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const { error: err } = await signIn(email, password)
    if (err) setError(err)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 40%, #f5f3ff 100%)' }}>

      {/* Decorative blobs */}
      <div className="absolute top-0 left-0 w-96 h-96 rounded-full opacity-20 pointer-events-none"
        style={{ background: accentColor, filter: 'blur(80px)', transform: 'translate(-30%, -30%)' }} />
      <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full opacity-15 pointer-events-none"
        style={{ background: '#8b5cf6', filter: 'blur(80px)', transform: 'translate(30%, 30%)' }} />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
        style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(20px)', border: `1px solid ${accentColor}30` }}
      >
        <div className="p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg"
              style={{ background: `linear-gradient(135deg, ${accentColor}, #8b5cf6)` }}>
              {branding?.logo_url
                ? <img src={branding.logo_url} alt="logo" className="w-10 h-10 object-contain" />
                : <Brain size={30} className="text-white" />
              }
            </div>
            <h1 className="text-2xl font-black" style={{ color: '#1e293b' }}>{siteName}</h1>
            <p className="text-sm mt-1" style={{ color: '#64748b' }}>Masuk ke akun Anda</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: '#64748b' }}>Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94a3b8' }} />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="email@contoh.com" required
                  className="w-full pl-9 pr-4 py-3 rounded-xl border text-sm outline-none transition-all"
                  style={{ background: 'rgba(255,255,255,0.8)', borderColor: '#e2e8f0', color: '#1e293b' }}
                  onFocus={e => (e.target.style.borderColor = accentColor)}
                  onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: '#64748b' }}>Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94a3b8' }} />
                <input type={showPass ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)} placeholder="••••••••" required
                  className="w-full pl-9 pr-10 py-3 rounded-xl border text-sm outline-none transition-all"
                  style={{ background: 'rgba(255,255,255,0.8)', borderColor: '#e2e8f0', color: '#1e293b' }}
                  onFocus={e => (e.target.style.borderColor = accentColor)}
                  onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#94a3b8' }}>
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex items-center gap-2 p-3 rounded-xl text-sm"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#dc2626' }}>
                <AlertCircle size={14} /> {error}
              </motion.div>
            )}

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white transition-all shadow-lg mt-2"
              style={{ background: `linear-gradient(135deg, ${accentColor}, #8b5cf6)`, opacity: loading ? 0.7 : 1 }}>
              {loading
                ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <><span>Masuk</span><ArrowRight size={16} /></>
              }
            </button>
          </form>

          <p className="text-center text-xs mt-6" style={{ color: '#94a3b8' }}>
            Tidak bisa login? Hubungi administrator.
          </p>
        </div>
      </motion.div>
    </div>
  )
}
