import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { sendPushNotification } from "@/lib/push/notify";
import { summariseLead, type LeadFacts } from "@/lib/ai/lead-summary";
import { parseIntakePayload } from "@/lib/intake/validate";
import { PURPOSE_TO_SEGMENT } from "@/lib/intake/constants";

/**
 * Public intake endpoint (spec 2026-07-26).
 *
 * Deliberately separate from /api/leads rather than adding a `source`
 * parameter there: source must never be browser-controlled, and this
 * payload carries seven extra fields with their own allowlists.
 *
 * Every intake lead is written as qualification 'intake' (labelled
 * "from /intake" in the admin), a sibling of 'connect' rather than the same
 * tier: both record how the lead arrived and neither is ever AI scored, but
 * keeping them apart lets Ahmed see at a glance which inbound route produced
 * a lead. The visitor
 * asked to be contacted before anything graded them, so a hot/warm/cold
 * label would be fiction, and 'Cold' in particular would push a real
 * inbound enquiry down Ahmed's triage list. `source = 'intake'` keeps them
 * separable from Omar-captured connect leads in reporting.
 */

async function generateIntakeSummary(leadId: string, facts: LeadFacts, extras: string) {
  try {
    // No conversation exists, so the structured answers stand in for the
    // transcript. summariseLead already accepts a null transcript; passing
    // the answers instead gives it something real to summarise.
    const summary = await summariseLead(facts, extras || null);
    const db = getDb();
    await db.execute({
      sql: "UPDATE leads SET ai_summary = ? WHERE id = ?",
      args: [summary, leadId],
    });
  } catch (err) {
    console.error("[intake] summary generation failed:", err);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Public, unauthenticated, and it fans out to an AI call plus a push on
    // every accepted submission. Two windows, same shape as /api/leads but
    // tighter: an intake form is a considered action, not a chat reply.
    const ip = getClientIp(request);
    const burst = await rateLimit("intake_form", ip, 3, 600);
    if (!burst.allowed) {
      return NextResponse.json(
        { error: "Too many submissions. Please try again shortly." },
        { status: 429, headers: { "Retry-After": String(burst.retryAfterSec) } },
      );
    }
    const daily = await rateLimit("intake_form_day", ip, 10, 86400);
    if (!daily.allowed) {
      return NextResponse.json(
        { error: "Too many submissions. Please try again shortly." },
        { status: 429, headers: { "Retry-After": String(daily.retryAfterSec) } },
      );
    }

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid submission" }, { status: 400 });
    }

    const parsed = parseIntakePayload(raw);

    if (!parsed.ok && parsed.reason === "bot") {
      // Silent success: a bot that gets a 400 learns the trap exists.
      return NextResponse.json({ success: true, id: "" }, { status: 201 });
    }
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const data = parsed.data;
    const db = getDb();

    // Merges into existing columns so intake leads work with the filters,
    // charts and intelligence queries that already exist.
    const segment = data.investmentPurpose
      ? (PURPOSE_TO_SEGMENT[data.investmentPurpose] ?? null)
      : null;
    const interests = data.investmentPurpose;

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
      .toISOString().replace("T", " ").slice(0, 19);

    // Dedupe scoped to source = 'intake'. Unscoped, a same-day Omar chat
    // lead or marketplace signup on the same email would silently swallow
    // this submission (the exact bug caught in review during Batch 16).
    // Guard and INSERT are one statement so two racing submissions cannot
    // both land.
    const result = await db.execute({
      sql: `INSERT INTO leads
              (name, email, phone, country_code, country_of_residence, segment, interests,
               qualification, status, source, investment_timeline, investment_purpose,
               preferred_location, residency_interest, services_needed, additional_comments)
            SELECT ?, ?, ?, ?, ?, ?, ?, 'intake', 'new', 'intake', ?, ?, ?, ?, ?, ?
            WHERE NOT EXISTS (
              SELECT 1 FROM leads WHERE email = ? AND source = 'intake' AND created_at >= ?
            )
            RETURNING id`,
      args: [
        data.name,
        data.email,
        data.phone,
        data.countryCode,
        data.countryOfResidence,
        segment,
        interests,
        data.investmentTimeline,
        data.investmentPurpose,
        data.preferredLocation,
        data.residencyInterest,
        data.servicesNeeded.length > 0 ? JSON.stringify(data.servicesNeeded) : null,
        data.additionalComments,
        data.email,
        oneDayAgo,
      ],
    });

    // Zero rows means the guard fired: this email already submitted inside
    // 24h. Return the existing id in the normal success shape and skip the
    // AI and push fan-out, so a repeat submit looks identical to the
    // visitor and costs us nothing.
    if (result.rows.length === 0) {
      const existing = await db.execute({
        sql: `SELECT id FROM leads
              WHERE email = ? AND source = 'intake' AND created_at >= ?
              ORDER BY created_at DESC LIMIT 1`,
        args: [data.email, oneDayAgo],
      });
      return NextResponse.json(
        { success: true, id: String(existing.rows[0]?.id ?? "") },
        { status: 201 },
      );
    }

    const leadId = String(result.rows[0].id);

    const answerLines = [
      data.countryOfResidence ? `Country of residence: ${data.countryOfResidence}` : null,
      data.investmentTimeline ? `Timeline: ${data.investmentTimeline}` : null,
      data.investmentPurpose ? `Purpose: ${data.investmentPurpose}` : null,
      data.preferredLocation ? `Preferred location: ${data.preferredLocation}` : null,
      data.residencyInterest ? `Residency interest: ${data.residencyInterest}` : null,
      data.servicesNeeded.length > 0 ? `Services needed: ${data.servicesNeeded.join(", ")}` : null,
      data.additionalComments ? `Their comments: ${data.additionalComments}` : null,
    ].filter(Boolean).join("\n");

    generateIntakeSummary(
      leadId,
      {
        name: data.name,
        email: data.email,
        phone: data.phone,
        country_code: data.countryCode,
        segment,
        interests,
      },
      answerLines,
    ).catch(console.error);

    sendPushNotification({
      title: "📋 Intake Form",
      body: `${data.name} · ${data.investmentPurpose ?? "purpose not stated"}`,
      url: "/admin/leads",
    }).catch(console.error);

    return NextResponse.json({ success: true, id: leadId }, { status: 201 });
  } catch (error) {
    console.error("[intake] submission failed:", error);
    return NextResponse.json({ error: "Failed to submit. Please try again." }, { status: 500 });
  }
}
