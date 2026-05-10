import { createClient } from "@libsql/client";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const envPath = resolve(__dirname, "../.env");
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

async function verify() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  const admins = await client.execute(
    "SELECT id, email, full_name, role, active, created_at FROM admin_users",
  );
  console.log(`Admin users (${admins.rows.length}):`);
  for (const row of admins.rows) {
    console.log(`  - ${row.email} | ${row.full_name} | role=${row.role} | active=${row.active} | created=${row.created_at}`);
  }

  const log = await client.execute(
    "SELECT actor_type, action, target_type, metadata_json, created_at FROM activity_log ORDER BY created_at DESC LIMIT 5",
  );
  console.log(`\nRecent activity_log (${log.rows.length}):`);
  for (const row of log.rows) {
    console.log(`  - ${row.created_at} [${row.actor_type}] ${row.action} → ${row.target_type}`);
    if (row.metadata_json) console.log(`    meta: ${row.metadata_json}`);
  }

  process.exit(0);
}

verify();
