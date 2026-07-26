// tests/chat/use-visual-viewport.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useVisualViewportHeight } from "@/lib/chat/use-visual-viewport";

type Listener = () => void;

function installViewport(height: number) {
  const listeners: Record<string, Listener[]> = { resize: [], scroll: [] };
  const vv = {
    height,
    addEventListener: (type: string, fn: Listener) => listeners[type]?.push(fn),
    removeEventListener: (type: string, fn: Listener) => {
      listeners[type] = (listeners[type] ?? []).filter((l) => l !== fn);
    },
  };
  Object.defineProperty(window, "visualViewport", { value: vv, configurable: true, writable: true });
  return {
    vv,
    fire: () => listeners.resize.forEach((l) => l()),
    listenerCount: () => listeners.resize.length,
  };
}

beforeEach(() => {
  Object.defineProperty(window, "innerHeight", { value: 800, configurable: true, writable: true });
});

afterEach(() => {
  // @ts-expect-error cleaning the stub
  delete window.visualViewport;
});

describe("useVisualViewportHeight", () => {
  it("returns null when the viewport is not shrunk", () => {
    installViewport(800);
    const { result } = renderHook(() => useVisualViewportHeight());
    expect(result.current).toBeNull();
  });

  it("returns the shrunk height once a keyboard opens", () => {
    const h = installViewport(800);
    const { result } = renderHook(() => useVisualViewportHeight());
    act(() => {
      h.vv.height = 420;
      h.fire();
    });
    expect(result.current).toBe(420);
  });

  it("returns null again when the keyboard closes", () => {
    const h = installViewport(800);
    const { result } = renderHook(() => useVisualViewportHeight());
    act(() => {
      h.vv.height = 420;
      h.fire();
    });
    act(() => {
      h.vv.height = 800;
      h.fire();
    });
    expect(result.current).toBeNull();
  });

  it("ignores small changes such as a toolbar hiding", () => {
    const h = installViewport(800);
    const { result } = renderHook(() => useVisualViewportHeight());
    act(() => {
      h.vv.height = 740;
      h.fire();
    });
    expect(result.current).toBeNull();
  });

  it("returns null when visualViewport is unavailable", () => {
    // @ts-expect-error simulating an unsupported browser
    delete window.visualViewport;
    const { result } = renderHook(() => useVisualViewportHeight());
    expect(result.current).toBeNull();
  });

  it("removes its listeners on unmount", () => {
    const h = installViewport(800);
    const { unmount } = renderHook(() => useVisualViewportHeight());
    expect(h.listenerCount()).toBeGreaterThan(0);
    unmount();
    expect(h.listenerCount()).toBe(0);
  });
});
