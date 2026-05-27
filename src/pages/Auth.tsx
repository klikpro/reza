import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, Mail, Lock, User, Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'

export default function Auth() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const { signIn, signUp, loading } = useAuthStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (mode === 'login') {
      const { error: err } = await signIn(email, password)
      if (err) setError(err)
    } else {
      if (!fullName.trim()) { setError('Nama lengkap wajib diisi'); return }
      if (password.length < 6) { setError('Password minimal 6 karakter'); return }
      const { error: err } = await signUp(email, password, fullName)
      if (err) setError(err)
      else setSuccess('Akun dibuat! Silakan cek email untuk verifikasi.')
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#0a0a0f' }}>
      {/* Left panel */}
      <div className="hidden lg:flex flex-1 flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full opacity-10"
              style={{
                width: `${200 + i * 100}px`,
                height: `${200 + i * 100}px`,
                border: '1px solid #7c5cfc',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
              }}
            />
          ))}
        </div>

        <div className="relative z-10 text-center">
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 3 }}
            className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-8"
            style={{ background: 'linear-gradient(135deg, #7c5cfc, #9d7dff)', boxShadow: '0 0 40px rgba(124,92,252,0.5)' }}
          >
            <Brain size={42} className="text-white" />
          </motion.div>
          <h1 className="text-4xl font-black mb-4" style={{ color: '#e2e2ff' }}>MemoryVault</h1>
          <p className="text-lg max-w-sm mx-auto leading-relaxed" style={{ color: '#a0a0c0' }}>
            Simpan semua ingatan Anda dengan suara. Panggil kembali kapanpun dengan AI.
          </p>

          <div className="mt-12 grid grid-cols-3 gap-4 max-w-xs mx-auto">
            {[
              { emoji: '🎤', label: 'Voice Input' },
              { emoji: '🧠', label: 'AI Search' },
              { emoji: '🔊', label: 'TTS Answer' },
            ].map(f => (
              <div key={f.label} className="flex flex-col items-center gap-2 p-4 rounded-2xl"
                style={{ background: 'rgba(124,92,252,0.08)', border: '1px solid rgba(124,92,252,0.2)' }}>
                <span className="text-2xl">{f.emoji}</span>
                <span className="text-xs" style={{ color: '#a0a0c0' }}>{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel - Auth form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #7c5cfc, #9d7dff)' }}>
              <Brain size={20} className="text-white" />
            </div>
            <span className="font-bold text-2xl" style={{ color: '#e2e2ff' }}>MemoryVault</span>
          </div>

          <div className="rounded-2xl border p-8" style={{ background: '#12121a', borderColor: '#2a2a40' }}>
            <h2 className="text-2xl font-bold mb-2" style={{ color: '#e2e2ff' }}>
              {mode === 'login' ? 'Selamat Datang' : 'Buat Akun Baru'}
            </h2>
            <p className="text-sm mb-8" style={{ color: '#606080' }}>
              {mode === 'login' ? 'Masuk ke MemoryVault Anda' : 'Daftar gratis, mulai simpan ingatan'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <AnimatePresence>
                {mode === 'register' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                  >
                    <label className="block text-sm font-medium mb-1.5" style={{ color: '#a0a0c0' }}>Nama Lengkap</label>
                    <div className="relative">
                      <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#606080' }} />
                      <input
                        type="text"
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                        placeholder="Nama Anda"
                        className="input-field pl-9"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#a0a0c0' }}>Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#606080' }} />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="email@contoh.com"
                    className="input-field pl-9"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#a0a0c0' }}>Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#606080' }} />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input-field pl-9 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: '#606080' }}
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 p-3 rounded-xl text-sm"
                  style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171' }}
                >
                  <AlertCircle size={14} />
                  <span>{error}</span>
                </motion.div>
              )}

              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 p-3 rounded-xl text-sm"
                  style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', color: '#4ade80' }}
                >
                  ✓ {success}
                </motion.div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white transition-all"
                style={{
                  background: 'linear-gradient(135deg, #7c5cfc, #9d7dff)',
                  boxShadow: '0 0 20px rgba(124,92,252,0.4)',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    {mode === 'login' ? 'Masuk' : 'Buat Akun'}
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center text-sm" style={{ color: '#606080' }}>
              {mode === 'login' ? (
                <>Belum punya akun?{' '}
                  <button onClick={() => { setMode('register'); setError('') }}
                    className="font-semibold" style={{ color: '#7c5cfc' }}>
                    Daftar gratis
                  </button>
                </>
              ) : (
                <>Sudah punya akun?{' '}
                  <button onClick={() => { setMode('login'); setError('') }}
                    className="font-semibold" style={{ color: '#7c5cfc' }}>
                    Masuk
                  </button>
                </>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
