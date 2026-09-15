import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import NexOfficeLauncher from './components/NexOfficeLauncher.tsx'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
      <NexOfficeLauncher />
    </ErrorBoundary>
  </StrictMode>,
)
