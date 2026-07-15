self.addEventListener("push", (event) => {
  let payload = { title: "UstaTop", body: "", data: {} };

  try {
    payload = event.data?.json() ?? payload;
  } catch {
    payload.body = event.data?.text() ?? "";
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/globe.svg",
      badge: "/globe.svg",
      data: payload.data ?? {},
      tag: payload.notificationId ?? payload.type ?? "ustatop",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = event.notification.data ?? {};
  const orderId = data.orderId;
  const url = orderId ? `/orders/${orderId}` : "/orders";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        return clients.openWindow(url);
      }),
  );
});
