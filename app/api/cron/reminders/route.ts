import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { getDb } from "@/lib/db/client";
import { sendPushNotification } from "@/lib/push/notify";

export const dynamic = "force-dynamic";

// I-3: timing-safe string comparison to prevent timing-attack on CRON_SECRET
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false; // timingSafeEqual throws on length mismatch
  return timingSafeEqual(ab, bb);
}

export async function GET(request: NextRequest) {
  // Verify this is called by Vercel Cron (not public)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!authHeader || !cronSecret || !safeEqual(authHeader, `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();

  // Find bookings in the next 60-90 minutes (Oman time = UTC+4)
  // Compute the Oman-local time window for 60-90 minutes from now.
  // Oman is UTC+4. We add the offset inside Date.now() math so .toISOString()
  // produces the correct local date and time string for DB comparison.
  const nowUtc = Date.now();
  const plus60Oman = new Date(nowUtc + (4 * 60 + 60) * 60 * 1000);
  const plus90Oman = new Date(nowUtc + (4 * 60 + 90) * 60 * 1000);

  // Use the date at +60min to determine "today" in Oman time
  const todayStr = plus60Oman.toISOString().split("T")[0];
  const time60 = plus60Oman.toISOString().split("T")[1].slice(0, 5);
  const time90 = plus90Oman.toISOString().split("T")[1].slice(0, 5);

  const nextDayStr = plus90Oman.toISOString().split("T")[0];
  const crossesMidnight = todayStr !== nextDayStr;

  let upcomingBookings;
  if (!crossesMidnight) {
    upcomingBookings = await db.execute({
      sql: `SELECT b.id, b.lead_id as leadId, b.preferred_date, b.preferred_time,
                   l.name as leadName, l.email, l.phone
            FROM bookings b
            LEFT JOIN leads l ON l.id = b.lead_id
            WHERE b.preferred_date = ? AND b.preferred_time >= ? AND b.preferred_time <= ? AND b.status = 'confirmed'`,
      args: [todayStr, time60, time90],
    });
  } else {
    // Window crosses midnight — query both dates
    upcomingBookings = await db.execute({
      sql: `SELECT b.id, b.lead_id as leadId, b.preferred_date, b.preferred_time,
                   l.name as leadName, l.email, l.phone
            FROM bookings b
            LEFT JOIN leads l ON l.id = b.lead_id
            WHERE ((b.preferred_date = ? AND b.preferred_time >= ?)
               OR  (b.preferred_date = ? AND b.preferred_time <= ?))
              AND b.status = 'confirmed'`,
      args: [todayStr, time60, nextDayStr, time90],
    });
  }

  let reminded = 0;

  // Pre-fetch all booking IDs that already have a reminder to avoid N+1 queries
  const bookingIds = upcomingBookings.rows.map((r) => String(r.id));
  const alreadyRemindedSet = new Set<string>();

  if (bookingIds.length > 0) {
    const placeholders = bookingIds.map(() => "?").join(", ");
    const existingReminders = await db.execute({
      sql: `SELECT booking_id FROM emails WHERE booking_id IN (${placeholders}) AND subject LIKE '%Reminder%'`,
      args: bookingIds,
    });
    for (const row of existingReminders.rows) {
      alreadyRemindedSet.add(String(row.booking_id));
    }
  }

  for (const booking of upcomingBookings.rows) {
    // Skip if a reminder email already exists for this booking
    if (alreadyRemindedSet.has(String(booking.id))) continue;

    const subject = `Reminder: Consultation with ${booking.leadName} at ${booking.preferred_time}`;
    const html = `
      <p>Hi ${booking.leadName},</p>
      <p>Just a reminder — your consultation with <strong>Ahmed Al-Azizi</strong> is today at <strong>${booking.preferred_time} (Oman time)</strong>.</p>
      <p>Ahmed will be in touch with connection details shortly.</p>
      <p>Gateway to Oman</p>
    `;

    await db.execute({
      sql: "INSERT INTO emails (lead_id, booking_id, to_address, subject, body, status) VALUES (?, ?, ?, ?, ?, 'draft')",
      args: [
        String(booking.leadId),
        String(booking.id),
        String(booking.email),
        subject,
        JSON.stringify({ html }),
      ],
    });

    // Push notification to Ahmed — fire-and-forget
    sendPushNotification({
      title: `Meeting in ~1 hour`,
      body: `${booking.leadName} at ${booking.preferred_time} — send reminder?`,
      url: `/admin/leads`,
    }).catch(console.error);

    reminded++;
  }

  return NextResponse.json({ checked: upcomingBookings.rows.length, reminded });
}
