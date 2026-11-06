import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { arrayUnion, doc, setDoc } from 'firebase/firestore';
import { app, auth, db, firebaseConfig } from './firebase';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;
const PUSH_URL = import.meta.env.VITE_PUSH_URL;

export type PushStatus = 'granted' | 'denied' | 'unsupported' | 'unconfigured';

export const isPushConfigured = () => !!VAPID_KEY && !!PUSH_URL;

/** Запрашивает разрешение, регистрирует service worker и сохраняет FCM-токен в профиле. */
export async function enablePush(uid: string): Promise<PushStatus> {
  if (!isPushConfigured()) return 'unconfigured';
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !(await isSupported())) return 'unsupported';

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return 'denied';

  // service worker не видит import.meta.env, поэтому публичный конфиг передаём через query-строку
  const params = new URLSearchParams({
    apiKey: firebaseConfig.apiKey ?? '',
    authDomain: firebaseConfig.authDomain,
    projectId: firebaseConfig.projectId,
    messagingSenderId: firebaseConfig.messagingSenderId,
    appId: firebaseConfig.appId,
  });
  const registration = await navigator.serviceWorker.register(
    `${import.meta.env.BASE_URL}firebase-messaging-sw.js?${params.toString()}`
  );
  const token = await getToken(getMessaging(app), { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
  if (!token) return 'unsupported';

  await setDoc(doc(db, 'users', uid), { fcmTokens: arrayUnion(token) }, { merge: true });
  return 'granted';
}

/** Просит Apps Script отправить push получателю. Не блокирует отправку сообщения. */
export function notifyReceiver(receiverId: string, preview: string) {
  const user = auth.currentUser;
  if (!PUSH_URL || !user || receiverId === user.uid) return;
  user
    .getIdToken()
    .then((idToken) =>
      fetch(PUSH_URL, {
        method: 'POST',
        mode: 'no-cors', // Apps Script не отдаёт CORS-заголовки; ответ нам не нужен
        keepalive: true,
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ idToken, receiverId, preview: preview.slice(0, 120) }),
      })
    )
    .catch(() => {});
}
