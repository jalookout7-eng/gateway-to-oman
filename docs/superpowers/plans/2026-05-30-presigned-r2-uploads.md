# Presigned direct-to-R2 media uploads (images + videos)

> **Status:** PLANNED — approved approach, awaiting execution (JA will compact first, then execute).
> **Decisions locked:** remove legacy multipart POST (single clean path); video cap **50 MB**; image cap 5 MB → **15 MB**; gallery stays max 10.

## Context

Video uploads on the admin listings page fail — and upgrading Vercel to Pro did **not** fix it. Root cause (confirmed against current Vercel docs via vercel:deployment-expert): Vercel enforces a **hard 4.5 MB request-body limit on all Functions, on both Hobby and Pro**. It is not plan-gated, not configurable, and Fluid Compute did not change it. Our current upload routes the entire file through `await request.formData()` inside `app/api/admin/listings/[id]/media/route.ts`, so any file over 4.5 MB returns `413 FUNCTION_PAYLOAD_TOO_LARGE` before our code runs. A second, compounding bug: the client has a hardcoded `VERCEL_HOBBY_BODY_LIMIT_MB = 4.5` pre-flight guard that blocks videos > 4.5 MB *before they're even sent* — so the Pro upgrade had zero effect.

**Fix:** migrate **both images and videos** to the industry-standard pattern Vercel itself recommends — **presigned direct-to-R2 uploads**. The browser uploads the file straight to Cloudflare R2 via a presigned `PUT` URL, bypassing the Vercel function entirely. The function only handles tiny JSON requests (sign a URL, record the result). This permanently removes the 4.5 MB cap for this class of upload and adds a real progress bar.

This supersedes security-audit finding **A08-2** (server-side magic-byte sniffing) — see Security note below.

## Architecture

```
1. Browser → POST /api/.../media/presign   { slot, contentType, size }      [tiny]
2. Server  → presigned R2 PUT URL + final publicUrl + key                    [tiny]
3. Browser → PUT file directly to R2 (XHR, with upload.onprogress)           [bypasses Vercel]
4. Browser → POST /api/.../media/confirm   { slot, publicUrl, key }          [tiny → saves to DB]
```

The big payload never touches a Vercel function, so the 4.5 MB cap never applies.

## Changes

### 1. `package.json` — add dependency
Add `@aws-sdk/s3-request-presigner` at the same major as the existing `@aws-sdk/client-s3@^3.1053.0`.

### 2. `lib/r2.ts` — extract shared helpers + add presigner (pure refactor; keeps existing 8 tests green)
Extract the inline key/URL logic out of `uploadToR2` so the legacy path and the new path share it byte-for-byte:
```ts
export function buildR2Key(keyPrefix: string, extension: string): string
  // `${keyPrefix.replace(/\/$/,"")}/${Date.now()}-${randomBytes(8).toString("hex")}.${extension}`
export function buildPublicUrl(key: string): string
  // publicBase ? `${publicBase}/${key}` : `${R2_ENDPOINT}/${bucket}/${key}` — same .trim()/trailing-slash logic
export async function presignPutUrl(opts: { key: string; contentType: string; expiresIn?: number }): Promise<string>
  // getSignedUrl(getClient(), new PutObjectCommand({Bucket, Key, ContentType}), { expiresIn: opts.expiresIn ?? 300 })
```
Refactor `uploadToR2` to call `buildR2Key` + `buildPublicUrl` internally (output unchanged, so `tests/r2/upload.test.ts` stays green). Add `import { getSignedUrl } from "@aws-sdk/s3-request-presigner"`.

### 3. NEW `app/api/admin/listings/[id]/media/presign/route.ts`
`POST` — `requireAuth(request)` first → verify listing exists → `rateLimit("media-presign", getClientIp(request), 30, 60)` → validate `contentType` against the shared `IMAGE_TYPES`/`VIDEO_TYPES` allowlists → validate claimed `size` ≤ cap (15 MB image / 50 MB video) → for gallery, check current count < `MAX_GALLERY` → derive `ext` **from contentType, not filename** → `buildR2Key('listings/'+listingId, ext)` → `presignPutUrl({ key, contentType })`. Returns `{ uploadUrl, publicUrl, key }`. Does NOT touch the listings row.

Request shape: `{ slot: "cover"|"gallery"|"video", contentType: string, size: number }`.

### 4. NEW `app/api/admin/listings/[id]/media/confirm/route.ts`
`POST` — `requireAuth(request)` → verify listing exists → **verify `key` starts with `listings/${listingId}/`** (so a presign issued for listing A can't write into listing B's row) → write the DB column (reuse the exact persistence logic from the current POST):
- `cover` → `UPDATE listings SET cover_image_url = ?` (+ best-effort `deleteFromR2(keyFromUrl(oldUrl))` of the previous cover after the write succeeds, wrapped in try/catch)
- `video` → `UPDATE listings SET video_url = ?` (+ same old-object cleanup)
- `gallery` → append to `gallery_json` (`JSON.stringify([...existing, publicUrl])`), re-checking `MAX_GALLERY`
→ activity-log (`listing_media_upload`, same shape as today) → return updated `{ cover_image_url, gallery_urls, video_url }` via the existing `getMediaState()` helper.

Request shape: `{ slot, publicUrl, key }`.

### 5. `app/api/admin/listings/[id]/media/route.ts` — remove the POST
Delete the `POST` handler. **Keep the `DELETE` handler unchanged** (still used by `removeMedia`). Extract the shared caps (`IMAGE_TYPES`, `VIDEO_TYPES`, `MAX_IMAGE_BYTES`, `MAX_VIDEO_BYTES`, `MAX_GALLERY`) and `getMediaState()` into a small shared module (e.g. `lib/media-constants.ts` + keep `getMediaState` re-exportable) so presign + confirm + DELETE all import one source. Bump `MAX_IMAGE_BYTES` → 15 MB, `MAX_VIDEO_BYTES` → 50 MB.

### 6. `app/admin/listings/page.tsx` — rewrite the client upload (`ListingFormModal`)
- **Delete** the `VERCEL_HOBBY_BODY_LIMIT_MB` guard entirely (lines ~476-492).
- New helper inside the component:
```ts
function putToR2(file: File, uploadUrl: string, contentType: string, onProgress: (pct: number) => void): Promise<void>
  // XMLHttpRequest PUT; xhr.upload.onprogress → onProgress(Math.round(loaded/total*100));
  // xhr.setRequestHeader("Content-Type", contentType)  ← MUST match the signed CT exactly (no charset);
  // resolve on status 200/204, reject otherwise.
```
- Rewrite `uploadMedia(files, kind)`: for each file → `POST .../presign` → `putToR2(...)` with progress → `POST .../confirm` → update URL state from the confirm response. Gallery loops files with `Promise.allSettled` (append-as-you-go; a failed file shows a per-file error, successful files stay saved — no batch rollback).
- **State change:** replace the boolean `coverUploading/galleryUploading/videoUploading` with progress numbers, e.g. `coverProgress/videoProgress` (number, -1 = idle) and `galleryProgress` (`Record<number, number>` keyed by file index). Render a thin progress bar when 0 ≤ pct < 100; keep the existing `*Error` states.
- Update the video `<label>` text: `"Upload video (MP4/WebM, up to 50 MB)"` and remove the "Hobby tier" wording.

### 7. Tests
- NEW `tests/r2/presign.test.ts` — `vi.mock("@aws-sdk/s3-request-presigner", () => ({ getSignedUrl: vi.fn().mockResolvedValue("https://signed.example/...") }))`. Assert `presignPutUrl` calls `getSignedUrl` with a `PutObjectCommand` carrying the right `Bucket`/`Key`/`ContentType`, returns the URL, honours `expiresIn`, and throws when R2 env is unset.
- Add `buildR2Key` + `buildPublicUrl` cases (key-shape regex; publicBase set/unset/trailing-slash) — mirror the existing assertions to prove the refactor preserved format.
- Existing 8 tests in `tests/r2/upload.test.ts` must still pass untouched.

## R2 CORS — exact step-by-step (JA action, ~5 min, REQUIRED before uploads work end-to-end)

Direct browser→R2 PUTs are blocked until the bucket allows them. Do this once in the Cloudflare dashboard:

1. Go to **dash.cloudflare.com** → log in.
2. Left sidebar → **R2** (under "R2 Object Storage").
3. Click the bucket **`gto-listings`**.
4. Open the **Settings** tab.
5. Scroll to **CORS Policy** → click **Add CORS policy** (or **Edit** if one exists).
6. Paste this JSON exactly, then **Save**:

```json
[
  {
    "AllowedOrigins": [
      "https://gatewaytooman.com",
      "https://www.gatewaytooman.com",
      "http://localhost:3000"
    ],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

- `http://localhost:3000` lets you test from `npm run dev` (which uses the real R2). Remove it later to lock down if desired.
- **For Vercel preview testing:** preview URLs are random `*.vercel.app` subdomains. Either (a) test on **localhost** (simplest — the dev server hits real R2 + real CORS), (b) temporarily add the exact preview URL to `AllowedOrigins`, or (c) test on production after promoting. R2 wildcard origins (`https://*.vercel.app`) are inconsistent — prefer localhost for pre-prod testing.
- After saving, CORS takes effect within a few seconds.

## Security note (supersedes audit finding A08-2)

With direct-to-R2, file bytes never reach our server, so server-side magic-byte sniffing (A08-2) is **not possible** under this architecture. Compensating controls, all retained: (a) Content-Type allowlist enforced at presign — only `image/jpeg|png|webp` and `video/mp4|webm` ever get a signed URL; (b) extension derived from contentType, not the user filename (no `.php.mp4` tricks); (c) R2 is served from a **separate origin** (`media.gatewaytooman.com` / `pub-*.r2.dev`), so any HTML smuggled into a file is sandboxed cross-origin and can't touch app cookies/DOM; (d) media rendered only via `<Image>`/`<img>`/`<video>`, never as a document; (e) the site CSP (Batch 17). Because this endpoint is **admin-only (trusted users)**, not public UGC, the residual risk is acceptable. Update HANDOVER §Security state to mark A08-2 as N/A-under-presigned with these compensating controls.

## Verification (preview-first per the dev workflow)

1. `npm test -- --run` → existing 177 + new presign tests pass; `npx tsc --noEmit` clean (modulo the 2 known test-file errors).
2. **Local end-to-end** (after R2 CORS is saved): `npm run dev` → `/admin` → edit a listing → upload a **video > 10 MB** → watch the progress bar fill → confirm it saves and the `<video>` preview plays. Repeat for a cover image and a 2-3 file gallery.
3. In browser devtools Network tab, confirm: the `presign` + `confirm` calls are tiny JSON, and the big `PUT` goes to the R2 host (not `/api/...`) and returns 200/204.
4. Content-Type gotcha: the PUT request's `Content-Type` header must exactly equal what was signed (no `; charset=...`). A 403 SignatureDoesNotMatch means a mismatch.
5. Deploy to **Vercel preview** (`vercel deploy`) → if testing uploads there, ensure the preview origin is in R2 CORS (or test on localhost). Verify a >4.5 MB video uploads — proving the function body cap is bypassed.
6. After sign-off → `vercel deploy --prod`.

## Out of scope / future
- Multipart upload (for files > ~5 GB) — not needed at a 50 MB cap.
- Orphan-cleanup cron for R2 objects whose `confirm` never fired (browser closed mid-upload) — cheap to leave; revisit if it accumulates.
- Migrating `R2_PUBLIC_BASE_URL` to a custom `media.gatewaytooman.com` domain — separate deferred task.

## Critical files
- `lib/r2.ts` (refactor + add presigner)
- `app/api/admin/listings/[id]/media/route.ts` (remove POST, keep DELETE)
- NEW `app/api/admin/listings/[id]/media/presign/route.ts`
- NEW `app/api/admin/listings/[id]/media/confirm/route.ts`
- `app/admin/listings/page.tsx` (`ListingFormModal` client rewrite)
- NEW `tests/r2/presign.test.ts`
- `lib/businesses/queries.ts` (`rowToListing` — read-only; confirms no change needed, format byte-identical)
