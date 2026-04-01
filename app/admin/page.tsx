"use client";

import { useState, useEffect } from "react";
import { Scorecard } from "@/components/admin/Scorecard";
import { LeadVolumeChart } from "@/components/admin/LeadVolumeChart";
import { SegmentDonut } from "@/components/admin/SegmentDonut";
import { InteractionsLine } from "@/components/admin/InteractionsLine";
import { MeetingsBar } from "@/components/admin/MeetingsBar";
import { FunnelChart } from "@/components/admin/FunnelChart";

interface StatsData {
  cards: {
    totalLeads: number;
    hotLeads: number;
    warmLeads: number;
    coldLeads: number;
    meetingsBooked: number;
    conversionRate: string;
  };
  segmentBreakdown: { segment: string; count: number }[];
  recentLeads: { date: string; count: number }[];
  interactions: { date: string; count: number }[];
  meetingsByDate: { date: string; count: number }[];
  funnel: {
    visitors: number;
    conversations: number;
    leads: number;
    meetings: number;
    converted: number;
  };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      const token = localStorage.getItem("admin_token");
      try {
        const res = await fetch("/api/admin/stats", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          setStats(await res.json());
        }
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-gray-400">Loading dashboard...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Failed to load dashboard data.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Overview of your lead generation performance</p>
      </div>

      <Scorecard cards={stats.cards} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LeadVolumeChart data={stats.recentLeads} />
        <SegmentDonut data={stats.segmentBreakdown} />
        <InteractionsLine data={stats.interactions} />
        <MeetingsBar data={stats.meetingsByDate} />
      </div>

      <FunnelChart {...stats.funnel} />
    </div>
  );
}
