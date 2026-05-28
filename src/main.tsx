import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './App'

// Bersihkan cache settings lama dari localStorage agar tidak override data Supabase
// Ini one-time cleanup untuk user yang sudah punya cache lama
if (localStorage.getItem('memoryvault-settings')) {
  localStorage.removeItem('memoryvault-settings')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
