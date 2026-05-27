import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Brain, Mic, Search, Shield, Zap, Star, ArrowRight, Volume2, Sparkles } from 'lucide-react'

const features = [
  {
    icon: Mic,
    title: 'Simpan via Suara',
    description: 'Bicara dan ingatan Anda langsung tersimpan secara otomatis dengan transkripsi real-time.',
    color: '#7c5cfc',
  },
  {
    icon: Search,
    title: 'Cari dengan Makna',
    description: 'AI semantic search memahami maksud pertanyaan Anda, bukan hanya kata kunci.',
    color: '#60a5fa',
  },
  {
    icon: Volume2,
    title: 'Jawaban Bersuara',
    description: 'Panggil ingatan dengan wake word, dapatkan jawaban yang dibacakan langsung.',
    color: '#34d399',
  },
  {
    icon: Shield,
    title: 'Privasi Terjaga',
    description: 'Data Anda aman di Supabase. API key tersimpan terenkripsi hanya untuk Anda.',
    color: '#f97316',
  },
  {
    icon: Sparkles,
    title: '14 Tema Visual',
    description: 'Dari Dark Minimal hingga Cyberpunk — sesuaikan tampilan dengan kepribadian Anda.',
    color: '#f43f5e',
  },
  {
    icon: Zap,
    title: 'Sangat Cepat',
    description: 'Dibangun dengan Vite + React 18. Responsif, smooth, dan blazing fast.',
    color: '#fbbf24',
  },
]

const testimonials = [
  { name: 'Budi Santoso', role: 'Software Engineer', text: 'MemoryVault mengubah cara saya bekerja. Sekarang saya bisa capture ide kapanpun tanpa repot mengetik.', stars: 5 },
  { name: 'Sari Dewi', role: 'Content Creator', text: 'Wake word detection-nya luar biasa. Saya bisa panggil ingatan sambil masak tanpa pegang HP.', stars: 5 },
  { name: 'Ahmad Rizki', role: 'Medical Doctor', text: 'Saya pakai ini untuk menyimpan catatan pasien. Semantic search-nya sangat membantu.', stars: 5 },
]

export default function Landing() {
  const particleRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = particleRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const particles: Array<{ x: number; y: number; vx: number; vy: number; r: number; alpha: number }> = []
    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.5 + 0.1,
      })
    }

    let rafId: number
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach(p => {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(124,92,252,${p.alpha})`
        ctx.fill()
      })
      rafId = requestAnimationFrame(animate)
    }
    animate()
    return () => cancelAnimationFrame(rafId)
  }, [])

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0f', color: '#e2e2ff' }}>
      {/* Particle background */}
      <canvas ref={particleRef} className="fixed inset-0 pointer-events-none" style={{ opacity: 0.6 }} />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-7xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7c5cfc, #9d7dff)', boxShadow: '0 0 20px rgba(124,92,252,0.5)' }}>
            <Brain size={18} className="text-white" />
          </div>
          <span className="font-bold text-xl" style={{ color: '#e2e2ff' }}>MemoryVault</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/login" className="text-sm font-medium" style={{ color: '#a0a0c0' }}>Masuk</Link>
          <Link to="/login" className="btn-primary text-sm" style={{ background: 'linear-gradient(135deg, #7c5cfc, #9d7dff)' }}>
            Mulai Gratis
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 text-center px-6 pt-20 pb-32 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border mb-8 text-sm"
            style={{ borderColor: 'rgba(124,92,252,0.4)', background: 'rgba(124,92,252,0.08)', color: '#9d7dff' }}>
            <Sparkles size={14} />
            <span>AI-Powered Personal Memory Manager</span>
          </div>

          <h1 className="text-5xl sm:text-7xl font-black mb-6 leading-tight">
            Ingatan Anda,{' '}
            <span style={{ background: 'linear-gradient(135deg, #7c5cfc, #60a5fa, #34d399)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Selalu Tersedia
            </span>
          </h1>

          <p className="text-xl mb-10 max-w-2xl mx-auto leading-relaxed" style={{ color: '#a0a0c0' }}>
            Simpan momen, ide, dan catatan lewat suara. Panggil kembali kapanpun
            dengan pertanyaan natural — dijawab oleh AI yang mengerti konteks Anda.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/login"
              className="flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-lg text-white transition-all"
              style={{ background: 'linear-gradient(135deg, #7c5cfc, #9d7dff)', boxShadow: '0 0 30px rgba(124,92,252,0.5)' }}
            >
              <Brain size={20} /> Coba Sekarang
              <ArrowRight size={18} />
            </Link>
            <a href="#features" className="flex items-center gap-2 px-8 py-4 rounded-2xl font-medium text-sm border"
              style={{ borderColor: 'rgba(124,92,252,0.4)', color: '#9d7dff' }}>
              Lihat Fitur
            </a>
          </div>
        </motion.div>

        {/* Hero visual */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-20 relative"
        >
          <div className="rounded-2xl border overflow-hidden shadow-2xl mx-auto max-w-3xl"
            style={{ background: '#12121a', borderColor: '#2a2a40', boxShadow: '0 0 60px rgba(124,92,252,0.2)' }}>
            {/* Fake browser bar */}
            <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ background: '#0e0e1a', borderColor: '#2a2a40' }}>
              <div className="w-3 h-3 rounded-full" style={{ background: '#f87171' }} />
              <div className="w-3 h-3 rounded-full" style={{ background: '#fbbf24' }} />
              <div className="w-3 h-3 rounded-full" style={{ background: '#4ade80' }} />
              <div className="flex-1 mx-4 h-6 rounded" style={{ background: '#1a1a28' }} />
            </div>
            <div className="p-6 grid grid-cols-3 gap-4">
              {[
                { label: 'Total Ingatan', value: '248', icon: '🧠', color: '#7c5cfc' },
                { label: 'Bulan Ini', value: '34', icon: '📅', color: '#60a5fa' },
                { label: 'Kategori', value: '12', icon: '🗂️', color: '#34d399' },
              ].map(s => (
                <div key={s.label} className="rounded-xl p-4 text-left" style={{ background: '#0e0e1a', border: '1px solid #2a2a40' }}>
                  <div className="text-2xl mb-1">{s.icon}</div>
                  <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-xs" style={{ color: '#606080' }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div className="px-6 pb-6 grid grid-cols-2 gap-3">
              {['Beli susu besok pagi', 'Meeting klien jam 3 sore', 'Nama dokter: Dr. Ahmad Fauzi', 'Password WiFi: rumah123'].map(text => (
                <div key={text} className="rounded-xl p-3 text-left text-sm" style={{ background: '#0e0e1a', border: '1px solid #2a2a40', color: '#a0a0c0' }}>
                  🎤 {text}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 px-6 py-24 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-black mb-4">Fitur Lengkap</h2>
          <p style={{ color: '#a0a0c0' }}>Semua yang Anda butuhkan untuk mengelola ingatan</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-6 rounded-2xl border hover:border-opacity-60 transition-all"
              style={{ background: '#12121a', borderColor: '#2a2a40' }}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                style={{ background: `${f.color}20`, border: `1px solid ${f.color}40` }}>
                <f.icon size={22} style={{ color: f.color }} />
              </div>
              <h3 className="font-bold text-lg mb-2" style={{ color: '#e2e2ff' }}>{f.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: '#a0a0c0' }}>{f.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="relative z-10 px-6 py-24" style={{ background: 'rgba(124,92,252,0.05)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black mb-4">Dicintai Penggunanya</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-6 rounded-2xl border"
                style={{ background: '#12121a', borderColor: '#2a2a40' }}
              >
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.stars }).map((_, j) => (
                    <Star key={j} size={14} fill="#fbbf24" style={{ color: '#fbbf24' }} />
                  ))}
                </div>
                <p className="text-sm leading-relaxed mb-4" style={{ color: '#a0a0c0' }}>"{t.text}"</p>
                <div>
                  <p className="font-semibold text-sm" style={{ color: '#e2e2ff' }}>{t.name}</p>
                  <p className="text-xs" style={{ color: '#606080' }}>{t.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 px-6 py-24 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto"
        >
          <div className="inline-block p-1 rounded-3xl mb-8" style={{ background: 'linear-gradient(135deg, #7c5cfc40, #60a5fa40)' }}>
            <div className="px-8 py-12 rounded-3xl" style={{ background: '#0a0a0f' }}>
              <Brain size={48} className="mx-auto mb-6" style={{ color: '#7c5cfc' }} />
              <h2 className="text-4xl font-black mb-4">Mulai Sekarang</h2>
              <p className="mb-8" style={{ color: '#a0a0c0' }}>Gratis selamanya. Tidak perlu kartu kredit.</p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-lg text-white"
                style={{ background: 'linear-gradient(135deg, #7c5cfc, #9d7dff)', boxShadow: '0 0 30px rgba(124,92,252,0.5)' }}
              >
                <Brain size={20} /> Buat Akun Gratis
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t px-6 py-8 text-center text-sm" style={{ borderColor: '#2a2a40', color: '#606080' }}>
        <div className="flex items-center justify-center gap-2 mb-2">
          <Brain size={16} style={{ color: '#7c5cfc' }} />
          <span className="font-semibold" style={{ color: '#a0a0c0' }}>MemoryVault</span>
        </div>
        <p>© 2024 MemoryVault. Dibuat dengan ❤️ menggunakan React + Supabase.</p>
      </footer>
    </div>
  )
}
