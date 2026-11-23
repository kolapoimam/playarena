import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      // One service worker for the whole app. It also loads OneSignal's push worker,
      // and index.html points OneSignal at this file, so the two never fight over the root scope.
      filename: 'sw.js',
      manifest: {
        id: '/',
        name: 'SportCliq',
        short_name: 'SportCliq',
        description: 'Play football, join group rides and book sports venues near you in Nigeria.',
        lang: 'en-NG',
        dir: 'ltr',
        theme_color: '#F4F5F1',
        background_color: '#F4F5F1',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'portrait',
        scope: '/',
        start_url: '/?source=pwa',
        categories: ['sports', 'lifestyle', 'social'],
        prefer_related_applications: false,
        icons: [
          { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/maskable-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png', purpose: 'any' },
        ],
        shortcuts: [
          { name: 'Find a match', short_name: 'Matches', url: '/matches?source=shortcut', icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }] },
          { name: 'Organise a match', short_name: 'Organise', url: '/organize?source=shortcut', icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }] },
          { name: 'Cycling rides', short_name: 'Rides', url: '/cycling-activities?source=shortcut', icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }] },
          { name: 'My matches', short_name: 'My matches', url: '/profile/my-matches?source=shortcut', icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }] },
        ],
      },
      workbox: {
        importScripts: ['https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js'],
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest,woff2}'],
        globIgnores: ['**/navlogo.png', '**/playarena*.png', '**/PlayArenaCard.jpg'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/admin/, /^\/auth\/callback/, /\.txt$/, /\.xml$/],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin.includes('supabase.co'),
            handler: 'NetworkOnly',
          },
          {
            urlPattern: ({ url }) => url.origin.includes('paystack') || url.origin.includes('onesignal'),
            handler: 'NetworkOnly',
          },
          {
            urlPattern: ({ url }) => url.origin.includes('fonts.googleapis.com') || url.origin.includes('fontshare.com') || url.origin.includes('fonts.gstatic.com'),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'fonts', expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          {
            urlPattern: ({ url }) => url.origin.includes('api.dicebear.com'),
            handler: 'CacheFirst',
            options: { cacheName: 'avatars', expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 } },
          },
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'images', expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 14 } },
          },
        ],
      },
      includeAssets: [
        'favicon.ico',
        'favicon-16x16.png',
        'favicon-32x32.png',
        'apple-touch-icon.png',
        'robots.txt',
        'llms.txt',
        'og-image.png',
      ],
      devOptions: {
        enabled: false
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
