"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff, BellRing, Smartphone } from "lucide-react";

/**
 * Browser-push opt-in chip for the admin shell.
 *
 * Notes 6 fix — JA reported no permission prompt on iOS after installing
 * the PWA. Root cause: the old auto-on-mount path in `app/admin/layout.tsx`
 * called `Notification.requestPermission()` from inside a useEffect.
 *
 * Apple's iOS Safari (16.4+) silently rejects permission requests that
 * don't originate from a synchronous user-gesture click handler — no
 * error, no prompt. Chrome/Android tolerated the old path, so the bug
 * only showed up once Ahmed tried to install the PWA on iPhone.
 *
 * This component:
 *   1. Detects browser support, current permission state, and iOS standalone mode
 *   2. Shows an explicit "Enable notifications" BUTTON when permission is `default`
 *   3. Click handler synchronously calls `Notification.requestPermission()`
 *      → satisfies the iOS user-gesture requirement
 *   4. After grant, silently subscribes via PushManager and POSTs to
 *      `/api/admin/push/subscribe`
 *   5. Auto-resubscribes silently when permission is already `granted` (e.g.
 *      after a fresh install where the cookie session is restored but the
 *      service worker hasn't subscribed yet)
 *   6. On iOS Safari NOT in standalone mode, surfaces a hint to install to
 *      home screen first — iOS won't even expose PushManager there
 */

type NotifState =
  | "loading"
  | "unsupported"
  | "ios-needs-pwa"
  | "default"
  | "granted"
  | "denied"
  | "subscribed";

export function NotificationOptIn() {
  const [state, setState] = useState<NotifState>("loading");
  const [working, setWorking] = useState(false);

  const subscribe = useCallback(async (): Promise<boolean> => {
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) return false;
      const existing = await reg.pushManager.getSubscription();
      const sub =
        existing ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidKey,
        }));
      await fetch("/api/admin/push/subscribe", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      return true;
    } catch (err) {
      console.warn("Push subscribe failed:", err);
      return false;
    }
  }, []);

  // Initial state detection — runs on mount, never requests permission
  // (that requires a user gesture, handled by the button below).
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    ) {
      setState("unsupported");
      return;
    }

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    if (isIOS && !isStandalone) {
      setState("ios-needs-pwa");
      return;
    }

    const permission = Notification.permission;
    if (permission === "denied") {
      setState("denied");
      return;
    }
    if (permission === "granted") {
      // Already granted — silently (re)subscribe in case service worker
      // lost its subscription or this is a fresh device.
      subscribe().then((ok) => setState(ok ? "subscribed" : "granted"));
      return;
    }
    setState("default");
  }, [subscribe]);

  // The CRITICAL piece — Notification.requestPermission() is called inside
  // this synchronous click handler so iOS Safari accepts the gesture.
  const handleEnableClick = useCallback(async () => {
    if (working) return;
    setWorking(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        const ok = await subscribe();
        setState(ok ? "subscribed" : "granted");
      } else if (permission === "denied") {
        setState("denied");
      }
      // If user dismissed without choosing, leave state as "default" so they
      // can try again.
    } finally {
      setWorking(false);
    }
  }, [subscribe, working]);

  // Hidden states — nothing useful to show
  if (state === "loading" || state === "unsupported" || state === "subscribed") {
    return null;
  }

  if (state === "ios-needs-pwa") {
    return (
      <div
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-amber-700 bg-amber-50 ring-1 ring-amber-200"
        title="Install to home screen via Safari Share menu → Add to Home Screen. Then open the app from your home screen and enable notifications."
      >
        <Smartphone className="h-3.5 w-3.5" />
        Install to home screen first
      </div>
    );
  }

  if (state === "denied") {
    return (
      <div
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-gray-500 bg-gray-100 ring-1 ring-gray-200"
        title="Notifications were declined. Re-enable in your browser/OS settings for gatewaytooman.com, then reload this page."
      >
        <BellOff className="h-3.5 w-3.5" />
        Blocked
      </div>
    );
  }

  // state === "default" or "granted-but-resubscribe-failed"
  return (
    <button
      type="button"
      onClick={handleEnableClick}
      disabled={working}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold text-gold bg-gold/10 ring-1 ring-gold/30 hover:bg-gold/20 transition-colors disabled:opacity-50"
    >
      {working ? (
        <Bell className="h-3.5 w-3.5 animate-pulse" />
      ) : (
        <BellRing className="h-3.5 w-3.5" />
      )}
      {working ? "Enabling…" : "Enable notifications"}
    </button>
  );
}
