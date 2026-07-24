import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { MobileMenuSheet } from "@/components/admin/MobileMenuSheet";
import type { NavItem } from "@/lib/admin/mobile-nav";

afterEach(cleanup);

const ITEMS: NavItem[] = [
  { href: "/admin/calendar", label: "Calendar", icon: "M8 7V3m8 4V3" },
  { href: "/admin/settings", label: "Settings", icon: "M10.3 4.3a1 1 0 011 1" },
];

describe("MobileMenuSheet", () => {
  it("renders nothing when closed", () => {
    const { container } = render(
      <MobileMenuSheet items={ITEMS} open={false} onClose={() => {}} pathname="/admin" />
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders a dialog with one link per item when open", () => {
    render(
      <MobileMenuSheet items={ITEMS} open={true} onClose={() => {}} pathname="/admin" />
    );
    expect(screen.getByRole("dialog")).toBeTruthy();
    const links = screen.getAllByRole("link");
    expect(links.map((l) => l.getAttribute("href"))).toEqual([
      "/admin/calendar",
      "/admin/settings",
    ]);
  });

  it("marks the current route's row with aria-current=page", () => {
    render(
      <MobileMenuSheet items={ITEMS} open={true} onClose={() => {}} pathname="/admin/settings" />
    );
    const active = screen.getByRole("link", { name: /settings/i });
    expect(active.getAttribute("aria-current")).toBe("page");
    const inactive = screen.getByRole("link", { name: /calendar/i });
    expect(inactive.getAttribute("aria-current")).toBe(null);
  });

  it("calls onClose when the backdrop is tapped", () => {
    const onClose = vi.fn();
    render(
      <MobileMenuSheet items={ITEMS} open={true} onClose={onClose} pathname="/admin" />
    );
    fireEvent.click(screen.getByLabelText("Close menu"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when Escape is pressed", () => {
    const onClose = vi.fn();
    render(
      <MobileMenuSheet items={ITEMS} open={true} onClose={onClose} pathname="/admin" />
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });
});
