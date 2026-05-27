import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatDistanceToNow } from 'date-fns'
import { id as idLocale, enUS } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRelativeTime(date: string, lang: 'id' | 'en' = 'id'): string {
  return formatDistanceToNow(new Date(date), {
    addSuffix: true,
    locale: lang === 'id' ? idLocale : enUS,
  })
}

export function truncateText(text: string, maxLength: number = 150): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trim() + '...'
}

export function generateId(): string {
  return crypto.randomUUID()
}

export function encryptApiKey(key: string): string {
  // Simple base64 encoding for storage (not real encryption - use Supabase RLS for security)
  return btoa(key)
}

export function decryptApiKey(encoded: string): string {
  try {
    return atob(encoded)
  } catch {
    return encoded
  }
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>
  return function (...args: Parameters<T>) {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export function exportToJSON(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function exportToTXT(data: string[], filename: string): void {
  const blob = new Blob([data.join('\n\n---\n\n')], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
