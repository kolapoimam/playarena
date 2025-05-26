// OneSignalSDKWorker.js
// This file delegates to OneSignal's SDK for service worker logic
// No additional imports needed; OneSignal handles this internally via init
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());
