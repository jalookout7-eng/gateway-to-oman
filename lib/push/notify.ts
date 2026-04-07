import webpush from "web-push";
import { getDb } from "@/lib/db/client";

export async function sendPushNotification(payload: {
  title: string;
  body: string;
  url: string;
}) {
  if (!process.env.VAPID_EMAIL || !process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    console.warn("Push notifications disabled: VAPID env vars not set");
    return;
  }
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL!,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );

  const db = getDb();
  const subs = await db.execute({
    sql: "SELECT endpoint, p256dh, auth FROM push_subscriptions",
    args: [],
  });

  const results = await Promise.allSettled(
    subs.rows.map((row) =>
      webpush.sendNotification(
        {
          endpoint: String(row.endpoint),
          keys: { p256dh: String(row.p256dh), auth: String(row.auth) },
        },
        JSON.stringify(payload)
      )
    )
  );

  // Remove expired subscriptions (410 Gone)
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === "rejected") {
      const err = result.reason as { statusCode?: number };
      if (err.statusCode === 410) {
        await db.execute({
          sql: "DELETE FROM push_subscriptions WHERE endpoint = ?",
          args: [String(subs.rows[i].endpoint)],
        });
      }
    }
  }
}
