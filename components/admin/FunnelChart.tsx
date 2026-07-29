"use client";

import { motion } from "framer-motion";

interface FunnelChartProps {
  conversations: number;
  leads: number;
  meetings: number;
  converted: number;
}

const FUNNEL_COLORS = ["#1A1A2E", "#C99B3C", "#7EBEC5", "#22C55E"];

export function FunnelChart({ conversations, leads, meetings, converted }: FunnelChartProps) {
  const stages = [
    { label: "Conversations", value: conversations },
    { label: "Leads Captured", value: leads },
    { label: "Meetings Booked", value: meetings },
    { label: "Converted", value: converted },
  ];

  // Max across ALL stages, not just the first one, so a later stage that is
  // larger than an earlier one (e.g. more leads than conversations, from
  // imported/historical data) can never push a bar past 100% of the track.
  const maxValue = Math.max(...stages.map((s) => s.value), 1);
  const firstValue = stages[0].value;

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-navy mb-6">Conversion Funnel</h3>
      <div className="space-y-3">
        {stages.map((stage, i) => {
          const widthPct = Math.min(Math.max((stage.value / maxValue) * 100, 8), 100);
          const pctOfFirst = firstValue > 0 ? Math.round((stage.value / firstValue) * 100) : 0;
          return (
            <div key={stage.label} className="flex items-center gap-4">
              <span className="text-xs text-gray-500 w-28 text-right flex-shrink-0">
                {stage.label} {pctOfFirst}%
              </span>
              <div className="flex-1 relative">
                <motion.div
                  className="h-8 rounded-lg flex items-center justify-end pr-3"
                  style={{ backgroundColor: FUNNEL_COLORS[i] }}
                  initial={{ width: 0 }}
                  animate={{ width: `${widthPct}%` }}
                  transition={{ delay: i * 0.1, duration: 0.6, ease: "easeOut" }}
                >
                  <span className="text-xs font-semibold text-white">{stage.value}</span>
                </motion.div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
