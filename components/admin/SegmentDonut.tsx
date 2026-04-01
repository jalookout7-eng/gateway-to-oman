"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface SegmentDonutProps {
  data: { segment: string; count: number }[];
}

const SEGMENT_COLORS: Record<string, string> = {
  entrepreneur: "#3B82F6",
  investor: "#F59E0B",
  professional: "#7EBEC5",
  retiree: "#22C55E",
};

export function SegmentDonut({ data }: SegmentDonutProps) {
  const formatted = data.map((d) => ({
    name: d.segment ? d.segment.charAt(0).toUpperCase() + d.segment.slice(1) : "Unknown",
    value: Number(d.count),
    fill: SEGMENT_COLORS[d.segment] ?? "#94A3B8",
  }));

  if (formatted.length === 0) {
    return (
      <div className="bg-white rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-navy mb-4">Segments</h3>
        <div className="h-64 flex items-center justify-center text-gray-400 text-sm">No data yet</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-navy mb-4">Segments</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={formatted}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              dataKey="value"
              paddingAngle={4}
            >
              {formatted.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: "12px" }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
