"use client";

import { useEffect } from "react";
import Link from "next/link";
import type { NavItem } from "@/lib/admin/mobile-nav";

/**
 * Bottom sheet for the mobile admin nav (spec 2026-07-25). Open state +
 * pathname come from the layout; the component handles Escape dismissal
 * itself so the aria-modal contract has a keyboard exit. Sits above the
 * bottom nav (z-50 vs nav z-40); the nav stays visible beneath the sheet.
 */
export function MobileMenuSheet({
  items,
  open,
  onClose,
  pathname,
}: {
  items: NavItem[];
  open: boolean;
  onClose: () => void;
  pathname: string | null;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="md:hidden fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="More menu">
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />
      <div className="absolute bottom-[68px] left-0 right-0 bg-navy border-t border-white/10 rounded-t-2xl py-2 animate-sheet-up">
        {items.map((item) => {
          const active =
            pathname === item.href || (pathname?.startsWith(`${item.href}/`) ?? false);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 px-5 py-3.5 text-sm transition-colors ${
                active ? "text-gold bg-gold/10" : "text-white/80 hover:bg-white/5"
              }`}
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
