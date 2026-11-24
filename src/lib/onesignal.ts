import type { OneSignalV16 } from "@/types/onesignal";

/** Runs fn once OneSignal has loaded and initialised. Errors are logged, never thrown. */
export function withOneSignal(fn: (os: OneSignalV16) => void | Promise<void>) {
  if (typeof window === "undefined") return;
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async (os) => {
    try { await fn(os); } catch (e) { console.warn("OneSignal", e); }
  });
}

/** Links this device to the signed in SportCliq user so the server can push to them. */
export function linkPushUser(userId?: string | null) {
  withOneSignal(async (os) => {
    if (userId) {
      if (os.User.externalId !== userId) await os.login(userId);
      os.User.addTag("user_id", userId);
    } else if (os.User.externalId) {
      await os.logout();
    }
  });
}
