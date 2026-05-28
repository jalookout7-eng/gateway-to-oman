import { ImageResponse } from "next/og";

/**
 * PWA manifest icon — 512×512 (the standard large-PWA-icon size for
 * splash screens + high-density home-screen rendering). Same brand
 * monogram as `app/icon.tsx`; Chrome/Android pick this for splash
 * screens during PWA launch (Notes 6).
 */

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon512() {
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
          fontSize: 196,
          fontWeight: 700,
          letterSpacing: -8,
          fontFamily: "serif",
          textShadow: "0 4px 8px rgba(0,0,0,0.15)",
        }}
      >
        GTO
      </div>
    ),
    { ...size },
  );
}
