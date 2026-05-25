import { getDb } from "@/lib/db/client";
import type { Client } from "@libsql/client";
import type { NextRequest } from "next/server";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
}

/** First X-Forwarded-For hop, else a stable fallback. */
export function getClientIp(request: NextRequest): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Fixed-window rate limit backed by the rate_limits table. Fails OPEN on any error.
 * @param bucket      logical name, e.g. "chat" | "login" | "otp" | "access"
 * @param identifier  usually an IP (or email for per-account limits)
 * @param limit       max requests allowed within the window
 * @param windowSec   window length in seconds
 * @param db          optional DB client (defaults to getDb(); pass a test client in tests)
 */
export async function rateLimit(
  bucket: string,
  identifier: string,
  limit: number,
  windowSec: number,
  db?: Client,
): Promise<RateLimitResult> {
  try {
    const dbClient = db ?? getDb();
    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - (now % windowSec);
    const key = `${bucket}:${identifier}`;

    await dbClient.execute({
      sql: `INSERT INTO rate_limits (key, window_start, count) VALUES (?, ?, 1)
            ON CONFLICT(key, window_start) DO UPDATE SET count = count + 1`,
      args: [key, windowStart],
    });

    const res = await dbClient.execute({
      sql: `SELECT count FROM rate_limits WHERE key = ? AND window_start = ?`,
      args: [key, windowStart],
    });

    // prune this key's stale windows (cheap housekeeping)
    await dbClient.execute({
      sql: `DELETE FROM rate_limits WHERE key = ? AND window_start < ?`,
      args: [key, windowStart],
    });

    const count = Number(res.rows[0]?.count ?? 0);
    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      retryAfterSec: windowStart + windowSec - now,
    };
  } catch {
    return { allowed: true, remaining: 1, retryAfterSec: 0 }; // fail open
  }
}
