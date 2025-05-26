// OneSignalSDKUpdaterWorker.js
// This file handles updates for the service worker
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());
