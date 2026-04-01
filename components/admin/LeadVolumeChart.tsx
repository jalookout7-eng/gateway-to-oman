"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface LeadVolumeChartProps {
  data: { date: string; count: number }[];
}

export function LeadVolumeChart({ data }: LeadVolumeChartProps) {
  const formatted = data.map((d) => ({
    ...d,
    date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  }));

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-navy mb-4">Lead Volume</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={formatted}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#999" }} />
            <YAxis tick={{ fontSize: 11, fill: "#999" }} allowDecimals={false} />
            <Tooltip
              contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
            />
            <Bar dataKey="count" fill="#C99B3C" radius={[4, 4, 0, 0]} name="Leads" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
