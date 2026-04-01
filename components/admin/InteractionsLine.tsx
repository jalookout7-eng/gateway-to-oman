"use client";

import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";

interface InteractionsLineProps {
  data: { date: string; count: number }[];
}

export function InteractionsLine({ data }: InteractionsLineProps) {
  const formatted = data.map((d) => ({
    ...d,
    date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  }));

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-navy mb-4">Chat Interactions</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={formatted}>
            <defs>
              <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#C99B3C" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#C99B3C" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#999" }} />
            <YAxis tick={{ fontSize: 11, fill: "#999" }} allowDecimals={false} />
            <Tooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
            <Area type="monotone" dataKey="count" stroke="#C99B3C" strokeWidth={2} fill="url(#goldGradient)" name="Interactions" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
