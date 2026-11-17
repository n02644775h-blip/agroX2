// FarmBridge / AgriConnect Push Notification & FCM Background Worker

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    if (event.data) {
      payload = event.data.json();
    }
  } catch {
    try {
      payload = { notification: { title: 'FarmBridge Alert', body: event.data.text() } };
    } catch {
      payload = {};
    }
  }

  const notification = payload.notification || {};
  const data = payload.data || {};
  const title = notification.title || data.title || 'FarmBridge Marketplace Update';
  const body =
    notification.body ||
    data.body ||
    'You have a new order update on FarmBridge.';
  const targetUrl = data.link || data.url || '/#orders';

  const options = {
    body,
    icon: notification.icon || '/assets/farmbridge-logo-white.png',
    badge: '/assets/farmbridge-logo-white.png',
    tag: data.orderId ? `farmbridge-order-${data.orderId}` : 'farmbridge-order-alert',
    renotify: true,
    requireInteraction: false,
    data: {
      ...data,
      url: targetUrl
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/#orders';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.postMessage({
            type: 'FARMBRIDGE_PUSH_CLICK',
            data: event.notification.data || {}
          });
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    })
  );
});
