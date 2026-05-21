CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  session_id TEXT NOT NULL,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  ended_at TEXT,
  outcome TEXT NOT NULL DEFAULT 'active' CHECK (outcome IN ('active', 'captured', 'orphan', 'closed')),
  segment TEXT CHECK (segment IN ('entrepreneur', 'investor', 'professional', 'retiree')),
  interests TEXT,
  message_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  conversation_id TEXT NOT NULL REFERENCES conversations(id),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  raw_content TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  conversation_id TEXT REFERENCES conversations(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  country_code TEXT,
  segment TEXT CHECK (segment IN ('entrepreneur', 'investor', 'professional', 'retiree')),
  interests TEXT,
  qualification TEXT NOT NULL DEFAULT 'warm' CHECK (qualification IN ('hot', 'warm', 'cold')),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'in_progress', 'converted', 'closed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS emails (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  lead_id TEXT NOT NULL REFERENCES leads(id),
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'opened', 'clicked')),
  sent_at TEXT,
  opened_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_qualification ON leads(qualification);
CREATE INDEX IF NOT EXISTS idx_leads_segment ON leads(segment);
CREATE INDEX IF NOT EXISTS idx_conversations_outcome ON conversations(outcome);

-- Phase 5 additions

ALTER TABLE leads ADD COLUMN ai_summary TEXT;
ALTER TABLE leads ADD COLUMN booking_id TEXT;

ALTER TABLE emails ADD COLUMN to_address TEXT;
ALTER TABLE emails ADD COLUMN booking_id TEXT;
ALTER TABLE emails ADD COLUMN approved_at TEXT;

CREATE TABLE IF NOT EXISTS blocked_slots (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  date TEXT NOT NULL,
  time_slot TEXT,
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  lead_id TEXT REFERENCES leads(id),
  conversation_id TEXT REFERENCES conversations(id),
  preferred_date TEXT NOT NULL,
  preferred_time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(preferred_date);
CREATE INDEX IF NOT EXISTS idx_blocked_slots_date ON blocked_slots(date);

-- ============================================================================
-- Phase 1 Marketplace + Layer 3 + Admin (Stage 04 Section C)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. `source` column on conversations, leads, bookings
-- Attributes each record to a vertical (main, businesses, future verticals).
-- Default 'main' so existing rows backfill cleanly.
-- ----------------------------------------------------------------------------

ALTER TABLE conversations ADD COLUMN source TEXT NOT NULL DEFAULT 'main';
ALTER TABLE leads ADD COLUMN source TEXT NOT NULL DEFAULT 'main';
ALTER TABLE bookings ADD COLUMN source TEXT NOT NULL DEFAULT 'main';

CREATE INDEX IF NOT EXISTS idx_conversations_source ON conversations(source);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
CREATE INDEX IF NOT EXISTS idx_bookings_source ON bookings(source);

-- ----------------------------------------------------------------------------
-- 2. Layer 3 fields on leads
-- Per meeting notes Layer 3-first directive: every intelligence field present
-- in the lead table from day one. Phase 1 admin surfaces 5 of these. The rest
-- collect silently for intelligence-stage analysis.
-- ----------------------------------------------------------------------------

ALTER TABLE leads ADD COLUMN lead_score INTEGER;
ALTER TABLE leads ADD COLUMN referrer_name TEXT;
ALTER TABLE leads ADD COLUMN referrer_url TEXT;
ALTER TABLE leads ADD COLUMN qualification_path TEXT;
ALTER TABLE leads ADD COLUMN chatbot_responses TEXT;
ALTER TABLE leads ADD COLUMN special_filter_triggered INTEGER NOT NULL DEFAULT 0 CHECK (special_filter_triggered IN (0, 1));
ALTER TABLE leads ADD COLUMN score_breakdown TEXT;
ALTER TABLE leads ADD COLUMN outcome TEXT NOT NULL DEFAULT 'pending' CHECK (outcome IN ('pending', 'contacted', 'converted', 'nurture', 'rejected'));
ALTER TABLE leads ADD COLUMN outcome_updated_at TEXT;
ALTER TABLE leads ADD COLUMN admin_notes TEXT;
ALTER TABLE leads ADD COLUMN session_duration_seconds INTEGER;
ALTER TABLE leads ADD COLUMN device_type TEXT;

CREATE INDEX IF NOT EXISTS idx_leads_outcome ON leads(outcome);
CREATE INDEX IF NOT EXISTS idx_leads_lead_score ON leads(lead_score);

-- ----------------------------------------------------------------------------
-- 3. categories table + seed (8 categories)
-- Admin-editable. Listings reference category by ID. Marketplace filter UI
-- reads from this table.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  icon TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(active);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);

INSERT OR IGNORE INTO categories (slug, name, sort_order) VALUES ('cafe-restaurant', 'Café / Restaurant', 10);
INSERT OR IGNORE INTO categories (slug, name, sort_order) VALUES ('gym', 'Gym', 20);
INSERT OR IGNORE INTO categories (slug, name, sort_order) VALUES ('car-service', 'Car Service', 30);
INSERT OR IGNORE INTO categories (slug, name, sort_order) VALUES ('grocery-store', 'Grocery Store', 40);
INSERT OR IGNORE INTO categories (slug, name, sort_order) VALUES ('car-accessories', 'Car Accessories', 50);
INSERT OR IGNORE INTO categories (slug, name, sort_order) VALUES ('laundry', 'Laundry', 60);
INSERT OR IGNORE INTO categories (slug, name, sort_order) VALUES ('travel-agency', 'Travel Agency', 70);
INSERT OR IGNORE INTO categories (slug, name, sort_order) VALUES ('industrial-commercial', 'Industrial / Commercial', 80);

-- ----------------------------------------------------------------------------
-- 4. sellers table
-- Admin-managed in Phase 1. Optional FK to leads — when a website visitor
-- expresses intent to sell, they are created as a lead first, then linked
-- here when admin promotes them. No auth in Phase 1 (no password_hash).
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sellers (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  lead_id TEXT REFERENCES leads(id),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  country_code TEXT,
  notes TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sellers_lead ON sellers(lead_id);
CREATE INDEX IF NOT EXISTS idx_sellers_active ON sellers(active);

-- ----------------------------------------------------------------------------
-- 5. listings table
-- Plan v3 fields + sample-listing-driven additions (for_rent, processing_fee,
-- commercial_registration_included, stock_value_omr).
-- Status: available / reserved / sold.
-- Pricing: for_sale + for_rent bools — a listing can be either or both
-- (e.g. Project 3 Industrial Factory).
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS listings (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  seller_id TEXT REFERENCES sellers(id),
  category_id TEXT NOT NULL REFERENCES categories(id),

  -- Identity
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,

  -- Location
  area TEXT,
  location_city TEXT,

  -- Pricing
  for_sale INTEGER NOT NULL DEFAULT 1 CHECK (for_sale IN (0, 1)),
  for_rent INTEGER NOT NULL DEFAULT 0 CHECK (for_rent IN (0, 1)),
  selling_price_omr INTEGER,
  rental_price_omr INTEGER,
  processing_fee_omr INTEGER NOT NULL DEFAULT 500,
  stock_value_omr INTEGER,
  commercial_registration_included INTEGER NOT NULL DEFAULT 1 CHECK (commercial_registration_included IN (0, 1)),

  -- Business detail
  age_years REAL,
  employee_count INTEGER,
  financials_text TEXT,
  pros_text TEXT,
  cons_text TEXT,
  full_detail_text TEXT,

  -- Media (Cloudflare URLs)
  cover_image_url TEXT,
  gallery_json TEXT,
  video_url TEXT,

  -- State
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'sold')),
  published INTEGER NOT NULL DEFAULT 1 CHECK (published IN (0, 1)),

  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_listings_category ON listings(category_id);
CREATE INDEX IF NOT EXISTS idx_listings_seller ON listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_published ON listings(published);
CREATE INDEX IF NOT EXISTS idx_listings_for_sale ON listings(for_sale);
CREATE INDEX IF NOT EXISTS idx_listings_for_rent ON listings(for_rent);

-- ----------------------------------------------------------------------------
-- 6. inquiries table
-- Buyer-side inquiry on a listing. Links lead to listing. Carries source
-- (typically 'businesses' but inherited at write time, not enforced).
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS inquiries (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  lead_id TEXT NOT NULL REFERENCES leads(id),
  listing_id TEXT NOT NULL REFERENCES listings(id),
  message TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'closed')),
  source TEXT NOT NULL DEFAULT 'businesses',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_inquiries_lead ON inquiries(lead_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_listing ON inquiries(listing_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status);

-- ----------------------------------------------------------------------------
-- 7. admin_users table
-- Replaces single shared ADMIN_TOKEN auth. Multi-user admin support.
-- bcrypt password hash (computed in app code, not SQL).
-- Roles: 'owner' (Ahmed), 'admin' (delegated staff), 'viewer' (read-only).
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('owner', 'admin', 'viewer')),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  last_login_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_active ON admin_users(active);

-- ----------------------------------------------------------------------------
-- 8. admin_sessions table
-- Opaque-token sessions. App stores session token in HttpOnly cookie.
-- expires_at supports automatic cleanup via cron.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS admin_sessions (
  id TEXT PRIMARY KEY,
  admin_user_id TEXT NOT NULL REFERENCES admin_users(id),
  ip TEXT,
  user_agent TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_user ON admin_sessions(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at);

-- ----------------------------------------------------------------------------
-- 9. activity_log table
-- Append-only audit trail. Tracks bot activities (lead capture, scoring,
-- escalation) and admin actions (login, listing CRUD, status changes).
-- actor_type: 'bot' | 'admin' | 'system'. actor_id: nullable for bot/system.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS activity_log (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  actor_type TEXT NOT NULL CHECK (actor_type IN ('bot', 'admin', 'system', 'visitor')),
  actor_id TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  source TEXT NOT NULL DEFAULT 'main',
  metadata_json TEXT,
  ip TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_activity_log_actor ON activity_log(actor_type, actor_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_target ON activity_log(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_action ON activity_log(action);
CREATE INDEX IF NOT EXISTS idx_activity_log_source ON activity_log(source);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at);

-- ----------------------------------------------------------------------------
-- 10. Featured listings (highly-rated teaser picks)
-- Admin marks up to 5 listings as "featured" with a rank for ordering.
-- Marketplace home shows featured listings first. Falls back to created_at
-- order for non-featured.
-- ----------------------------------------------------------------------------

ALTER TABLE listings ADD COLUMN featured INTEGER NOT NULL DEFAULT 0 CHECK (featured IN (0, 1));
ALTER TABLE listings ADD COLUMN featured_rank INTEGER;

CREATE INDEX IF NOT EXISTS idx_listings_featured ON listings(featured, featured_rank);

-- ----------------------------------------------------------------------------
-- 11. Marketplace end-users (buyers who sign up via /businesses/sign-in)
-- Separate from admin_users — these are the visitors who pay for access.
-- email_verified flips when OTP is confirmed. access_activated flips when an
-- admin approves their request from /admin/inquiries or /admin/users.
-- google_id is for the OAuth flow once Google credentials are provisioned.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS marketplace_users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  full_name TEXT NOT NULL,
  password_hash TEXT,
  phone TEXT,
  country_code TEXT,
  email_verified INTEGER NOT NULL DEFAULT 0 CHECK (email_verified IN (0, 1)),
  access_activated INTEGER NOT NULL DEFAULT 0 CHECK (access_activated IN (0, 1)),
  google_id TEXT,
  lead_id TEXT REFERENCES leads(id),
  last_login_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_marketplace_users_email ON marketplace_users(email);
CREATE INDEX IF NOT EXISTS idx_marketplace_users_lead ON marketplace_users(lead_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_users_activated ON marketplace_users(access_activated);

-- ----------------------------------------------------------------------------
-- 12. Marketplace OTPs (6-digit codes for sign-up / sign-in verification)
-- 10-minute TTL. Single-use (consumed=1 after verify).
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS marketplace_otps (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email TEXT NOT NULL COLLATE NOCASE,
  code TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('signup', 'signin', 'verify')),
  expires_at TEXT NOT NULL,
  consumed INTEGER NOT NULL DEFAULT 0 CHECK (consumed IN (0, 1)),
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_marketplace_otps_email ON marketplace_otps(email, purpose, consumed);
CREATE INDEX IF NOT EXISTS idx_marketplace_otps_expires ON marketplace_otps(expires_at);

-- ----------------------------------------------------------------------------
-- 13. Marketplace sessions (post-OTP, post-password sign-in)
-- HttpOnly cookie holds the session id. 7-day TTL.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS marketplace_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES marketplace_users(id) ON DELETE CASCADE,
  ip TEXT,
  user_agent TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_marketplace_sessions_user ON marketplace_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_sessions_expires ON marketplace_sessions(expires_at);

-- ----------------------------------------------------------------------------
-- 14. Intelligence notes (JA-internal: hypotheses, confirmed learnings,
-- monthly analysis-run log). Powers the /admin/intelligence Group D panel.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS intelligence_notes (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  kind TEXT NOT NULL CHECK (kind IN ('hypothesis', 'learning', 'analysis_run')),
  title TEXT NOT NULL,
  body TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'confirmed', 'archived')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_intel_notes_kind ON intelligence_notes(kind, status);
