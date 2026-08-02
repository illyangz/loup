/*
 * Loup service worker.
 * - No caching: every request goes straight to the network, so users always
 *   see live household data and fresh deployments without stale-cache issues.
 * - Handles Web Push: shows notifications for Pack messages and approval
 *   requests, and deep-links into the app when tapped.
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

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : "" };
  }
  const title = payload.title || "Loup";
  const options = {
    body: payload.body || "",
    tag: payload.tag || undefined,
    icon: new URL("icons/icon-192.png", self.registration.scope).href,
    badge: new URL("icons/icon-192.png", self.registration.scope).href,
    data: { url: payload.url || "/household" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  // Resolve the deep link against the SW scope so the app's base path is kept.
  const relative = (event.notification.data?.url || "/household").replace(/^\//, "");
  const target = new URL(relative, self.registration.scope).href;
  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of clientList) {
        if (client.url.startsWith(self.registration.scope) && "focus" in client) {
          await client.focus();
          if ("navigate" in client) {
            try {
              await client.navigate(target);
            } catch {
              // Ignore — app is focused, which is the important part.
            }
          }
          return;
        }
      }
      await self.clients.openWindow(target);
    })(),
  );
});
