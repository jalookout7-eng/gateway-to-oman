export type NavItem = { href: string; label: string; icon: string };

// The 4 bar slots that keep direct tabs; the 5th slot is the Menu button.
export const MOBILE_BAR_HREFS = [
  "/admin",
  "/admin/leads",
  "/admin/listings",
  "/admin/inquiries",
];

// Sheet order per spec — Calendar first (it lost its bar slot).
const SHEET_HREF_ORDER = [
  "/admin/calendar",
  "/admin/sellers",
  "/admin/users",
  "/admin/conversations",
  "/admin/activity",
  "/admin/settings",
];

export function sheetItems(all: NavItem[]): NavItem[] {
  return SHEET_HREF_ORDER.map((href) => all.find((i) => i.href === href)).filter(
    (i): i is NavItem => Boolean(i)
  );
}

export function isSheetRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return SHEET_HREF_ORDER.some(
    (href) => pathname === href || pathname.startsWith(`${href}/`)
  );
}
