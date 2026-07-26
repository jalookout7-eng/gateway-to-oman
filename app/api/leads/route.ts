import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { requireAuth, getRequestUser } from "@/lib/auth/token";
import { sendPushNotification } from "@/lib/push/notify";
import { scoreLead } from "@/lib/ai/scoring";
import { summariseLead, type LeadFacts } from "@/lib/ai/lead-summary";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

async function scoreLeadFromConversation(
  leadId: string,
  conversationId: string | null,
  segment: string | null,
  interests: string | null,
  db: ReturnType<typeof getDb>,
) {
  if (!conversationId) return;
  try {
    // Surface is read from the conversation row so scoring can branch on
    // the path the visitor came in through (Notes 3 item 4). Default 'main'
    // matches the column default if the column is somehow null.
    const convRow = await db.execute({
      sql: "SELECT source FROM conversations WHERE id = ?",
      args: [conversationId],
    });
    const source = String(convRow.rows[0]?.source ?? "main");
    const surface = source === "businesses" ? "businesses" : "main";

    const msgs = await db.execute({
      sql: "SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC",
      args: [conversationId],
    });
    const visitorMessages = msgs.rows
      .filter((m) => String(m.role) === "user")
      .map((m) => String(m.content));
    const visitorText = visitorMessages.join("\n");
    const fullText = msgs.rows
      .map((m) => `${String(m.role).toUpperCase()}: ${String(m.content)}`)
      .join("\n");

    const breakdown = scoreLead({
      visitorText,
      fullText,
      visitorMessages,
      segment,
      interests,
      surface,
    });

    await db.execute({
      sql: `UPDATE leads
            SET lead_score = ?, qualification = ?, score_breakdown = ?
            WHERE id = ?`,
      args: [breakdown.total, breakdown.tier, JSON.stringify(breakdown), leadId],
    });
  } catch (err) {
    console.error("Lead scoring failed:", err);
  }
}

/**
 * Auto-generate the AI summary for a freshly-captured lead.
 *
 * Uses the shared `summariseLead()` helper (Anthropic primary, Groq failover)
 * with the same prompt + lead-facts injection as the admin "Regenerate"
 * button. Centralising this fixed the bug where the first-time summary
 * still hallucinated the lead's name and emitted markdown asterisks — the
 * old auto-gen path was a stale copy of an older prompt + the weak
 * llama-3.1-8b model + no facts injection.
 *
 * Fire-and-forget from the caller: failures are logged but never block the
 * lead-creation response.
 */
async function generateLeadSummary(
  leadId: string,
  conversationId: string | null,
  facts: LeadFacts,
  db: ReturnType<typeof getDb>,
) {
  try {
    let transcript: string | null = null;
    if (conversationId) {
      const msgs = await db.execute({
        sql: "SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC",
        args: [conversationId],
      });
      if (msgs.rows.length > 0) {
        transcript = msgs.rows
          .map((m) => {
            const role = String(m.role).toLowerCase();
            const label =
              role === "user"
                ? "VISITOR (lead)"
                : role === "assistant"
                  ? "OMAR (bot)"
                  : role.toUpperCase();
            return `${label}: ${String(m.content)}`;
          })
          .join("\n");
      }
    }

    const summary = await summariseLead(facts, transcript);

    await db.execute({
      sql: "UPDATE leads SET ai_summary = ? WHERE id = ?",
      args: [summary, leadId],
    });
  } catch (err) {
    console.error("[leads] Summary generation failed:", err);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Admin-entered leads (AddLeadModal) hit this same endpoint. The caps and
    // dedupe exist to stop public abuse — applying them to the owner
    // transcribing inquiries would silently discard real data.
    const adminUser = await getRequestUser(request);
    const isAdmin = adminUser !== null;

    // A04-1: public endpoint that fans out to AI + push on every hit — cap it.
    // Two windows: burst (5/10min) and daily (15/24h) per IP. Deliberately NOT
    // a silent per-IP dedupe: shared IPs (office/family NAT) submit legitimate
    // distinct leads, so repeats inside the caps stay allowed and over-cap gets
    // an honest 429 instead of a silently discarded lead.
    const ip = getClientIp(request);
    if (!isAdmin) {
      const rlBurst = await rateLimit("lead_capture", ip, 5, 600);
      if (!rlBurst.allowed) {
        return NextResponse.json(
          { error: "Too many requests. Please slow down." },
          { status: 429, headers: { "Retry-After": String(rlBurst.retryAfterSec) } },
        );
      }
      const rlDay = await rateLimit("lead_capture_day", ip, 15, 86400);
      if (!rlDay.allowed) {
        return NextResponse.json(
          { error: "Too many requests. Please slow down." },
          { status: 429, headers: { "Retry-After": String(rlDay.retryAfterSec) } },
        );
      }
    }

    const { name, email, phone, countryCode, conversationId, segment, interests, qualification } =
      await request.json();

    // `qualification` arrives from the browser — allowlist it to exactly
    // "connect" (Task 5). Anything else (including an attempt to write
    // "hot" directly) is ignored; scoring is what sets hot/warm/cold.
    const isConnectRequest = qualification === "connect";

    if (!name || !email) {
      return NextResponse.json(
        { error: "name and email are required" },
        { status: 400 }
      );
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    const db = getDb();

    // A04-1 dedupe: same email within 24h → return the existing lead's id in
    // the normal success shape and skip the AI/push fan-out entirely (mirrors
    // the M-6 access-request pattern; silent so probers learn nothing). Scoped
    // to source = 'main' (this route's implicit source) so it can't collide
    // with marketplace sign-up / access-request / CSV-import leads that share
    // the same table — see app/api/businesses/access-request/route.ts for the
    // pattern this mirrors. Skipped entirely for authenticated admins: the
    // AddLeadModal reuses this endpoint to transcribe real inquiries, and a
    // same-email repeat there is legitimate data, not abuse.
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
      .toISOString().replace("T", " ").slice(0, 19);

    // A04-1 dedupe, atomic: the WHERE NOT EXISTS guard and the INSERT are one
    // statement, so two racing same-email submissions cannot both insert
    // (deliberately no transaction — libsql HTTP transactions are fragile here,
    // and no UNIQUE constraint — the same email >24h apart is legitimate).
    const dedupeGuardSql = isAdmin
      ? ""
      : `WHERE NOT EXISTS (SELECT 1 FROM leads WHERE email = ? AND source = 'main' AND created_at >= ?)`;

    // Column list is normally fixed; a connect request adds `qualification`
    // so the INSERT writes 'connect' directly instead of the column default
    // ('warm') that scoring would otherwise overwrite.
    const leadColumns = ["name", "email", "phone", "country_code", "conversation_id", "segment", "interests"];
    const leadValues: (string | null)[] = [
      name,
      email,
      phone ?? null,
      countryCode ?? null,
      conversationId ?? null,
      segment ?? null,
      interests ?? null,
    ];
    if (isConnectRequest) {
      leadColumns.push("qualification");
      leadValues.push("connect");
    }

    const result = await db.execute({
      sql: `INSERT INTO leads (${leadColumns.join(", ")})
            SELECT ${leadColumns.map(() => "?").join(", ")}
            ${dedupeGuardSql}
            RETURNING id`,
      args: isAdmin ? leadValues : [...leadValues, email, oneDayAgo],
    });

    // Zero rows returned = the NOT EXISTS guard fired (admins never hit this —
    // there is no guard clause in that branch): this email already has a lead
    // inside 24h. Silent success with the existing id; skip the fan-out.
    if (!isAdmin && result.rows.length === 0) {
      const existing = await db.execute({
        sql: `SELECT id FROM leads WHERE email = ? AND source = 'main' AND created_at >= ? LIMIT 1`,
        args: [email, oneDayAgo],
      });
      return NextResponse.json(
        { success: true, id: String(existing.rows[0]?.id ?? "") },
        { status: 201 },
      );
    }

    // Update conversation outcome
    if (conversationId) {
      await db.execute({
        sql: "UPDATE conversations SET outcome = 'captured', ended_at = datetime('now') WHERE id = ?",
        args: [conversationId],
      });
    }

    const leadId = result.rows[0].id as string;

    // Fire-and-forget: generate AI summary without blocking response.
    // Pass the freshly-captured lead facts directly so the AI knows the
    // visitor's name + segment + interests even when the transcript
    // doesn't mention them (the lead form is the source of truth, not chat).
    generateLeadSummary(
      leadId,
      conversationId ?? null,
      {
        name: name ?? null,
        email: email ?? null,
        phone: phone ?? null,
        country_code: countryCode ?? null,
        segment: segment ?? null,
        interests: interests ?? null,
      },
      db,
    ).catch(console.error);

    // Programmatic lead scoring (in-process, fast — runs before push so the
    // notification can include the tier). Skipped entirely for a connect
    // request: the visitor asked to be put in touch before Omar gathered
    // enough to grade them, so there's nothing to score, and scoring would
    // otherwise overwrite the 'connect' qualification we just wrote with a
    // hot/warm/cold tier.
    if (!isConnectRequest) {
      await scoreLeadFromConversation(leadId, conversationId ?? null, segment ?? null, interests ?? null, db);
    }

    // Fetch the freshly-scored tier for the push body
    const scored = await db.execute({
      sql: "SELECT qualification, lead_score FROM leads WHERE id = ?",
      args: [leadId],
    });
    const tier = String(scored.rows[0]?.qualification ?? "warm");
    const score = Number(scored.rows[0]?.lead_score ?? 0);

    // Fire-and-forget: notify admin of new lead with score tier
    sendPushNotification({
      title: tier === "hot" ? "🔥 Hot Lead" : tier === "warm" ? "Warm Lead" : "New Lead (Cold)",
      body: `${name} — ${segment ?? "unknown"} · score ${score}`,
      url: "/admin/leads",
    }).catch(console.error);

    // Check if there's a booking for this conversation, link it and generate draft email
    try {
      if (conversationId) {
        const bookingRow = await db.execute({
          sql: "SELECT id, preferred_date, preferred_time FROM bookings WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 1",
          args: [conversationId],
        });

        if (bookingRow.rows[0]) {
          const booking = bookingRow.rows[0];
          await db.execute({
            sql: "UPDATE bookings SET lead_id = ?, status = 'confirmed' WHERE id = ?",
            args: [leadId, String(booking.id)],
          });
          await db.execute({
            sql: "UPDATE leads SET booking_id = ? WHERE id = ?",
            args: [String(booking.id), leadId],
          });

          const { generateBookingConfirmationEmail } = await import("@/lib/email/booking");
          const ahmedEmail = process.env.EMAIL_FROM_ADDRESS ?? "contact@gatewaytooman.com";
          const { subject, html, icsAttachment } = generateBookingConfirmationEmail({
            leadName: name,
            leadEmail: email,
            date: String(booking.preferred_date),
            time: String(booking.preferred_time),
            ahmedEmail,
          });

          await db.execute({
            sql: "INSERT INTO emails (lead_id, booking_id, to_address, subject, body, status) VALUES (?, ?, ?, ?, ?, 'draft')",
            args: [leadId, String(booking.id), email, subject, JSON.stringify({ html, icsAttachment })],
          });

          sendPushNotification({
            title: "New Booking",
            body: `${name} booked for ${booking.preferred_date} at ${booking.preferred_time}`,
            url: `/admin/leads`,
          }).catch(console.error);
        }
      }
    } catch (bookingErr) {
      console.error("Booking linkage failed (lead was still created):", bookingErr);
    }

    return NextResponse.json({ success: true, id: leadId }, { status: 201 });
  } catch (error) {
    console.error("Lead creation error:", error);
    return NextResponse.json({ error: "Failed to create lead" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const qualification = searchParams.get("qualification");
    const segment = searchParams.get("segment");
    const source = searchParams.get("source");

    let sql = "SELECT * FROM leads";
    const conditions: string[] = [];
    const args: string[] = [];

    if (status) {
      conditions.push("status = ?");
      args.push(status);
    }
    if (qualification) {
      conditions.push("qualification = ?");
      args.push(qualification);
    }
    if (segment) {
      conditions.push("segment = ?");
      args.push(segment);
    }
    if (source) {
      conditions.push("source = ?");
      args.push(source);
    }

    if (conditions.length > 0) {
      sql += " WHERE " + conditions.join(" AND ");
    }
    sql += " ORDER BY created_at DESC";

    const result = await db.execute({ sql, args });
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Leads list error:", error);
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
  }
}
