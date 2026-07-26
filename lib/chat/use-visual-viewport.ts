"use client";

import { useEffect, useState } from "react";

/** Below this, a height change is a toolbar, not a keyboard. */
const KEYBOARD_THRESHOLD_PX = 120;

/**
 * Visible viewport height while something (an on-screen keyboard) is shrinking
 * it, else null.
 *
 * The widget is sized in `dvh`, which does NOT shrink when the iOS keyboard
 * opens, so the input and newest messages were pushed behind the keyboard
 * (JA, 2026-07-26). Returning null on unsupported browsers keeps the existing
 * CSS behaviour everywhere else.
 */
export function useVisualViewportHeight(): number | null {
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      const shrunkBy = window.innerHeight - vv.height;
      setHeight(shrunkBy > KEYBOARD_THRESHOLD_PX ? vv.height : null);
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  return height;
}
