# Batch 16 Security Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the 2 HIGH + 4 MED findings from the 2026-05-30 audit: rate limits on public lead capture and OTP verify, sign-up enumeration fix, owner-only gates on two admin surfaces, and Google id_token signature verification.

**Architecture:** Every fix lands inside an existing route/lib file. Rate limiting reuses `lib/rate-limit.ts` (Turso-backed fixed window, fails open). `requireOwner()` already exists in `lib/auth/token.ts` — the A01 items are call-site swaps. A08-1 replaces the decode-only `decodeIdToken` with a `jose`-verified `verifyGoogleIdToken` (JWKS injectable for tests).

**Tech Stack:** Next.js 14 route handlers, @libsql/client in-memory DB for tests (vitest), `jose` (NEW dependency — the batch's only one).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-25-batch16-security-hardening-design.md`
- Baselines (updated 2026-07-25): 202/202 tests across 33 files · `npx tsc --noEmit` = 3 pre-existing test-file errors (2× `tests/admin/lead-update.test.ts`, 1× `tests/api/chat.test.ts`) · `npm run build` = 85 routes. Add nothing to any of these.
- 429 response shape everywhere: `{ error: "Too many requests. Please slow down." }` with `Retry-After` header — copied from the existing pattern in `app/api/businesses/sign-up/route.ts:13-18`.
- Success shapes for legitimate users must not change on any route.
- Test harness: mirror `tests/admin/lead-update.test.ts` — in-memory libsql via `vi.mock("@/lib/db/client")`, schema loaded from `lib/db/schema.sql` (skip duplicate-column errors), `NextRequest` constructed directly. `rateLimit()` imports the same mocked `getDb`, so limits hit the in-memory DB automatically; clear `rate_limits` in `beforeEach`.
- **⚠️ SPEC DEVIATION (controller-approved, surface to JA):** the spec's literal "same IP within 24h → silent success" would silently discard legitimate leads from shared IPs (office/family NAT). Implemented instead as: email → 24h silent dedupe (spec-faithful); IP → 5/10min limit **plus** 15/24h daily cap, both returning 429 (attack still capped, legit shared-IP leads not silently lost).
- **NO PROD DEPLOY in this plan.** The branch carries the mobile-nav feature still gated on JA's click-test (HANDOVER item P). Batch 16 ships to prod TOGETHER with it once P is approved. Final task ends at verification, not deploy.
- Stage only your task's files. `.gitattributes` (`* text=auto`) now guards line endings.
- Commit messages: conventional commits, ending with
  `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`

---

### Task 1: A04-2 — IP rate limit on OTP verify

**Files:**
- Modify: `app/api/businesses/verify-otp/route.ts:1-13`
- Test: `tests/api/verify-otp-ratelimit.test.ts` (create)

**Interfaces:**
- Consumes: `rateLimit`, `getClientIp` from `@/lib/rate-limit` (existing).
- Produces: nothing downstream.

- [ ] **Step 1: Write the failing test**

```ts
// tests/api/verify-otp-ratelimit.test.ts
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { createClient, type Client } from "@libsql/client";
import { readFileSync } from "fs";
import { resolve } from "path";
import { NextRequest } from "next/server";

let db: Client;

async function makeTestDb(): Promise<Client> {
  const client = createClient({ url: "file::memory:" });
  const schema = readFileSync(resolve(__dirname, "../../lib/db/schema.sql"), "utf-8");
  for (const stmt of schema.split(";").map((s) => s.trim()).filter(Boolean)) {
    try {
      await client.execute(stmt);
    } catch (err) {
      const m = String(err);
      if (m.includes("duplicate column") || m.includes("already exists")) continue;
      throw err;
    }
  }
  return client;
}

vi.mock("@/lib/db/client", () => ({
  getDb: () => db,
}));

// The route's marketplace helpers are irrelevant to the limiter — mock them
// so a "verification attempt" is cheap and always invalid.
vi.mock("@/lib/auth/marketplace", () => ({
  verifyOtp: vi.fn(async () => ({ ok: false, reason: "invalid" as const })),
  findUserByEmail: vi.fn(async () => null),
  createMarketplaceSession: vi.fn(async () => "tok"),
  marketplaceCookieOptions: () => ({}),
  MARKETPLACE_SESSION_COOKIE: "gto_marketplace_session",
}));

import { POST } from "@/app/api/businesses/verify-otp/route";

function makeRequest(ip = "203.0.113.9"): NextRequest {
  return new NextRequest("http://localhost/api/businesses/verify-otp", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify({ email: "a@b.com", code: "123456", purpose: "signin" }),
  });
}

beforeAll(async () => {
  db = await makeTestDb();
});

beforeEach(async () => {
  await db.execute("DELETE FROM rate_limits");
});

describe("POST /api/businesses/verify-otp — IP rate limit (A04-2)", () => {
  it("allows the first 20 attempts from one IP (invalid code → 400, not 429)", async () => {
    for (let i = 0; i < 20; i++) {
      const res = await POST(makeRequest());
      expect(res.status).toBe(400);
    }
  });

  it("returns 429 with Retry-After on the 21st attempt from the same IP", async () => {
    for (let i = 0; i < 20; i++) await POST(makeRequest());
    const res = await POST(makeRequest());
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
    const body = await res.json();
    expect(body.error).toBe("Too many requests. Please slow down.");
  });

  it("does not throttle a different IP", async () => {
    for (let i = 0; i < 21; i++) await POST(makeRequest("203.0.113.9"));
    const res = await POST(makeRequest("198.51.100.7"));
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/api/verify-otp-ratelimit.test.ts`
Expected: FAIL — the 21st attempt returns 400, not 429 (no limiter in the route yet).

- [ ] **Step 3: Add the limiter to the route**

In `app/api/businesses/verify-otp/route.ts`, add to the imports:

```ts
import { rateLimit, getClientIp } from "@/lib/rate-limit";
```

Then insert at the very top of `POST`, before `request.json()`:

```ts
  // A04-2: IP-level cap so per-OTP attempt limits can't be reset by re-issuance.
  const ip = getClientIp(request);
  const rl = await rateLimit("verify_otp", ip, 20, 600);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/api/verify-otp-ratelimit.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add app/api/businesses/verify-otp/route.ts tests/api/verify-otp-ratelimit.test.ts
git commit -m "fix(security): IP rate limit on OTP verify (A04-2)"
```

---

### Task 2: A04-1 — rate limits + email dedupe on public lead capture

**Files:**
- Modify: `app/api/leads/route.ts:112-130` (POST entry)
- Test: `tests/api/leads-ratelimit.test.ts` (create)

**Interfaces:**
- Consumes: `rateLimit`, `getClientIp` from `@/lib/rate-limit`.
- Produces: nothing downstream.

- [ ] **Step 1: Write the failing test**

```ts
// tests/api/leads-ratelimit.test.ts
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { createClient, type Client } from "@libsql/client";
import { readFileSync } from "fs";
import { resolve } from "path";
import { NextRequest } from "next/server";

let db: Client;

async function makeTestDb(): Promise<Client> {
  const client = createClient({ url: "file::memory:" });
  const schema = readFileSync(resolve(__dirname, "../../lib/db/schema.sql"), "utf-8");
  for (const stmt of schema.split(";").map((s) => s.trim()).filter(Boolean)) {
    try {
      await client.execute(stmt);
    } catch (err) {
      const m = String(err);
      if (m.includes("duplicate column") || m.includes("already exists")) continue;
      throw err;
    }
  }
  return client;
}

vi.mock("@/lib/db/client", () => ({
  getDb: () => db,
}));

// Kill the expensive side effects — the limiter/dedupe behavior is the target.
const pushMock = vi.fn(async () => undefined);
vi.mock("@/lib/push/notify", () => ({
  sendPushNotification: (...args: unknown[]) => pushMock(...args),
}));
vi.mock("@/lib/ai/lead-summary", () => ({
  summariseLead: vi.fn(async () => "test summary"),
}));

import { POST } from "@/app/api/leads/route";

function makeRequest(email: string, ip = "203.0.113.9"): NextRequest {
  return new NextRequest("http://localhost/api/leads", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    // conversationId null → scoring + summary paths exit early / stay cheap
    body: JSON.stringify({ name: "Test Person", email, conversationId: null }),
  });
}

beforeAll(async () => {
  db = await makeTestDb();
});

beforeEach(async () => {
  await db.execute("DELETE FROM rate_limits");
  await db.execute("DELETE FROM leads");
  pushMock.mockClear();
});

describe("POST /api/leads — rate limits + dedupe (A04-1)", () => {
  it("creates a lead normally (201 with id)", async () => {
    const res = await POST(makeRequest("one@example.com"));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.id).toBeTruthy();
  });

  it("silently dedupes a repeat email within 24h — success shape, no second row, no second push", async () => {
    const first = await POST(makeRequest("dupe@example.com", "203.0.113.1"));
    const firstBody = await first.json();
    pushMock.mockClear();

    const second = await POST(makeRequest("dupe@example.com", "198.51.100.2"));
    expect(second.status).toBe(201);
    const secondBody = await second.json();
    expect(secondBody.success).toBe(true);
    expect(secondBody.id).toBe(firstBody.id);

    const rows = await db.execute("SELECT COUNT(*) AS n FROM leads WHERE email = 'dupe@example.com'");
    expect(Number(rows.rows[0].n)).toBe(1);
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("returns 429 on the 6th submission from one IP inside 10 minutes", async () => {
    for (let i = 0; i < 5; i++) {
      await POST(makeRequest(`u${i}@example.com`));
    }
    const res = await POST(makeRequest("u5@example.com"));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
  });

  it("does not throttle a different IP", async () => {
    for (let i = 0; i < 6; i++) await POST(makeRequest(`v${i}@example.com`, "203.0.113.50"));
    const res = await POST(makeRequest("fresh@example.com", "198.51.100.99"));
    expect(res.status).toBe(201);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/api/leads-ratelimit.test.ts`
Expected: FAIL — dedupe test finds 2 rows; 6th submission returns 201 not 429.

- [ ] **Step 3: Add limits + dedupe to the route**

In `app/api/leads/route.ts`, add to the imports:

```ts
import { rateLimit, getClientIp } from "@/lib/rate-limit";
```

Then replace the start of `POST` (the `try {` down to the email-format check) so it reads:

```ts
export async function POST(request: NextRequest) {
  try {
    // A04-1: public endpoint that fans out to AI + push on every hit — cap it.
    // Two windows: burst (5/10min) and daily (15/24h) per IP. Deliberately NOT
    // a silent per-IP dedupe: shared IPs (office/family NAT) submit legitimate
    // distinct leads, so repeats inside the caps stay allowed and over-cap gets
    // an honest 429 instead of a silently discarded lead.
    const ip = getClientIp(request);
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

    const { name, email, phone, countryCode, conversationId, segment, interests } =
      await request.json();

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
    // the M-6 access-request pattern; silent so probers learn nothing).
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
      .toISOString().replace("T", " ").slice(0, 19);
    const dupe = await db.execute({
      sql: `SELECT id FROM leads WHERE email = ? AND created_at >= ? LIMIT 1`,
      args: [email, oneDayAgo],
    });
    if (dupe.rows.length > 0) {
      return NextResponse.json(
        { success: true, id: String(dupe.rows[0].id) },
        { status: 201 },
      );
    }
```

(The existing `const db = getDb();` line further down is replaced by the one above — do not leave a duplicate declaration. Everything from the original `const result = await db.execute({` INSERT onward stays untouched.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/api/leads-ratelimit.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add app/api/leads/route.ts tests/api/leads-ratelimit.test.ts
git commit -m "fix(security): rate limits + 24h email dedupe on public lead capture (A04-1)"
```

---

### Task 3: A07-1 — kill email enumeration on sign-up

**Files:**
- Modify: `app/api/businesses/sign-up/route.ts:49-56`
- Test: `tests/api/sign-up-enumeration.test.ts` (create)

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing downstream. Decision pre-accepted by JA (HANDOVER item N).

- [ ] **Step 1: Write the failing test**

```ts
// tests/api/sign-up-enumeration.test.ts
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { createClient, type Client } from "@libsql/client";
import { readFileSync } from "fs";
import { resolve } from "path";
import { NextRequest } from "next/server";

let db: Client;

async function makeTestDb(): Promise<Client> {
  const client = createClient({ url: "file::memory:" });
  const schema = readFileSync(resolve(__dirname, "../../lib/db/schema.sql"), "utf-8");
  for (const stmt of schema.split(";").map((s) => s.trim()).filter(Boolean)) {
    try {
      await client.execute(stmt);
    } catch (err) {
      const m = String(err);
      if (m.includes("duplicate column") || m.includes("already exists")) continue;
      throw err;
    }
  }
  return client;
}

vi.mock("@/lib/db/client", () => ({
  getDb: () => db,
}));

const sendOtpMock = vi.fn(async () => undefined);
vi.mock("@/lib/email/otp", () => ({
  sendOtpEmail: (...args: unknown[]) => sendOtpMock(...args),
}));

const findUserMock = vi.fn();
vi.mock("@/lib/auth/marketplace", () => ({
  findUserByEmail: (...args: unknown[]) => findUserMock(...args),
  createUser: vi.fn(async () => "user-id-1"),
  issueOtp: vi.fn(async () => "123456"),
}));

import { POST } from "@/app/api/businesses/sign-up/route";

function makeRequest(email: string, ip = "203.0.113.9"): NextRequest {
  return new NextRequest("http://localhost/api/businesses/sign-up", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify({
      full_name: "Test Person",
      email,
      phone: "+96890000000",
      password: "longenough8",
    }),
  });
}

beforeAll(async () => {
  db = await makeTestDb();
});

beforeEach(async () => {
  await db.execute("DELETE FROM rate_limits");
  sendOtpMock.mockClear();
  findUserMock.mockReset();
});

describe("POST /api/businesses/sign-up — enumeration fix (A07-1)", () => {
  it("returns the generic success shape for an EXISTING VERIFIED email, sending nothing", async () => {
    findUserMock.mockResolvedValue({ id: "u1", email_verified: true });
    const res = await POST(makeRequest("taken@example.com"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true, otp_sent: true });
    expect(sendOtpMock).not.toHaveBeenCalled();
  });

  it("returns the same shape for a fresh email (and does send the OTP)", async () => {
    findUserMock.mockResolvedValue(null);
    const res = await POST(makeRequest("fresh@example.com", "198.51.100.7"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.otp_sent).toBe(true);
    expect(sendOtpMock).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/api/sign-up-enumeration.test.ts`
Expected: FAIL — existing-verified case returns 409 with "An account with that email exists…".

- [ ] **Step 3: Replace the 409 branch**

In `app/api/businesses/sign-up/route.ts`, replace:

```ts
    if (existing.email_verified) {
      return NextResponse.json(
        { error: "An account with that email exists. Try signing in instead." },
        { status: 409 },
      );
    }
```

with:

```ts
    if (existing.email_verified) {
      // A07-1: same success shape as a fresh sign-up so responses can't be
      // used to enumerate accounts. Nothing is sent; the real owner's
      // recoverable path is sign-in. Trade-off accepted by JA (item N).
      return NextResponse.json({ ok: true, otp_sent: true });
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/api/sign-up-enumeration.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add app/api/businesses/sign-up/route.ts tests/api/sign-up-enumeration.test.ts
git commit -m "fix(security): generic sign-up response kills email enumeration (A07-1)"
```

---

### Task 4: A01-1 + A01-2 — requireOwner on admin-users and reviewer-link

**Files:**
- Modify: `app/api/admin/admin-users/route.ts` (POST only), `app/api/admin/admin-users/[id]/route.ts` (PATCH + DELETE), `app/api/admin/reviewer-link/route.ts` (GET + POST)
- Test: `tests/api/owner-gates.test.ts` (create)

**Interfaces:**
- Consumes: `requireOwner` from `@/lib/auth/token` (exists — `lib/auth/token.ts:39`).
- Produces: nothing downstream.

**Semantics:**
- `admin-users` GET keeps `requireAuth` (any admin may list; the audit's finding was the two-failure-path inline owner checks on mutations).
- POST/PATCH/DELETE: `requireOwner(request)` replaces the `requireAuth` call AND the inline `if (currentUser && currentUser.role !== "owner")` block is deleted. `getRequestUser` calls stay (used for `activity_log` and the self-delete guard).
- `reviewer-link` GET and POST both become `requireOwner` — the link grants marketplace access, so reading it is as sensitive as rotating it. Known consequence: a non-owner admin's settings page can no longer read the reviewer link (will surface as a 403; acceptable per audit intent — note for the final review).

- [ ] **Step 1: Write the failing test**

```ts
// tests/api/owner-gates.test.ts
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { createClient, type Client } from "@libsql/client";
import { readFileSync } from "fs";
import { resolve } from "path";
import { NextRequest } from "next/server";

let db: Client;

async function makeTestDb(): Promise<Client> {
  const client = createClient({ url: "file::memory:" });
  const schema = readFileSync(resolve(__dirname, "../../lib/db/schema.sql"), "utf-8");
  for (const stmt of schema.split(";").map((s) => s.trim()).filter(Boolean)) {
    try {
      await client.execute(stmt);
    } catch (err) {
      const m = String(err);
      if (m.includes("duplicate column") || m.includes("already exists")) continue;
      throw err;
    }
  }
  return client;
}

vi.mock("@/lib/db/client", () => ({
  getDb: () => db,
}));

// Control the session user per test; keep lib/auth/token.ts REAL so the
// requireOwner logic itself is what's under test.
const sessionUserMock = vi.fn();
vi.mock("@/lib/auth/sessions", () => ({
  SESSION_COOKIE_NAME: "gto_admin_session",
  getSessionUser: (...args: unknown[]) => sessionUserMock(...args),
}));

vi.mock("@/lib/businesses/reviewer", () => ({
  getReviewerToken: vi.fn(async () => "reviewer-token-1"),
  regenerateReviewerToken: vi.fn(async () => "reviewer-token-2"),
}));

import { POST as createAdminUser } from "@/app/api/admin/admin-users/route";
import { PATCH as patchAdminUser, DELETE as deleteAdminUser } from "@/app/api/admin/admin-users/[id]/route";
import { GET as getReviewerLink, POST as rotateReviewerLink } from "@/app/api/admin/reviewer-link/route";

function makeRequest(method: string, url: string, body?: unknown): NextRequest {
  return new NextRequest(`http://localhost${url}`, {
    method,
    headers: {
      "content-type": "application/json",
      cookie: "gto_admin_session=test-token",
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

const asOwner = () => sessionUserMock.mockResolvedValue({ id: "owner-1", email: "o@x.com", full_name: "Owner", role: "owner" });
const asAdmin = () => sessionUserMock.mockResolvedValue({ id: "admin-1", email: "a@x.com", full_name: "Admin", role: "admin" });

beforeAll(async () => {
  db = await makeTestDb();
});

beforeEach(() => {
  sessionUserMock.mockReset();
});

describe("owner gates (A01-1 admin-users, A01-2 reviewer-link)", () => {
  it("admin-users POST → 403 for non-owner admin", async () => {
    asAdmin();
    const res = await createAdminUser(
      makeRequest("POST", "/api/admin/admin-users", { email: "new@x.com", password: "longenough8" }),
    );
    expect(res.status).toBe(403);
  });

  it("admin-users POST → 201 for owner", async () => {
    asOwner();
    const res = await createAdminUser(
      makeRequest("POST", "/api/admin/admin-users", { email: "new2@x.com", password: "longenough8" }),
    );
    expect(res.status).toBe(201);
  });

  it("admin-users PATCH → 403 for non-owner admin", async () => {
    asAdmin();
    const res = await patchAdminUser(
      makeRequest("PATCH", "/api/admin/admin-users/some-id", { full_name: "X" }),
      { params: Promise.resolve({ id: "some-id" }) },
    );
    expect(res.status).toBe(403);
  });

  it("admin-users DELETE → 403 for non-owner admin", async () => {
    asAdmin();
    const res = await deleteAdminUser(
      makeRequest("DELETE", "/api/admin/admin-users/some-id"),
      { params: Promise.resolve({ id: "some-id" }) },
    );
    expect(res.status).toBe(403);
  });

  it("reviewer-link GET → 403 for non-owner admin, 200 for owner", async () => {
    asAdmin();
    const denied = await getReviewerLink(makeRequest("GET", "/api/admin/reviewer-link"));
    expect(denied.status).toBe(403);

    asOwner();
    const allowed = await getReviewerLink(makeRequest("GET", "/api/admin/reviewer-link"));
    expect(allowed.status).toBe(200);
  });

  it("reviewer-link POST (rotate) → 403 for non-owner admin, 200 for owner", async () => {
    asAdmin();
    const denied = await rotateReviewerLink(makeRequest("POST", "/api/admin/reviewer-link"));
    expect(denied.status).toBe(403);

    asOwner();
    const allowed = await rotateReviewerLink(makeRequest("POST", "/api/admin/reviewer-link"));
    expect(allowed.status).toBe(200);
  });

  it("unauthenticated → 401 everywhere", async () => {
    sessionUserMock.mockResolvedValue(null);
    const res = await rotateReviewerLink(makeRequest("POST", "/api/admin/reviewer-link"));
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/api/owner-gates.test.ts`
Expected: FAIL — reviewer-link GET/POST return 200 for the non-owner admin (only `requireAuth` today). (The admin-users 403 cases pass already via the inline checks — the point of the swap is one failure path, and the test pins the behavior through it.)

- [ ] **Step 3: Apply the swaps**

`app/api/admin/admin-users/route.ts`:
- Import: `import { requireAuth, requireOwner, getRequestUser } from "@/lib/auth/token";`
- In `POST`, replace:

```ts
  const authError = await requireAuth(request);
  if (authError) return authError;
  const currentUser = await getRequestUser(request);
  if (currentUser && currentUser.role !== "owner") {
    return NextResponse.json({ error: "Only owners can add admin users" }, { status: 403 });
  }
```

with:

```ts
  const authError = await requireOwner(request);
  if (authError) return authError;
  const currentUser = await getRequestUser(request);
```

- `GET` is unchanged (still `requireAuth`).

`app/api/admin/admin-users/[id]/route.ts`:
- Import: `import { requireOwner, getRequestUser } from "@/lib/auth/token";`
- In `PATCH`, replace:

```ts
  const authError = await requireAuth(request);
  if (authError) return authError;
  const currentUser = await getRequestUser(request);
  if (currentUser && currentUser.role !== "owner") {
    return NextResponse.json({ error: "Only owners can update admin users" }, { status: 403 });
  }
```

with:

```ts
  const authError = await requireOwner(request);
  if (authError) return authError;
  const currentUser = await getRequestUser(request);
```

- In `DELETE`, the same swap (delete its inline `"Only owners can delete admin users"` block). The self-delete guard (`currentUser?.id === id`) and owner-target guard stay.

`app/api/admin/reviewer-link/route.ts`:
- Replace the import of `requireAuth` with `requireOwner` and swap both call sites:

```ts
import { requireOwner } from "@/lib/auth/token";
```

and in both `GET` and `POST`:

```ts
  const authError = await requireOwner(request);
  if (authError) return authError;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/api/owner-gates.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add app/api/admin/admin-users/route.ts "app/api/admin/admin-users/[id]/route.ts" app/api/admin/reviewer-link/route.ts tests/api/owner-gates.test.ts
git commit -m "fix(security): requireOwner on admin-users mutations + reviewer link (A01-1, A01-2)"
```

---

### Task 5: A08-1 — verify Google id_token signature via jose

**Files:**
- Modify: `lib/auth/google.ts:41-57` (replace `decodeIdToken`), `app/api/businesses/google/callback/route.ts:4,43` (rename + await)
- Modify: `package.json` + `package-lock.json` (add `jose`)
- Test: `tests/auth/google-idtoken.test.ts` (create)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `verifyGoogleIdToken(idToken: string, jwks?: JWTVerifyGetKey): Promise<GoogleIdentity | null>` — replaces `decodeIdToken` (which is DELETED, not deprecated: the insecure path must not survive).

- [ ] **Step 1: Install jose**

Run: `npm install jose`
Expected: adds `jose` to dependencies (v6.x). Zero transitive dependencies.

- [ ] **Step 2: Write the failing test**

```ts
// tests/auth/google-idtoken.test.ts
import { describe, it, expect, beforeAll } from "vitest";
import { SignJWT, generateKeyPair, createLocalJWKSet, exportJWK, type JWTVerifyGetKey } from "jose";
import { verifyGoogleIdToken } from "@/lib/auth/google";

// Real-crypto test: sign tokens with a locally generated RSA key and hand the
// route the matching local JWKS — no network, no mocks of jose itself.
let jwks: JWTVerifyGetKey;
let privateKey: CryptoKey;
let strangerKey: CryptoKey;

const CLIENT_ID = "test-client-id.apps.googleusercontent.com";

async function signToken(opts: {
  key?: CryptoKey;
  iss?: string;
  aud?: string;
  expired?: boolean;
  payload?: Record<string, unknown>;
}): Promise<string> {
  const jwt = new SignJWT({
    email: "person@example.com",
    email_verified: true,
    name: "Test Person",
    ...(opts.payload ?? {}),
  })
    .setProtectedHeader({ alg: "RS256", kid: "test-key" })
    .setSubject("google-sub-123")
    .setIssuer(opts.iss ?? "https://accounts.google.com")
    .setAudience(opts.aud ?? CLIENT_ID)
    .setIssuedAt();
  if (opts.expired) {
    jwt.setExpirationTime(Math.floor(Date.now() / 1000) - 3600);
  } else {
    jwt.setExpirationTime("1h");
  }
  return jwt.sign(opts.key ?? privateKey);
}

beforeAll(async () => {
  process.env.GOOGLE_CLIENT_ID = CLIENT_ID;
  const pair = await generateKeyPair("RS256");
  privateKey = pair.privateKey as CryptoKey;
  const strangerPair = await generateKeyPair("RS256");
  strangerKey = strangerPair.privateKey as CryptoKey;
  const publicJwk = await exportJWK(pair.publicKey);
  publicJwk.kid = "test-key";
  publicJwk.alg = "RS256";
  jwks = createLocalJWKSet({ keys: [publicJwk] });
});

describe("verifyGoogleIdToken (A08-1)", () => {
  it("accepts a correctly signed token and maps the identity", async () => {
    const token = await signToken({});
    const identity = await verifyGoogleIdToken(token, jwks);
    expect(identity).toEqual({
      email: "person@example.com",
      name: "Test Person",
      sub: "google-sub-123",
      email_verified: true,
    });
  });

  it("accepts the bare 'accounts.google.com' issuer form", async () => {
    const token = await signToken({ iss: "accounts.google.com" });
    expect(await verifyGoogleIdToken(token, jwks)).not.toBeNull();
  });

  it("rejects a token signed by a different key", async () => {
    const token = await signToken({ key: strangerKey });
    expect(await verifyGoogleIdToken(token, jwks)).toBeNull();
  });

  it("rejects a wrong audience", async () => {
    const token = await signToken({ aud: "someone-else.apps.googleusercontent.com" });
    expect(await verifyGoogleIdToken(token, jwks)).toBeNull();
  });

  it("rejects a wrong issuer", async () => {
    const token = await signToken({ iss: "https://evil.example.com" });
    expect(await verifyGoogleIdToken(token, jwks)).toBeNull();
  });

  it("rejects an expired token", async () => {
    const token = await signToken({ expired: true });
    expect(await verifyGoogleIdToken(token, jwks)).toBeNull();
  });

  it("rejects garbage input", async () => {
    expect(await verifyGoogleIdToken("not-a-jwt", jwks)).toBeNull();
  });

  it("returns null when the payload is missing email or sub", async () => {
    const token = await signToken({ payload: { email: undefined } });
    expect(await verifyGoogleIdToken(token, jwks)).toBeNull();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/auth/google-idtoken.test.ts`
Expected: FAIL — `verifyGoogleIdToken` is not exported from `@/lib/auth/google`.

- [ ] **Step 4: Replace decodeIdToken in lib/auth/google.ts**

Delete the `decodeIdToken` function (lines 41-57) and its doc comment, and add:

```ts
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";

const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
// Google issues both forms; both are legitimate.
const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

let remoteJwks: JWTVerifyGetKey | null = null;
function googleJwks(): JWTVerifyGetKey {
  if (!remoteJwks) remoteJwks = createRemoteJWKSet(new URL(GOOGLE_JWKS_URL));
  return remoteJwks;
}

/**
 * Verify a Google id_token's signature against Google's JWKS and check
 * iss / aud / exp (A08-1 — replaces the decode-only path). The jwks
 * parameter exists as a test seam; production callers use the default.
 */
export async function verifyGoogleIdToken(
  idToken: string,
  jwks: JWTVerifyGetKey = googleJwks(),
): Promise<GoogleIdentity | null> {
  try {
    const { payload } = await jwtVerify(idToken, jwks, {
      issuer: GOOGLE_ISSUERS,
      audience: process.env.GOOGLE_CLIENT_ID ?? "",
    });
    if (!payload.email || !payload.sub) return null;
    return {
      email: String(payload.email),
      name: String(payload.name ?? ""),
      sub: String(payload.sub),
      email_verified: payload.email_verified === true || payload.email_verified === "true",
    };
  } catch {
    return null;
  }
}
```

(The `import` line goes at the top of the file with the other imports; the rest replaces `decodeIdToken` in place. `GoogleIdentity` type is unchanged.)

- [ ] **Step 5: Update the callback route**

In `app/api/businesses/google/callback/route.ts`: change the import of `decodeIdToken` to `verifyGoogleIdToken`, and change the call site to:

```ts
  const identity = await verifyGoogleIdToken(tokens.id_token);
```

(The existing null-handling after it stays as-is.)

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run tests/auth/google-idtoken.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 7: Grep for stragglers**

Run: `grep -rn "decodeIdToken" app/ lib/ tests/ components/`
Expected: zero hits.

- [ ] **Step 8: Commit**

```bash
git add lib/auth/google.ts app/api/businesses/google/callback/route.ts tests/auth/google-idtoken.test.ts package.json package-lock.json
git commit -m "fix(security): verify Google id_token signature via jose JWKS (A08-1)"
```

---

### Task 6: Full verification (NO deploy)

**Files:** none.

- [ ] **Step 1: Full suite**

Run: `npx vitest run`
Expected: 226 passing (202 baseline + 24 new: 3 + 4 + 2 + 7 + 8), 0 failures.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: exactly the 3 pre-existing test-file errors, nothing new.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: clean, 85 routes.

- [ ] **Step 4: STOP — no deploy**

Per Global Constraints: the branch carries the mobile-nav feature gated on JA's click-test (item P). Batch 16 goes to production in the same `vercel deploy --prod --yes` once P is approved. Controller reports back to JA instead of deploying.

---

## Self-review notes (done at write time)

- Spec coverage: A04-1 ✓ (T2), A04-2 ✓ (T1), A07-1 ✓ (T3), A01-1 ✓ (T4), A01-2 ✓ (T4), A08-1 ✓ (T5), "jose only new dependency" ✓, "429 generic" ✓, deploy plan adjusted (spec said direct-to-prod; branch state forbids it — documented in Global Constraints).
- Deviations, documented: IP-dedupe → daily cap (Global Constraints, with rationale, surfaced to JA); reviewer-link GET also owner-gated (semantics note in T4); sign-up unverified-account path unchanged (its `message` field predates this and isn't the enumeration vector — the verified/404 split is).
- Type consistency: `verifyGoogleIdToken` signature identical in T5 code, test import, and Interfaces block. Test counts per task sum to Task 6's expectation.
- All test files follow the `lead-update.test.ts` harness (in-memory libsql + `vi.mock("@/lib/db/client")`).
