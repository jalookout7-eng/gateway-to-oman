import { ImageResponse } from "next/og";

/**
 * PWA manifest icon — 192×192 (the standard small-PWA-icon size).
 * Same brand monogram as `app/icon.tsx`; this file just exists so the
 * `public/manifest.json` icons array can reference an exact-size endpoint
 * for Chrome/Android PWA install prompts (Notes 6).
 */

export const size = { width: 192, height: 192 };
export const contentType = "image/png";

export default function Icon192() {
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
          fontSize: 74,
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
