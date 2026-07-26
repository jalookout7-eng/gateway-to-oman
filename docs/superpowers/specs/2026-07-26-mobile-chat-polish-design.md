# Mobile + Chat Polish Batch — Design

**Date:** 2026-07-26 · **Source:** JA preview click-test feedback (screenshots in `~/Downloads`, 2026-07-26)
**Scope:** seven fixes across the Omar widget, Omar's voice, and mobile admin. No new features beyond the header menu and the `connect` tier.

## 1. (removed)

A "welcome the visitor first" item was drafted here and **dropped on JA's instruction 2026-07-26** — the drafted interpretation (seeding a greeting bubble before the visitor's first message) was not what JA meant. Nothing about the idle-panel → conversation transition changes in this batch. Section numbering below is unchanged so the plan's references stay stable.

## 2. No em dashes, ever

**Problem:** `lib/ai/prompts.ts` contains 78 em dashes, so Omar mirrors the style. Visible throughout the screenshots.

**Fix, two layers:**
- **Prompt:** replace every em dash in Omar-facing prompt copy with commas/periods/parentheses, and add an explicit rule: never use em dashes or en dashes; use commas, periods, or parentheses.
- **Defensive strip:** because prompt rules leak, normalise the model's output before display and persistence — replace `—`/`–` with a comma or period per context. Applies to Omar's chat replies. Do NOT strip from visitor input or admin-authored text.

## 3. Markdown renders as text (the "leaking stars")

**Problem:** `ChatMessages.tsx:44` renders `{msg.content}` raw, so Omar's `**bold**` shows literal asterisks. Live since launch, not a regression from the reskin.

**Fix:** render a minimal, safe subset — `**bold**`, `*italic*`, line breaks, and bare URLs as links. **No `dangerouslySetInnerHTML` and no markdown library**: parse to React elements so nothing can inject HTML. Anything unmatched renders as plain text.

## 4. Mobile keyboard shrinks the widget

**Problem:** the panel is `h-[88dvh]`. When the iOS keyboard opens, the visual viewport shrinks but `dvh` does not follow, so the input and latest messages are pushed behind the keyboard (screenshots 2 and 3).

**Fix:** track `window.visualViewport` height/offset and size the open panel to the visible viewport while a keyboard is up, keeping the message list pinned to its previous scroll position (the latest message stays visible). Desktop and non-`visualViewport` browsers keep current behavior.

## 5. Header menu replaces the avatar

**Problem/ask:** the Omar avatar in the open widget's header is decoration. JA wants a menu there instead.

**Fix:** the header's left icon becomes a menu button opening two items:
- **Connect with a representative** — triggers the lead capture form immediately (see §6)
- **Close session** — rendered in red; ends the conversation (clears messages, returns to the idle panel next open). Distinct from the minimize dash, which preserves everything.

Title stays "Ask Omar". Menu closes on outside tap, Escape, and selection.

## 6. `connect` qualification tier

**Problem/ask:** a visitor who asks to be connected before Omar has gathered enough to grade them should not be labelled hot/warm/cold.

**Key finding — no migration needed.** `lead_options` already replaced the hardcoded CHECK constraints on `leads.qualification`, and `scripts/migrate-lead-options.ts` already stripped them in production. `connect` is a new `lead_options` row, the same shape Ahmed can add from Settings.

**Fix:**
- Seed `('qualification', 'connect', 'Connect', 'violet', 5)` in `schema.sql` (sort_order 5 puts it above Hot) so fresh DBs have it; production gets the same INSERT via the existing idempotent migrate path.
- A lead captured through "Connect with a representative" is written with `qualification = 'connect'` and **skips the AI scoring overwrite** — scoring must not relabel it hot/warm/cold afterwards.
- If enough signal exists that scoring would have produced a real grade, `connect` still wins: JA's stated intent is that the label reflects how the lead arrived.
- Admin already renders qualification badges from `lead_options`, so the badge and filter appear automatically.

## 7. Settings rows overflow on mobile

**Problem:** JA screenshot 2026-07-25. Status/Qualification/Segment rows in `/admin/settings` use `flex items-center gap-2` with no wrapping, so the "active" checkbox and "+ Add" button clip off the right edge.

**Fix:** let the row wrap (or stack the colour/order/active controls) below `sm`. Cosmetic only, no behavior change.

## 8. Mobile admin opens zoomed in

**Problem:** JA reports having to pinch-zoom out after logging into `/admin` on iOS.

**Cause (to confirm on device, not assumed):** the viewport meta is correct (`width=device-width, initial-scale=1`), so this is almost certainly iOS auto-zoom on focusing an input with `font-size < 16px` — the admin login fields are `text-sm` (14px). iOS zooms in and does not zoom back out.

**Fix:** ensure inputs that receive focus on mobile render at ≥16px (`text-base` on small screens, `sm:text-sm` to keep the desktop look). Applies to the admin login fields first; sweep other admin inputs in the same pass. Do NOT add `maximum-scale=1` / `user-scalable=no` — that fixes the symptom by breaking pinch-zoom accessibility.

## Testing

Per item, vitest where the logic is testable (greeting seeding, em-dash stripping, markdown parsing, connect-tier write path, menu behavior). Keyboard/viewport and zoom fixes need a real device check on the preview — they cannot be verified in jsdom.

## Out of scope

- Restoring the hook A/B rotation.
- Any change to Omar's qualification logic beyond the `connect` bypass.
- Reworking the idle panel layout.
