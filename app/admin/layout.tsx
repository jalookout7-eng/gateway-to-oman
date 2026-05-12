"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4" },
  { href: "/admin/leads", label: "Leads", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
  { href: "/admin/listings", label: "Listings", icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2H7a2 2 0 00-2 2v2m3 4h.01M11 15h.01M15 15h.01" },
  { href: "/admin/sellers", label: "Sellers", icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" },
  { href: "/admin/inquiries", label: "Inquiries", icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
  { href: "/admin/calendar", label: "Calendar", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
  { href: "/admin/conversations", label: "Conversations", icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" },
  { href: "/admin/activity", label: "Activity", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
  { href: "/admin/settings", label: "Settings", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
];

// Mobile bottom nav shows the 5 most-used items; rest reachable via desktop sidebar or direct URL.
const MOBILE_NAV_HREFS = new Set(["/admin", "/admin/leads", "/admin/listings", "/admin/inquiries", "/admin/calendar"]);

type SessionUser = {
  id: string;
  email: string;
  full_name: string | null;
  role: "owner" | "admin" | "viewer";
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [mode, setMode] = useState<"email" | "token">("email");
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // Prefer session cookie via /api/auth/me; fall back to localStorage admin_token.
    (async () => {
      try {
        const meRes = await fetch("/api/auth/me", { credentials: "include" });
        if (meRes.ok) {
          const data = await meRes.json();
          if (data.user) {
            setSessionUser(data.user);
            setAuthenticated(true);
            setChecking(false);
            return;
          }
        }
      } catch {
        // fall through to token check
      }
      const saved = localStorage.getItem("admin_token");
      if (saved) {
        verifyToken(saved);
      } else {
        setChecking(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!authenticated) return;

    async function registerPush() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidKey) return;
        const existing = await reg.pushManager.getSubscription();
        const sub = existing ?? await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidKey,
        });

        const savedToken = localStorage.getItem("admin_token") ?? "";
        await fetch("/api/admin/push/subscribe", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${savedToken}`,
          },
          body: JSON.stringify(sub.toJSON()),
        });
      } catch (err) {
        console.warn("Push registration failed:", err);
      }
    }

    registerPush();
  }, [authenticated]);

  async function verifyToken(t: string) {
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: t }),
      });
      if (res.ok) {
        localStorage.setItem("admin_token", t);
        setAuthenticated(true);
      } else {
        localStorage.removeItem("admin_token");
        setError("Invalid token");
      }
    } catch {
      setError("Connection error");
    } finally {
      setChecking(false);
    }
  }

  async function handleTokenLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSigningIn(true);
    await verifyToken(token);
    setSigningIn(false);
  }

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSigningIn(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Sign-in failed");
        return;
      }
      const data = await res.json();
      setSessionUser(data.user);
      setAuthenticated(true);
    } catch {
      setError("Connection error");
    } finally {
      setSigningIn(false);
    }
  }

  async function handleLogout() {
    if (sessionUser) {
      try {
        await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      } catch {
        // ignore
      }
    }
    localStorage.removeItem("admin_token");
    setSessionUser(null);
    setAuthenticated(false);
    setToken("");
    setEmail("");
    setPassword("");
    router.push("/admin");
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm">
          <div className="flex justify-center pb-2">
            <Image
              src="/gto-logo.png"
              alt="Gateway to Oman"
              width={200}
              height={64}
              priority
              className="h-14 w-auto"
            />
          </div>
          <h1 className="text-xl font-bold text-navy text-center mt-2">Admin Sign-in</h1>
          <p className="text-sm text-gray-500 text-center mt-1">
            {mode === "email" ? "Sign in with your admin account." : "Use the legacy admin token."}
          </p>

          {mode === "email" ? (
            <form onSubmit={handleEmailLogin} className="mt-6 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  placeholder="you@example.com"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 pr-11 rounded-lg border border-gray-200 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-navy transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={signingIn}
                className="w-full py-3 rounded-lg gold-gradient text-white font-semibold text-sm hover:shadow-lg transition-shadow disabled:opacity-60"
              >
                {signingIn ? "Signing in…" : "Sign In"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleTokenLogin} className="mt-6 space-y-3">
              <div className="relative">
                <input
                  type={showToken ? "text" : "password"}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Admin token"
                  className="w-full px-4 py-3 pr-11 rounded-lg border border-gray-200 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
                />
                <button
                  type="button"
                  onClick={() => setShowToken((v) => !v)}
                  aria-label={showToken ? "Hide token" : "Show token"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-navy transition-colors"
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={signingIn}
                className="w-full py-3 rounded-lg gold-gradient text-white font-semibold text-sm hover:shadow-lg transition-shadow disabled:opacity-60"
              >
                {signingIn ? "Verifying…" : "Sign In with Token"}
              </button>
            </form>
          )}

          <button
            type="button"
            onClick={() => {
              setError("");
              setMode((m) => (m === "email" ? "token" : "email"));
            }}
            className="block mx-auto mt-5 text-xs text-gray-500 hover:text-gold transition-colors"
          >
            {mode === "email" ? "Use legacy admin token instead" : "Sign in with email and password"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar — hidden on mobile, flex column on desktop */}
      <aside className="hidden md:flex w-60 bg-navy text-white flex-col fixed h-full z-40">
        <div className="px-5 py-6 border-b border-white/10">
          <Image
            src="/gto-logo.png"
            alt="Gateway to Oman"
            width={180}
            height={56}
            priority
            className="h-10 w-auto mb-2"
          />
          <p className="text-xs text-white/60 mt-1">Admin Dashboard</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  active
                    ? "bg-gold/20 text-gold"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-3 py-4 border-t border-white/10">
          {sessionUser && (
            <div className="px-3 pb-3 text-xs">
              <p className="text-white/90 font-medium truncate">
                {sessionUser.full_name ?? sessionUser.email}
              </p>
              <p className="text-white/40 truncate">
                {sessionUser.email} · {sessionUser.role}
              </p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/70 hover:bg-white/5 hover:text-white w-full transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="md:ml-60 pb-20 md:pb-0 min-h-screen"><div className="p-4 md:p-8">{children}</div></main>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-navy border-t border-white/10 flex md:hidden z-40">
        {NAV_ITEMS.filter((item) => MOBILE_NAV_HREFS.has(item.href)).map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors ${
                active ? "text-gold" : "text-white/60"
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
