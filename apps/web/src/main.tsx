import { createRoot } from 'react-dom/client'
import { StrictMode } from 'react'
import { App } from './App'

const appEnv = import.meta.env.VITE_APP_ENV
if (appEnv && appEnv !== 'production') {
  document.title = `${document.title} - ${appEnv}`
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
