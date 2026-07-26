// tests/chat/chat-header-menu.test.tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ChatHeaderMenu } from "@/components/chat/ChatHeaderMenu";

afterEach(cleanup);

describe("ChatHeaderMenu", () => {
  it("is closed until the trigger is clicked", () => {
    render(<ChatHeaderMenu onConnect={() => {}} onCloseSession={() => {}} />);
    expect(screen.queryByRole("menu")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /chat options/i }));
    expect(screen.getByRole("menu")).toBeTruthy();
  });

  it("shows both options", () => {
    render(<ChatHeaderMenu onConnect={() => {}} onCloseSession={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /chat options/i }));
    expect(screen.getByRole("menuitem", { name: /connect with a representative/i })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: /close session/i })).toBeTruthy();
  });

  it("calls onConnect and closes", () => {
    const onConnect = vi.fn();
    render(<ChatHeaderMenu onConnect={onConnect} onCloseSession={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /chat options/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /connect with a representative/i }));
    expect(onConnect).toHaveBeenCalledOnce();
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("calls onCloseSession and closes", () => {
    const onCloseSession = vi.fn();
    render(<ChatHeaderMenu onConnect={() => {}} onCloseSession={onCloseSession} />);
    fireEvent.click(screen.getByRole("button", { name: /chat options/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /close session/i }));
    expect(onCloseSession).toHaveBeenCalledOnce();
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("renders close session as the destructive option", () => {
    render(<ChatHeaderMenu onConnect={() => {}} onCloseSession={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /chat options/i }));
    expect(
      screen.getByRole("menuitem", { name: /close session/i }).className,
    ).toMatch(/text-red-/);
  });

  it("closes on Escape", () => {
    render(<ChatHeaderMenu onConnect={() => {}} onCloseSession={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /chat options/i }));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
  });
});
