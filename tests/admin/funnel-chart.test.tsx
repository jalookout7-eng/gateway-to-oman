/**
 * Component test for FunnelChart.
 *
 * Regression: maxValue used to be Math.max(visitors, 1) only, so when
 * `leads` (or any later stage) exceeded the first stage's value, widthPct
 * exceeded 100 and the bar ran off the card (client-reported screenshot,
 * production import of 94 historical leads made this happen for real).
 *
 * framer-motion's `animate` transition does not resolve synchronously in
 * jsdom (the `initial` style renders immediately, `animate` only applies
 * once the animation engine ticks), so `motion.div` is mocked to apply the
 * `animate` style directly. This is a test-only mock, no new dependency.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import type { ReactNode, CSSProperties } from "react";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      animate,
      initial: _initial,
      transition: _transition,
      style,
      children,
      ...rest
    }: {
      animate?: CSSProperties;
      initial?: unknown;
      transition?: unknown;
      style?: CSSProperties;
      children?: ReactNode;
      [key: string]: unknown;
    }) => (
      <div style={{ ...style, ...animate }} {...rest}>
        {children}
      </div>
    ),
  },
}));

import { FunnelChart } from "@/components/admin/FunnelChart";

afterEach(cleanup);

describe("FunnelChart", () => {
  it("never renders a bar wider than 100% when leads exceed conversations", () => {
    // Mirrors the production regression: fewer conversations than leads.
    const { container } = render(
      <FunnelChart conversations={11} leads={96} meetings={3} converted={1} />,
    );

    const bars = container.querySelectorAll<HTMLElement>(".rounded-lg");
    expect(bars.length).toBe(4);
    bars.forEach((bar) => {
      const pct = parseFloat(bar.style.width);
      expect(pct).toBeLessThanOrEqual(100);
    });
  });

  it("still shows a visible minimum-width bar for a zero-value stage", () => {
    const { container } = render(
      <FunnelChart conversations={10} leads={5} meetings={0} converted={0} />,
    );
    const bars = container.querySelectorAll<HTMLElement>(".rounded-lg");
    const meetingsBar = bars[2];
    const pct = parseFloat(meetingsBar.style.width);
    expect(pct).toBeGreaterThan(0);
    expect(pct).toBeLessThanOrEqual(100);
  });

  it("shows a percentage next to each stage label, relative to the first stage", () => {
    const { getByText } = render(
      <FunnelChart conversations={10} leads={5} meetings={2} converted={1} />,
    );
    expect(getByText("Conversations 100%")).toBeTruthy();
    expect(getByText("Leads Captured 50%")).toBeTruthy();
    expect(getByText("Meetings Booked 20%")).toBeTruthy();
    expect(getByText("Converted 10%")).toBeTruthy();
  });
});
