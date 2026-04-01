import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { requireAuth } from "@/lib/auth/token";

export async function GET(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  const db = getDb();

  const [totalLeads, hotLeads, warmLeads, coldLeads, meetingsBooked, conversations, segmentBreakdown, recentLeads, interactions, meetingsByDate, convertedLeads] =
    await Promise.all([
      db.execute({ sql: "SELECT COUNT(*) as count FROM leads", args: [] }),
      db.execute({ sql: "SELECT COUNT(*) as count FROM leads WHERE qualification = 'hot'", args: [] }),
      db.execute({ sql: "SELECT COUNT(*) as count FROM leads WHERE qualification = 'warm'", args: [] }),
      db.execute({ sql: "SELECT COUNT(*) as count FROM leads WHERE qualification = 'cold'", args: [] }),
      db.execute({ sql: "SELECT COUNT(*) as count FROM emails WHERE status = 'sent'", args: [] }),
      db.execute({ sql: "SELECT COUNT(*) as count FROM conversations", args: [] }),
      db.execute({
        sql: "SELECT segment, COUNT(*) as count FROM leads WHERE segment IS NOT NULL GROUP BY segment",
        args: [],
      }),
      db.execute({
        sql: "SELECT DATE(created_at) as date, COUNT(*) as count FROM leads GROUP BY DATE(created_at) ORDER BY date DESC LIMIT 30",
        args: [],
      }),
      db.execute({
        sql: "SELECT DATE(created_at) as date, COUNT(*) as count FROM messages GROUP BY DATE(created_at) ORDER BY date DESC LIMIT 30",
        args: [],
      }),
      db.execute({
        sql: "SELECT DATE(created_at) as date, COUNT(*) as count FROM emails WHERE status = 'sent' GROUP BY DATE(created_at) ORDER BY date DESC LIMIT 30",
        args: [],
      }),
      db.execute({ sql: "SELECT COUNT(*) as count FROM leads WHERE status = 'converted'", args: [] }),
    ]);

  const totalConversations = conversations.rows[0]?.count ?? 0;
  const totalLeadsCount = totalLeads.rows[0]?.count ?? 0;
  const convertedCount = convertedLeads.rows[0]?.count ?? 0;
  const meetingsCount = meetingsBooked.rows[0]?.count ?? 0;
  const conversionRate =
    Number(totalConversations) > 0
      ? ((Number(totalLeadsCount) / Number(totalConversations)) * 100).toFixed(1)
      : "0";

  return NextResponse.json({
    cards: {
      totalLeads: totalLeadsCount,
      hotLeads: hotLeads.rows[0]?.count ?? 0,
      warmLeads: warmLeads.rows[0]?.count ?? 0,
      coldLeads: coldLeads.rows[0]?.count ?? 0,
      meetingsBooked: meetingsCount,
      conversionRate: `${conversionRate}%`,
    },
    segmentBreakdown: segmentBreakdown.rows,
    recentLeads: recentLeads.rows,
    interactions: interactions.rows,
    meetingsByDate: meetingsByDate.rows,
    funnel: {
      visitors: Number(totalConversations),
      conversations: Number(totalConversations),
      leads: Number(totalLeadsCount),
      meetings: Number(meetingsCount),
      converted: Number(convertedCount),
    },
  });
}
