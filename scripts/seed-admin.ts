import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";
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

async function seedAdmin() {
  const email = process.env.ADMIN_SEED_EMAIL;
  const password = process.env.ADMIN_SEED_PASSWORD;
  const fullName = process.env.ADMIN_SEED_NAME ?? null;
  const role = process.env.ADMIN_SEED_ROLE ?? "owner";

  if (!email || !password) {
    console.error("Missing ADMIN_SEED_EMAIL or ADMIN_SEED_PASSWORD env vars");
    process.exit(1);
  }

  if (!["owner", "admin", "viewer"].includes(role)) {
    console.error(`Invalid role: ${role}. Must be owner, admin, or viewer.`);
    process.exit(1);
  }

  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  const existing = await client.execute({
    sql: "SELECT id, email, role FROM admin_users WHERE email = ?",
    args: [email],
  });

  if (existing.rows.length > 0) {
    const row = existing.rows[0];
    console.log(`Admin already exists: ${row.email} (id: ${row.id}, role: ${row.role}). Skipping.`);
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await client.execute({
    sql: `INSERT INTO admin_users (email, password_hash, full_name, role) VALUES (?, ?, ?, ?)`,
    args: [email, passwordHash, fullName, role],
  });

  console.log(`Seeded admin user: ${email} (role: ${role})`);

  await client.execute({
    sql: `INSERT INTO activity_log (actor_type, action, target_type, metadata_json)
          VALUES ('system', 'admin_user_seeded', 'admin_users', ?)`,
    args: [JSON.stringify({ email, role, source: "scripts/seed-admin.ts" })],
  });

  process.exit(0);
}

seedAdmin();
