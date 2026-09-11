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
  // 알림에 담긴 주소는 같은 사이트 안일 때만 연다. 다른 도메인이면 홈으로 보낸다.
  let target = new URL("./", self.location.href).href;
  try {
    const candidate = new URL((event.notification.data && event.notification.data.url) || "./", self.location.origin);
    if (candidate.origin === self.location.origin) target = candidate.href;
  } catch (_) {}
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(windows => {
    for (const windowClient of windows) {
      if (windowClient.url === target && "focus" in windowClient) return windowClient.focus();
    }
    return clients.openWindow ? clients.openWindow(target) : null;
  }));
});
