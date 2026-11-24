// Minimal types for the OneSignal Web SDK v16, loaded from index.html.
export interface OneSignalV16 {
  login: (externalId: string) => Promise<void>;
  logout: () => Promise<void>;
  User: {
    externalId?: string | null;
    addTag: (key: string, value: string) => void;
    PushSubscription: { id?: string | null; optedIn?: boolean; optIn: () => Promise<void> };
  };
  Notifications: { permission: boolean; requestPermission: () => Promise<void> };
}

declare global {
  interface Window {
    OneSignalDeferred?: Array<(os: OneSignalV16) => void | Promise<void>>;
  }
}

/** Runs fn once OneSignal has loaded and initialised. Errors are logged, never thrown. */
export {};
