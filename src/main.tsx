import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// First render the app
const root = createRoot(document.getElementById('root')!)
root.render(<App />)

// Then register service worker
const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js')
      console.log('ServiceWorker registration successful with scope: ', registration.scope)
    } catch (err) {
      console.log('ServiceWorker registration failed: ', err)
    }
  }
}

// Wait for critical resources to load
if (document.readyState === 'complete') {
  registerServiceWorker()
} else {
  window.addEventListener('load', registerServiceWorker)
}
