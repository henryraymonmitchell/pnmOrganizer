self.addEventListener("push", (event) => {
  const payload = event.data ? event.data.json() : {};
  const title = payload.title || "Rush";
  const options = {
    body: payload.body || "You have a new update.",
    data: { url: payload.url || "/pnm" },
    tag: payload.tag || "rush-update",
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});
