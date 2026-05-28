"use client";

import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { trackEvent } from "@/lib/analytics/track";

/**
 * Floating WhatsApp button — opens a chat directly with Ahmed's WhatsApp.
 *
 * Sits to the LEFT of the Omar floating chat button so the two buttons
 * appear side-by-side at the bottom-right. Hidden on admin pages and the
 * marketplace auth flows (same as ChatWidget) so the visitor isn't
 * distracted mid-task.
 *
 * Why a separate component instead of bundling into ChatWidget: the
 * WhatsApp button is independent of the AI chat state — it should be
 * available even when the chat is open (e.g., visitor decides "I just
 * want to message someone, skip the bot") and even when Omar can't load
 * (provider down). Keeping it standalone also lets the layout mount it
 * globally without needing the chat context provider.
 */
export function WhatsAppFloatingButton() {
  const pathname = usePathname();

  // Suppress on admin and marketplace auth pages — same rule as ChatWidget.
  if (pathname?.startsWith("/admin")) return null;
  const AUTH_PATHS = ["/businesses/sign-in", "/businesses/access"];
  if (pathname && AUTH_PATHS.some((p) => pathname.startsWith(p))) return null;

  // Ahmed's number (intentionally public per HANDOVER §2/3). wa.me format
  // strips the leading + and any spaces.
  const phone = "96895108257";
  const href = `https://wa.me/${phone}`;

  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="WhatsApp Ahmed at Gateway to Oman"
      title="WhatsApp Ahmed"
      onClick={() => trackEvent("whatsapp_click", { surface: "floating_button" })}
      // Position: same bottom edge as Omar's button (bottom-6 right-6 is
      // 24px). The Omar button is 56px wide (h-14 w-14). Adding a 12px gap
      // means our right edge is at 24 + 56 + 12 = 92px. We use right-[92px].
      className="fixed bottom-6 right-[92px] h-14 w-14 rounded-full shadow-lg flex items-center justify-center text-white z-50 hover:shadow-xl transition-all"
      style={{ backgroundColor: "#25D366" }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.05 }}
    >
      {/* Official WhatsApp glyph — lucide-react doesn't ship a WhatsApp icon,
          so we use the brand SVG. Path data from Simple Icons (CC0). */}
      <svg
        viewBox="0 0 24 24"
        className="h-7 w-7"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
      </svg>
    </motion.a>
  );
}
