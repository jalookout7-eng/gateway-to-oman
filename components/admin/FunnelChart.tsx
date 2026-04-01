"use client";

import { motion } from "framer-motion";

interface FunnelChartProps {
  visitors: number;
  conversations: number;
  leads: number;
  meetings: number;
  converted: number;
}

const FUNNEL_COLORS = ["#1A1A2E", "#C99B3C", "#E8C777", "#7EBEC5", "#22C55E"];

export function FunnelChart({ visitors, conversations, leads, meetings, converted }: FunnelChartProps) {
  const stages = [
    { label: "Visitors", value: visitors },
    { label: "Conversations", value: conversations },
    { label: "Leads Captured", value: leads },
    { label: "Meetings Booked", value: meetings },
    { label: "Converted", value: converted },
  ];

  const maxValue = Math.max(visitors, 1);

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-navy mb-6">Conversion Funnel</h3>
      <div className="space-y-3">
        {stages.map((stage, i) => {
          const widthPct = Math.max((stage.value / maxValue) * 100, 8);
          return (
            <div key={stage.label} className="flex items-center gap-4">
              <span className="text-xs text-gray-500 w-28 text-right flex-shrink-0">{stage.label}</span>
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
