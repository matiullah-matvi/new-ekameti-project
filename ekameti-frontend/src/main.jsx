import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

import App from './App.jsx'
import { LanguageProvider } from './context/LanguageContext.jsx'

// #region agent log
// Global runtime error capture (helps when pages are blank / React crashes early)
window.addEventListener('error', (event) => {
  try {
    fetch('http://127.0.0.1:7242/ingest/d347dbc0-ed63-420d-af24-1cc526296fcc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'pre-fix',
        hypothesisId: 'H5',
        location: 'src/main.jsx:window.error',
        message: 'Global error',
        data: {
          message: String(event?.message || ''),
          filename: String(event?.filename || ''),
          lineno: event?.lineno,
          colno: event?.colno,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {})
  } catch (_) {}
})
window.addEventListener('unhandledrejection', (event) => {
  try {
    fetch('http://127.0.0.1:7242/ingest/d347dbc0-ed63-420d-af24-1cc526296fcc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'pre-fix',
        hypothesisId: 'H5',
        location: 'src/main.jsx:unhandledrejection',
        message: 'Unhandled rejection',
        data: { reason: String(event?.reason || '') },
        timestamp: Date.now(),
      }),
    }).catch(() => {})
  } catch (_) {}
})
fetch('http://127.0.0.1:7242/ingest/d347dbc0-ed63-420d-af24-1cc526296fcc', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionId: 'debug-session',
    runId: 'pre-fix',
    hypothesisId: 'H5',
    location: 'src/main.jsx:boot',
    message: 'Frontend boot (before React render)',
    data: { href: window.location.href },
    timestamp: Date.now(),
  }),
}).catch(() => {})
// #endregion

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </StrictMode>,
)
