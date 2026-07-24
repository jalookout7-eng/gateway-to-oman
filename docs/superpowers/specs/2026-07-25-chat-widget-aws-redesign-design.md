# Omar Chat Widget — AWS-Style Redesign — Design

**Date:** 2026-07-25 · **Approved by:** JA (brainstorm session)
**Reference:** AWS "Ask AWS" widget screenshots in
`assets/Screenshot 2026-07-25 at 12.25.09 AM.png` (closed state) and
`assets/Screenshot 2026-07-25 at 12.26.55 AM.png` (open state).
JA directive: stay **very close** to the AWS layout; GTO brand colors
(navy `#1A1A2E` / gold `#C99B3C`) replace AWS purple.

## Preserved invariants (reskin, not a rebuild)

- Full conversation state machine: capture opt-in, keep-chat, HOT-lead CTAs,
  `[LEAD CAPTURED]` behavior — untouched.
- All GA events (`chat_opened`, `chat_message_sent`, `lead_submit`, …).
- Topic-aware opening from opportunity cards (ChatModalContext bridge).
- Surface-awareness (main vs businesses).
- WhatsApp floating button stays, stacked above the chat button (JA decision —
  `whatsapp_click` is a tracked key event and Ahmed's hot-lead channel).

## ⚠️ Measurement consequence (JA decided knowingly)

The teaser gets ONE fixed copy (below), replacing the 5-variant A/B rotation.
The hook experiment is **suspended**: register the new copy as
`hook_variant_id = "aws-teaser-1"` (per surface: `main-aws-1` /
`businesses-aws-1` following the existing `<surface>-<n>` format) so the
conversion query in HANDOVER §Hook A/B keeps working and prior variant data
stays comparable. `pickTeaserVariant` returns the fixed variant; the old
variant definitions remain in `lib/ai/prompts.ts` (commented or unexported)
for possible revival.

## Closed state

- **Chat button:** KEEPS the current design (JA note 2026-07-25) — no AWS
  restyle of the button itself. Only addition: the unread badge below.
- **Unread badge:** red square badge with white "1", overlapping the button's
  top-right corner. Appears when the teaser fires; clears on open or dismiss.
- **Teaser bar:** dark navy rounded bar with soft shadow, anchored above the
  buttons. Left: chat icon with gold accent stroke. Text (fixed copy):
  *"Hi, I can connect you with a GTO representative or answer questions you
  have on your move to Oman or business search in Oman."*
  Right: × dismiss. Trigger unchanged: 30% scroll depth, once per page load;
  dismiss suppresses it for the session.

## Open state — idle (no conversation yet)

(Branding: GTO navy/gold throughout — JA note 2026-07-25, consistent with the
directive above. No AWS purple anywhere.)

- **Header:** navy gradient block (deep navy → slightly lighter navy, gold
  underline accent), rounded top corners. Contents, top to bottom:
  minimize dash (top-right, white) · **"Ask Omar"** + small outlined chip
  badge "AI advisor" · subtitle "Get guidance on investing, relocating, and
  doing business in Oman." · white rounded input "Ask a question" with a
  circular arrow send button inside its right edge. Typing + send here starts
  the conversation.
- **Body (white):** heading "Want help getting started?" + line "Tell us a
  little bit about what you're looking for." followed by three chips —
  rounded-rectangle buttons with subtle gradient borders (gold/navy tints,
  mirroring AWS's pastel gradient chips):
  1. "I want to explore business or investment opportunities"
  2. "I'm considering relocating or working in Oman"
  3. "I'm planning retirement in Oman"
  Clicking a chip sends its text as the visitor's first message (segments map
  to entrepreneur/investor, professional, retiree — first click advances
  qualification). Chips fire `chat_message_sent` exactly like a typed message.
- **Footer:** centered small text "By chatting, you agree to this
  [disclaimer](/terms)." — link to `/terms`.

## Open state — conversation

After the first message (typed in header input OR chip click), the panel
switches to the standard conversation layout: slim navy header (title +
minimize), existing ChatMessages list, existing bottom ChatInput. The
header-embedded input exists only in the idle state.

## Behavior details

- **Minimize** (dash) collapses the panel without ending the conversation;
  reopening restores state (current behavior — conversation persists).
- Mobile: panel is a full-height sheet (existing responsive behavior kept).
- Idle-state greeting from `getContextualGreeting` is NOT rendered as a chat
  bubble anymore — the idle screen replaces it. When opened via an
  opportunity card with topic context, skip idle and go straight to the
  conversation view with the topic greeting (existing flow).

## Testing

- Vitest: teaser fires at scroll threshold with fixed copy + badge appears;
  dismiss clears badge and suppresses teaser; chip click sends its text as
  first message and switches to conversation view; header input send does the
  same; minimize/reopen preserves messages; disclaimer link present; GA events
  carry `hook_variant: "<surface>-aws-1"`; opportunity-card open bypasses idle.
- Visual click-test on preview deploy (mobile + desktop) before prod.

## Out of scope

- Any change to Omar's prompts, qualification logic, or lead scoring.
- WhatsApp button redesign.
- Reviving the hook A/B rotation (separate decision when measurement wants it).
