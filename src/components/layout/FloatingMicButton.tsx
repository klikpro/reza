import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Square, Pause, Play } from 'lucide-react'
import { useVoiceStore } from '@/store/useVoiceStore'
import { useAuthStore } from '@/store/useAuthStore'
import { useMemoryStore } from '@/store/useMemoryStore'
import { useSettingsStore } from '@/store/useSettingsStore'
import { WebSpeechSTT } from '@/services/sttService'
import VoiceRecorderModal from '@/components/voice/VoiceRecorderModal'

export default function FloatingMicButton() {
  const [modalOpen, setModalOpen] = useState(false)
  const { voiceState } = useVoiceStore()

  const isActive = voiceState !== 'idle' && voiceState !== 'error'

  return (
    <>
      <motion.button
        id="floating-mic-btn"
        onClick={() => setModalOpen(true)}
        className="fixed bottom-20 right-6 md:bottom-8 md:right-8 z-40 w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
        style={{
          background: isActive
            ? 'linear-gradient(135deg, #ef4444, #f97316)'
            : 'linear-gradient(135deg, var(--accent), var(--accent-light))',
          boxShadow: isActive
            ? '0 0 20px rgba(239,68,68,0.5)'
            : '0 0 20px rgba(124,92,252,0.4)',
        }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        animate={isActive ? { scale: [1, 1.05, 1] } : {}}
        transition={isActive ? { repeat: Infinity, duration: 1.5 } : {}}
      >
        {isActive ? <MicOff size={22} className="text-white" /> : <Mic size={22} className="text-white" />}

        {/* Pulse ring when active */}
        {isActive && (
          <span
            className="absolute inset-0 rounded-full animate-ping opacity-40"
            style={{ background: '#ef4444' }}
          />
        )}
      </motion.button>

      <VoiceRecorderModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  )
}
