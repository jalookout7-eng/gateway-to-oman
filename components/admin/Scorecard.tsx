"use client";

import { motion } from "framer-motion";

interface ScoreCardItem {
  label: string;
  value: string | number;
  color: string;
}

interface ScorecardProps {
  cards: {
    totalLeads: number;
    hotLeads: number;
    warmLeads: number;
    coldLeads: number;
    conversionRate: string;
  };
}

export function Scorecard({ cards }: ScorecardProps) {
  const items: ScoreCardItem[] = [
    { label: "Total Leads", value: cards.totalLeads, color: "border-gold" },
    { label: "Hot Leads", value: cards.hotLeads, color: "border-red-500" },
    { label: "Warm Leads", value: cards.warmLeads, color: "border-orange-500" },
    { label: "Cold Leads", value: cards.coldLeads, color: "border-blue-500" },
    { label: "Conversion Rate", value: cards.conversionRate, color: "border-green-500" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {items.map((item, i) => (
        <motion.div
          key={item.label}
          className={`bg-white rounded-xl p-4 shadow-sm border-t-4 ${item.color}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <p className="text-2xl font-bold text-navy">{item.value}</p>
          <p className="text-xs text-gray-500 mt-1">{item.label}</p>
        </motion.div>
      ))}
    </div>
  );
}
