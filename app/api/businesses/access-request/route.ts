import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";

type Payload = {
  name: string;
  email: string;
  phone: string;
  message: string;
  listing?: string;
};

export async function POST(request: NextRequest) {
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

  return NextResponse.json({ ok: true, leadId }, { status: 201 });
}
