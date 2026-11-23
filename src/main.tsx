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

// Register service worker with enhanced error handling
const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/', // Explicitly set scope
      });
      console.log('ServiceWorker registration successful with scope:', registration.scope);

      // Listen for service worker messages for debugging
      navigator.serviceWorker.addEventListener('message', (event) => {
        console.log('ServiceWorker message received:', event.data);
      });

      // Handle controller changes
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        console.log('ServiceWorker update found:', newWorker?.state);
      });
    } catch (err) {
      console.error('ServiceWorker registration failed:', err);
    }
  } else {
    console.warn('ServiceWorker not supported in this browser');
  }
};

// Register service worker after critical resources load
if (document.readyState === 'complete') {
  registerServiceWorker();
} else {
  window.addEventListener('load', registerServiceWorker);
}

// Debug: Catch unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.warn('Unhandled promise rejection:', event.reason);
});
