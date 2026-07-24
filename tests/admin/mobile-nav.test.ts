import { describe, it, expect } from "vitest";
import {
  MOBILE_BAR_HREFS,
  sheetItems,
  isSheetRoute,
  type NavItem,
} from "@/lib/admin/mobile-nav";

const FIXTURE: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: "d" },
  { href: "/admin/leads", label: "Leads", icon: "l" },
  { href: "/admin/listings", label: "Listings", icon: "li" },
  { href: "/admin/sellers", label: "Sellers", icon: "s" },
  { href: "/admin/users", label: "Users", icon: "u" },
  { href: "/admin/inquiries", label: "Inquiries", icon: "i" },
  { href: "/admin/calendar", label: "Calendar", icon: "c" },
  { href: "/admin/conversations", label: "Conversations", icon: "co" },
  { href: "/admin/activity", label: "Activity", icon: "a" },
  { href: "/admin/settings", label: "Settings", icon: "se" },
];

describe("MOBILE_BAR_HREFS", () => {
  it("keeps exactly Dashboard, Leads, Listings, Inquiries (Calendar demoted)", () => {
    expect(MOBILE_BAR_HREFS).toEqual([
      "/admin",
      "/admin/leads",
      "/admin/listings",
      "/admin/inquiries",
    ]);
  });
});

describe("sheetItems", () => {
  it("returns the 6 sheet entries in spec order, Calendar first", () => {
    expect(sheetItems(FIXTURE).map((i) => i.label)).toEqual([
      "Calendar",
      "Sellers",
      "Users",
      "Conversations",
      "Activity",
      "Settings",
    ]);
  });
  it("never includes Intelligence even if passed in", () => {
    const withIntel = [
      ...FIXTURE,
      { href: "/admin/intelligence", label: "Intelligence", icon: "x" },
    ];
    expect(sheetItems(withIntel).some((i) => i.href === "/admin/intelligence")).toBe(false);
  });
  it("skips entries missing from the input instead of crashing", () => {
    const noCalendar = FIXTURE.filter((i) => i.href !== "/admin/calendar");
    expect(sheetItems(noCalendar).map((i) => i.label)).toEqual([
      "Sellers",
      "Users",
      "Conversations",
      "Activity",
      "Settings",
    ]);
  });
});

describe("isSheetRoute", () => {
  it("true for exact sheet routes", () => {
    expect(isSheetRoute("/admin/settings")).toBe(true);
    expect(isSheetRoute("/admin/calendar")).toBe(true);
  });
  it("true for nested paths under a sheet route", () => {
    expect(isSheetRoute("/admin/settings/anything")).toBe(true);
  });
  it("false for bar routes, unknown routes, and null", () => {
    expect(isSheetRoute("/admin")).toBe(false);
    expect(isSheetRoute("/admin/leads")).toBe(false);
    expect(isSheetRoute("/admin/intelligence")).toBe(false);
    expect(isSheetRoute(null)).toBe(false);
  });
});
