import { GTO_REFERENCES } from "./knowledge-base";
import type { Surface } from "./surface";

export interface WhatsAppHandoffInput {
  segment?: string | null;
  interest?: string | null;
  surface: Surface;
}

/** Build a wa.me deep link to Azizi, prefilled with the lead's gist. */
export function buildWhatsAppHandoff(input: WhatsAppHandoffInput): string {
  const parts = [
    "Hi Ahmed — I'm a serious lead from the Gateway to Oman site.",
    input.segment ? `Profile: ${input.segment}.` : "",
    input.interest ? `Interested in: ${input.interest}.` : "",
    input.surface === "businesses"
      ? "Source: businesses-for-sale marketplace."
      : "Source: main Gateway to Oman site.",
  ].filter(Boolean);
  const text = encodeURIComponent(parts.join(" "));
  return `https://wa.me/${GTO_REFERENCES.whatsappE164}?text=${text}`;
}
