import { ImageResponse } from "next/og";

/**
 * Browser tab favicon — Next.js 14 App Router convention.
 *
 * Replaces the default Vercel-triangle `favicon.ico` Next.js ships with
 * (Notes 6 — JA: "the small icon on browser tab shows vercel Icon").
 *
 * Generated dynamically via `next/og`'s ImageResponse so we don't have to
 * ship a binary file and can keep the design in version control. Renders a
 * 256x256 PNG with the GTO brand monogram: gold "GTO" serif text centred
 * on the brand navy background. Scales down cleanly to 16/32px in the
 * browser tab and up to PWA-sized icons via /icon.
 *
 * Brand colours match `tailwind.config.ts`:
 *   navy = #1A1A2E (background)
 *   gold = #C99B3C (text)
 */

export const size = { width: 256, height: 256 };
export const contentType = "image/png";

export default function Icon() {
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
          fontSize: 96,
          fontWeight: 700,
          letterSpacing: -4,
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
