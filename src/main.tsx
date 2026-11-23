import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// The redesigned app is light mode only.
document.documentElement.classList.remove('dark');
try {
  localStorage.setItem('theme', 'light');
} catch {
  /* ignore */
}

// Debug: Log to check for Rb.Configuration
if (typeof window.Rb !== 'undefined') {
  console.log('Rb exists:', window.Rb, 'Rb.Configuration:', window.Rb.Configuration);
} else {
  console.log('Rb is undefined');
}

// First render the app
const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('Root element not found');
  throw new Error('Root element not found');
}
const root = createRoot(rootElement);
root.render(<App />);

// The service worker (sw.js) is generated and registered by vite-plugin-pwa (see vite.config.ts).
// Registering it at the root scope replaces the older hand-written worker automatically.

// Debug: Catch unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.warn('Unhandled promise rejection:', event.reason);
});
