import { ImageResponse } from "next/og";

/**
 * iOS Safari home-screen icon (Notes 6).
 *
 * Apple's spec is 180x180 PNG, rounded corners applied by iOS itself.
 * Same brand monogram as the desktop favicon (`app/icon.tsx`).
 *
 * Next.js 14 App Router auto-discovers `app/apple-icon.tsx` and emits
 * the appropriate `<link rel="apple-touch-icon" ...>` tag — no manifest
 * wiring needed for iOS.
 */

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#1A1A2E",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#C99B3C",
          fontSize: 68,
          fontWeight: 700,
          letterSpacing: -3,
          fontFamily: "serif",
          textShadow: "0 2px 4px rgba(0,0,0,0.15)",
        }}
      >
        GTO
      </div>
    ),
    { ...size },
  );
}
