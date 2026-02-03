/**
 * issy Frontend Entry Point
 * Note: CSS is loaded separately via <link> tag, not imported here
 * to avoid Bun bundling issues with Tailwind's jiti dependency
 */

import { createRoot } from 'react-dom/client'
import { App } from './App'

function start() {
  const container = document.getElementById('root')
  if (!container) throw new Error('Root element not found')
  const root = createRoot(container)
  root.render(<App />)
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start)
} else {
  start()
}
