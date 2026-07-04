"use client";

import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/analytics/track";

/**
 * Fires a single GA4 event when the component mounts. Lets server components
 * (listing detail page, gated listings grid) report view events without
 * converting the whole page to a client component. Renders nothing.
 */
export function TrackOnMount({
  event,
  params,
}: {
  event: string;
  params?: Record<string, unknown>;
}) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    trackEvent(event, params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
