import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './atualizacao'
import App from './App'
import './styles.css'

// Pede ao navegador para não apagar o IndexedDB quando faltar espaço.
navigator.storage?.persist?.()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
