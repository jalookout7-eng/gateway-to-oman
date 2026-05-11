import { getDb } from "@/lib/db/client";

const ACCESS_FEE_KEY = "marketplace_access_fee_omr";
const ACCESS_FEE_DEFAULT = 100;

export async function getMarketplaceAccessFee(): Promise<number> {
  const db = getDb();
  const result = await db.execute({
    sql: "SELECT value FROM settings WHERE key = ?",
    args: [ACCESS_FEE_KEY],
  });
  if (result.rows.length === 0) return ACCESS_FEE_DEFAULT;
  const parsed = Number(result.rows[0].value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : ACCESS_FEE_DEFAULT;
}

export async function setMarketplaceAccessFee(amount: number): Promise<void> {
  if (!Number.isFinite(amount) || amount < 0) throw new Error("Invalid access fee amount");
  const db = getDb();
  await db.execute({
    sql: `INSERT INTO settings (key, value, updated_at)
          VALUES (?, ?, datetime('now'))
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
    args: [ACCESS_FEE_KEY, String(Math.round(amount))],
  });
}
