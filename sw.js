self.addEventListener("push", event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (_) {}
  event.waitUntil(self.registration.showNotification(data.title || "같이놀자 결과 도착", {
    body: data.body || "상대가 게임·테스트를 끝냈어요.",
    icon: data.icon || "./og-image.png",
    badge: data.badge || "./og-image.png",
    tag: data.tag || "gatchi-result",
    renotify: true,
    data: { url: data.url || "./" }
  }));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || "./", self.location.origin).href;
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(windows => {
    for (const windowClient of windows) {
      if (windowClient.url === target && "focus" in windowClient) return windowClient.focus();
    }
    return clients.openWindow ? clients.openWindow(target) : null;
  }));
});
