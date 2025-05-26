// service-worker.js
// Define the OneSignal SDK worker location using locally hosted files
importScripts('/OneSignalSDKWorker.js');

// Service Worker installation event
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installed');
  self.skipWaiting(); // Activate this service worker immediately
});

// Service Worker activation event
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activated');
  event.waitUntil(self.clients.claim()); // Take control of all clients immediately
});

// Push event to handle incoming notifications
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push Received:', event.data ? event.data.text() : 'No data');
  const data = event.data ? event.data.json() : {};
  const { title, body, icon } = data;

  const options = {
    body: body || 'You have a new notification!',
    icon: icon || '/icons/icon-192x192.png',
    data: {
      url: data.url || '/',
    },
  };

  event.waitUntil(
    self.registration.showNotification(title || 'Sport Cliq', options)
  );
});

// Notification click event to handle user interaction
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification Clicked');
  event.notification.close();

  const urlToOpen = event.notification.data.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
