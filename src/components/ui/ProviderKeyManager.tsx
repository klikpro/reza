import { useState } from 'react'
import { Plus, X, Eye, EyeOff, Check, ChevronDown, ChevronUp } from 'lucide-react'
import type { ProviderKeys } from '@/types'

export interface ProviderDef {
  id: string
  label: string
  emoji: string
  description: string
  freeKey?: boolean   // true = tidak butuh API key
  keyPlaceholder?: string
  keyLabel?: string
}

interface Props {
  title: string
  icon: React.ReactNode
  providers: ProviderDef[]
  activeProvider: string
  keys: ProviderKeys          // { providerId: string[] }
  onActivate: (id: string) => void
  onKeysChange: (keys: ProviderKeys) => void
}

export default function ProviderKeyManager({
  title, icon, providers, activeProvider, keys, onActivate, onKeysChange
}: Props) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showKey, setShowKey] = useState<Record<string, boolean>>({})
  const [newKey, setNewKey] = useState<Record<string, string>>({})

  const addKey = (providerId: string) => {
    const val = (newKey[providerId] || '').trim()
    if (!val) return
    const cur = keys[providerId] || []
    onKeysChange({ ...keys, [providerId]: [...cur, val] })
    setNewKey(n => ({ ...n, [providerId]: '' }))
  }

  const removeKey = (providerId: string, idx: number) => {
    const cur = [...(keys[providerId] || [])]
    cur.splice(idx, 1)
    onKeysChange({ ...keys, [providerId]: cur })
  }

  return (
    <section className="card p-4 space-y-2">
      <h2 className="flex items-center gap-2 text-base font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
        {icon} {title}
      </h2>

      {providers.map(p => {
        const isActive = activeProvider === p.id
        const providerKeys = keys[p.id] || []
        const isOpen = expanded === p.id
        const hasKeys = p.freeKey || providerKeys.length > 0

        return (
          <div key={p.id}
            className="rounded-xl border transition-all overflow-hidden"
            style={{
              borderColor: isActive ? 'var(--accent)' : 'rgba(6,182,212,0.15)',
              background: isActive ? 'rgba(6,182,212,0.04)' : 'rgba(255,255,255,0.5)',
              boxShadow: isActive ? '0 0 0 2px rgba(6,182,212,0.15)' : undefined,
            }}>

            {/* Provider header row */}
            <div className="flex items-center gap-3 px-3 py-2.5">
              <span className="text-lg w-6 text-center">{p.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{p.label}</p>
                <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{p.description}</p>
              </div>

              {/* Key count badge */}
              {!p.freeKey && providerKeys.length > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                  style={{ background: 'rgba(6,182,212,0.12)', color: 'var(--accent)' }}>
                  {providerKeys.length} key
                </span>
              )}
              {p.freeKey && (
                <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                  style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                  Gratis
                </span>
              )}

              {/* Activate button */}
              <button
                onClick={() => { onActivate(p.id); if (!p.freeKey) setExpanded(isOpen ? null : p.id) }}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg font-semibold transition-all"
                style={{
                  background: isActive ? 'var(--accent)' : 'rgba(6,182,212,0.1)',
                  color: isActive ? 'white' : 'var(--accent)',
                }}>
                {isActive ? <><Check size={11} /> Aktif</> : 'Pakai'}
              </button>

              {/* Expand toggle (non-free) */}
              {!p.freeKey && (
                <button onClick={() => setExpanded(isOpen ? null : p.id)}
                  className="p-1 rounded-lg" style={{ color: 'var(--text-muted)' }}>
                  {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              )}
            </div>

            {/* Expanded: key management */}
            {!p.freeKey && isOpen && (
              <div className="px-3 pb-3 pt-1 border-t space-y-2" style={{ borderColor: 'rgba(6,182,212,0.1)' }}>
                <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                  {p.keyLabel || 'API Keys'} — bisa tambah lebih dari satu, sistem akan rotasi otomatis
                </p>

                {/* Existing keys */}
                {providerKeys.map((k, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        readOnly
                        type={showKey[`${p.id}-${idx}`] ? 'text' : 'password'}
                        value={k}
                        className="input-field text-xs"
                        style={{ paddingRight: 64, background: 'rgba(255,255,255,0.9)' }}
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                        <button onClick={() => setShowKey(s => ({ ...s, [`${p.id}-${idx}`]: !s[`${p.id}-${idx}`] }))}
                          style={{ color: 'var(--text-muted)' }}>
                          {showKey[`${p.id}-${idx}`] ? <EyeOff size={12} /> : <Eye size={12} />}
                        </button>
                      </div>
                    </div>
                    <button onClick={() => removeKey(p.id, idx)}
                      className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                      style={{ color: 'var(--error)' }}>
                      <X size={13} />
                    </button>
                  </div>
                ))}

                {/* Add new key */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={p.keyPlaceholder || 'Masukkan API Key baru...'}
                    value={newKey[p.id] || ''}
                    onChange={e => setNewKey(n => ({ ...n, [p.id]: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && addKey(p.id)}
                    className="input-field text-xs flex-1"
                    style={{ background: 'rgba(255,255,255,0.9)' }}
                  />
                  <button
                    onClick={() => addKey(p.id)}
                    disabled={!(newKey[p.id] || '').trim()}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all"
                    style={{ background: 'var(--accent)', opacity: !(newKey[p.id] || '').trim() ? 0.5 : 1 }}>
                    <Plus size={12} /> Tambah
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </section>
  )
}
