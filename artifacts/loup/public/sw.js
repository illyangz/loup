/*
 * Loup service worker — intentionally minimal.
 * Exists to make the app installable (Chromium requires a fetch handler).
 * No caching: every request goes straight to the network, so users always
 * see live household data and fresh deployments without stale-cache issues.
 */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Network passthrough — do not intercept.
});
