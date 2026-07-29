import { getDb } from "@/lib/db/client";

/**
 * Hard-delete a lead and everything that hangs off it. Shared by both the
 * single-row DELETE endpoint at `/api/admin/leads/[id]` and the bulk-delete
 * endpoint at `/api/admin/leads/bulk-delete`.
 *
 * Cascade order matters — FK references mean children must die first:
 *   1. emails              (lead_id FK)
 *   2. lead_notes          (lead_id FK)
 *   3. inquiries           (lead_id FK)
 *   4. bookings.lead_id    set NULL (booking row stays — slot record may be useful)
 *   5. marketplace_users.lead_id  set NULL (the ACCOUNT must survive)
 *   6. sellers.lead_id     set NULL (the seller record must survive)
 *   7. leads               (the row itself — MUST precede its conversation,
 *                            because leads.conversation_id is itself an FK)
 *   8. messages            (conversation_id FK, if lead had a conversation)
 *   9. conversations       (the lead's own conversation — orphan otherwise)
 *
 * Steps 5 and 6 were MISSING until 2026-07-29, which made any lead that had
 * signed up to the marketplace undeletable: the final DELETE failed on the
 * marketplace_users FK and the admin saw a bare "Delete failed". Both columns
 * are nullable and are detached rather than deleted, because removing
 * someone's marketplace account (and their ability to sign in) as a side
 * effect of tidying up a lead row would be badly wrong.
 *
 * Wrapped in a libsql write batch so a half-applied delete can't leave
 * dangling rows. The activity_log entry captures lead identity BEFORE the
 * row goes — useful when JA later wonders what was wiped.
 */
export async function deleteLeadCascade(
  leadId: string,
  actorId: string | null,
  ip: string | null,
  userAgent: string | null,
): Promise<{ deleted: boolean; reason?: string }> {
  const db = getDb();

  const row = await db.execute({
    sql: "SELECT id, name, email, conversation_id FROM leads WHERE id = ?",
    args: [leadId],
  });
  if (row.rows.length === 0) {
    return { deleted: false, reason: "not_found" };
  }
  const lead = row.rows[0] as unknown as {
    id: string;
    name: string;
    email: string;
    conversation_id: string | null;
  };

  // Atomic cascade via libsql write batch (the BEGIN/COMMIT path proved
  // unreliable on Turso HTTP — see Batch 5 notes).
  const statements: { sql: string; args: (string | null)[] }[] = [
    { sql: "DELETE FROM emails WHERE lead_id = ?", args: [leadId] },
    { sql: "DELETE FROM lead_notes WHERE lead_id = ?", args: [leadId] },
    { sql: "DELETE FROM inquiries WHERE lead_id = ?", args: [leadId] },
    { sql: "UPDATE bookings SET lead_id = NULL WHERE lead_id = ?", args: [leadId] },
    // Detach, never delete: these rows represent a person's marketplace
    // account and their seller record, which must outlive the lead row.
    { sql: "UPDATE marketplace_users SET lead_id = NULL WHERE lead_id = ?", args: [leadId] },
    { sql: "UPDATE sellers SET lead_id = NULL WHERE lead_id = ?", args: [leadId] },
  ];
  // The lead row goes BEFORE its conversation. leads.conversation_id is
  // itself a foreign key, so deleting the conversation first fails with
  // "FOREIGN KEY constraint failed" while the lead still points at it. That
  // made every chat-captured lead undeletable; it went unnoticed only
  // because no chat-captured lead existed in production yet.
  statements.push({ sql: "DELETE FROM leads WHERE id = ?", args: [leadId] });
  if (lead.conversation_id) {
    statements.push({
      sql: "DELETE FROM messages WHERE conversation_id = ?",
      args: [lead.conversation_id],
    });
    statements.push({
      sql: "DELETE FROM conversations WHERE id = ?",
      args: [lead.conversation_id],
    });
  }

  await db.batch(statements, "write");

  await db.execute({
    sql: `INSERT INTO activity_log
            (actor_type, actor_id, action, target_type, target_id, source, metadata_json, ip, user_agent)
          VALUES ('admin', ?, 'lead_delete', 'lead', ?, 'main', ?, ?, ?)`,
    args: [
      actorId,
      leadId,
      JSON.stringify({
        name: lead.name,
        email: lead.email,
        conversation_id: lead.conversation_id,
      }),
      ip,
      userAgent,
    ],
  });

  return { deleted: true };
}
