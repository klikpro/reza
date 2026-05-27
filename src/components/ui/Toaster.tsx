import { useState, useCallback, createContext, useContext, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

interface ToastContextType {
  toast: (message: string, type?: Toast['type']) => void
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

let globalToast: ToastContextType['toast'] = () => {}

export function setGlobalToast(fn: ToastContextType['toast']) {
  globalToast = fn
}

export function toast(message: string, type: Toast['type'] = 'info') {
  globalToast(message, type)
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }, [])

  // Register global
  setGlobalToast(addToast)

  const icons = {
    success: <CheckCircle size={16} />,
    error: <AlertCircle size={16} />,
    info: <Info size={16} />,
  }

  const colors = {
    success: { bg: 'rgba(74,222,128,0.15)', border: 'rgba(74,222,128,0.3)', text: '#4ade80' },
    error: { bg: 'rgba(248,113,113,0.15)', border: 'rgba(248,113,113,0.3)', text: '#f87171' },
    info: { bg: 'rgba(124,92,252,0.15)', border: 'rgba(124,92,252,0.3)', text: 'var(--accent)' },
  }

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(t => {
          const c = colors[t.type]
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 60, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.9 }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl border text-sm max-w-sm pointer-events-auto shadow-lg"
              style={{ background: c.bg, borderColor: c.border, color: 'var(--text-primary)', backdropFilter: 'blur(8px)' }}
            >
              <span style={{ color: c.text }}>{icons[t.type]}</span>
              <span className="flex-1">{t.message}</span>
              <button
                onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
                style={{ color: 'var(--text-muted)' }}
                className="pointer-events-auto"
              >
                <X size={14} />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
