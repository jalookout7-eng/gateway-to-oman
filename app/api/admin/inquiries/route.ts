import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/token";
import { getDb } from "@/lib/db/client";

export async function GET(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const db = getDb();
  // All businesses-source leads (access requests), with the most-recent inquiry per lead if any.
  const result = await db.execute(`
    SELECT
      l.id AS lead_id,
      l.name,
      l.email,
      l.phone,
      l.interests AS message,
      l.outcome,
      l.status AS lead_status,
      l.admin_notes,
      l.created_at AS submitted_at,
      l.outcome_updated_at,
      l.outcome_reason,
      l.omar_grade_correct,
      i.id AS inquiry_id,
      i.status AS inquiry_status,
      i.created_at AS inquiry_created_at,
      list.id AS listing_id,
      list.slug AS listing_slug,
      list.title AS listing_title,
      list.location_city AS listing_city,
      cat.name AS listing_category
    FROM leads l
    LEFT JOIN inquiries i ON i.id = (
      SELECT id FROM inquiries WHERE lead_id = l.id ORDER BY created_at DESC LIMIT 1
    )
    LEFT JOIN listings list ON list.id = i.listing_id
    LEFT JOIN categories cat ON cat.id = list.category_id
    WHERE l.source = 'businesses'
    ORDER BY l.created_at DESC
  `);

  return NextResponse.json({
    inquiries: result.rows.map((row) => ({
      lead_id: row.lead_id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      message: row.message,
      outcome: row.outcome,
      lead_status: row.lead_status,
      admin_notes: row.admin_notes,
      submitted_at: row.submitted_at,
      outcome_updated_at: row.outcome_updated_at,
      outcome_reason: row.outcome_reason ?? null,
      omar_grade_correct: row.omar_grade_correct ?? null,
      inquiry_id: row.inquiry_id,
      inquiry_status: row.inquiry_status,
      inquiry_created_at: row.inquiry_created_at,
      listing: row.listing_id
        ? {
            id: row.listing_id,
            slug: row.listing_slug,
            title: row.listing_title,
            city: row.listing_city,
            category: row.listing_category,
          }
        : null,
    })),
  });
}
