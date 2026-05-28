"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { LogOut, User as UserIcon, CheckCircle2 } from "lucide-react";

/**
 * Minimal profile menu shown in the marketplace header when a user is signed
 * in. Replaces the "Sign in" button. Click the chip → small dropdown with
 * name, email, access status, and a sign-out action.
 *
 * Why client-side: the dropdown open/close + sign-out POST need interactivity.
 * The user object is read server-side in BusinessesHeader and passed down as
 * props (no per-render API roundtrip).
 */

interface ProfileMenuProps {
  user: {
    full_name: string;
    email: string;
    access_activated: boolean;
  };
}

export function ProfileMenu({ user }: ProfileMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close on outside click — standard dropdown behaviour.
  useEffect(() => {
    function onDocumentClick(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDocumentClick);
    return () => document.removeEventListener("mousedown", onDocumentClick);
  }, [open]);

  const firstName = user.full_name.split(/\s+/)[0] ?? user.full_name;

  async function handleSignOut() {
    await fetch("/api/businesses/sign-out", {
      method: "POST",
      credentials: "include",
    }).catch(() => {
      // Even if the server call fails, push the user to a fresh page so the
      // stale client state clears.
    });
    // Refresh the layout — the server header will re-render without the user
    // and the Sign-in button comes back.
    router.refresh();
    router.push("/businesses");
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-navy hover:border-gold hover:text-gold transition-all"
      >
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gold/15 text-gold">
          <UserIcon className="h-3.5 w-3.5" />
        </span>
        <span className="hidden sm:inline">Hi, {firstName}</span>
        <span className="sm:hidden">Profile</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-72 rounded-xl border border-gray-200 bg-white shadow-lg z-40"
        >
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-navy truncate">{user.full_name}</p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
            <div className="mt-2 inline-flex items-center gap-1.5 text-xs">
              {user.access_activated ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-emerald-700 font-medium">Subscriber access</span>
                </>
              ) : (
                <span className="text-amber-700 font-medium">Awaiting access activation</span>
              )}
            </div>
          </div>
          <div className="py-1.5">
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-navy text-left"
            >
              <LogOut className="h-4 w-4 text-gray-400" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
