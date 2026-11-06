/* Service worker для push-уведомлений (Firebase Cloud Messaging).
   Конфиг приходит через query-строку при регистрации (см. src/services/push.ts). */
importScripts('https://www.gstatic.com/firebasejs/10.10.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.10.0/firebase-messaging-compat.js');

const p = new URL(self.location.href).searchParams;
firebase.initializeApp({
  apiKey: p.get('apiKey'),
  authDomain: p.get('authDomain'),
  projectId: p.get('projectId'),
  messagingSenderId: p.get('messagingSenderId'),
  appId: p.get('appId'),
});

// Сообщения с блоком "notification" браузер показывает сам, клик ведёт по webpush.fcm_options.link.
firebase.messaging();
