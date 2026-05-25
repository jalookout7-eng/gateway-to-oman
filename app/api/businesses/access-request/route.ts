import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

type Payload = {
  name: string;
  email: string;
  phone: string;
  message: string;
  listing?: string;
};

export async function POST(request: NextRequest) {
  // Rate limit: 5 access requests per 10 min per IP (M-6)
  const ip = getClientIp(request);
  const rl = await rateLimit("access", ip, 5, 600);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  let body: Payload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = body.name?.trim();
  const email = body.email?.trim().toLowerCase();
  const phone = body.phone?.trim();
  const message = body.message?.trim();

  if (!name || !email || !phone || !message) {
    return NextResponse.json({ error: "Name, email, phone, and message are required" }, { status: 400 });
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  const db = getDb();

  // M-6: dedupe — skip creating a new lead if the same email+source submitted within the last 24h
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().replace("T", " ").slice(0, 19);
  const dedupe = await db.execute({
    sql: `SELECT id FROM leads WHERE email = ? AND source = 'businesses' AND created_at >= ? LIMIT 1`,
    args: [email, oneDayAgo],
  });
  if (dedupe.rows.length > 0) {
    // Duplicate within 24h — return success silently (UX unchanged)
    return NextResponse.json({ success: true }, { status: 201 });
  }

  const leadInsert = await db.execute({
    sql: `INSERT INTO leads (name, email, phone, interests, source, qualification, status, outcome, admin_notes)
          VALUES (?, ?, ?, ?, 'businesses', 'warm', 'new', 'pending', ?)
          RETURNING id`,
    args: [
      name,
      email,
      phone,
      message,
      body.listing ? `Marketplace access request — referred listing: ${body.listing}` : "Marketplace access request",
    ],
  });
  const leadId = leadInsert.rows[0]?.id as string;

  if (body.listing) {
    const listingResult = await db.execute({
      sql: "SELECT id FROM listings WHERE slug = ? LIMIT 1",
      args: [body.listing],
    });
    if (listingResult.rows.length > 0) {
      await db.execute({
        sql: `INSERT INTO inquiries (lead_id, listing_id, message, source)
              VALUES (?, ?, ?, 'businesses')`,
        args: [leadId, listingResult.rows[0].id, message],
      });
    }
  }

  await db.execute({
    sql: `INSERT INTO activity_log (actor_type, action, target_type, target_id, source, metadata_json)
          VALUES ('visitor', 'marketplace_access_requested', 'leads', ?, 'businesses', ?)`,
    args: [
      leadId,
      JSON.stringify({ email, phone, referred_listing: body.listing ?? null }),
    ],
  });

  // M-6: return only a generic success — no internal IDs exposed
  return NextResponse.json({ success: true }, { status: 201 });
}
