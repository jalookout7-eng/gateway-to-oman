import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";

function getOmanDateString(daysFromNow = 0): string {
  const d = new Date();
  d.setTime(d.getTime() + (4 * 60 * 60 * 1000));
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split("T")[0];
}

export async function GET() {
  try {
    const db = getDb();

    const slotSetting = await db.execute({
      sql: "SELECT value FROM settings WHERE key = 'consultation_slots'",
      args: [],
    });
    const defaultSlots = slotSetting.rows[0]?.value
      ? String(slotSetting.rows[0].value).split(",")
      : ["09:00", "13:00", "16:00"];

    const today = getOmanDateString(0);
    const end = getOmanDateString(14);
    const blocked = await db.execute({
      sql: "SELECT date, time_slot FROM blocked_slots WHERE date >= ? AND date <= ?",
      args: [today, end],
    });

    const booked = await db.execute({
      sql: "SELECT preferred_date, preferred_time FROM bookings WHERE preferred_date >= ? AND preferred_date <= ? AND status != 'cancelled'",
      args: [today, end],
    });

    const blockedDays = new Set<string>();
    const blockedSlotMap: Record<string, Set<string>> = {};

    for (const row of blocked.rows) {
      const d = String(row.date);
      if (!row.time_slot) {
        blockedDays.add(d);
      } else {
        if (!blockedSlotMap[d]) blockedSlotMap[d] = new Set();
        blockedSlotMap[d].add(String(row.time_slot));
      }
    }

    for (const row of booked.rows) {
      const d = String(row.preferred_date);
      const t = String(row.preferred_time);
      if (!blockedSlotMap[d]) blockedSlotMap[d] = new Set();
      blockedSlotMap[d].add(t);
    }

    const availableDays: string[] = [];
    const slotsByDay: Record<string, string[]> = {};

    for (let i = 1; i <= 14; i++) {
      const date = getOmanDateString(i);
      if (blockedDays.has(date)) continue;
      const usedSlots = blockedSlotMap[date] ?? new Set();
      const available = defaultSlots.filter((s) => !usedSlots.has(s));
      if (available.length > 0) {
        availableDays.push(date);
        slotsByDay[date] = available;
        if (availableDays.length >= 7) break;
      }
    }

    return NextResponse.json({ availableDays, slotsByDay });
  } catch (error) {
    console.error("Availability error:", error);
    return NextResponse.json({ availableDays: [], slotsByDay: {} });
  }
}
