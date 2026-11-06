/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_IMGBB_API_KEY: string;
  readonly VITE_FIREBASE_VAPID_KEY: string;
  readonly VITE_PUSH_URL: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
