/**
 * Intake form option lists (spec 2026-07-26).
 *
 * Field set adapted from the previous developer's standalone CRM
 * (~/Downloads/gateway_to_oman_dashboard). Only the labels and the option
 * sets were reused; none of its Supabase code is.
 *
 * These labels are BOTH the UI text and the stored value, so changing one
 * changes stored data. They are also the server-side allowlist in
 * lib/intake/validate.ts, so nothing outside these lists can ever be
 * written to the database.
 *
 * No em dashes or en dashes: the original timeline list used an en dash
 * between 1 and 3 months, which is why the first entry reads "1 to 3".
 */

export const INVESTMENT_TIMELINES = [
  "Within 1 to 3 months",
  "Within 6 months",
  "1 year or more",
  "Exploring options, no fixed timeline",
] as const;

export const INVESTMENT_PURPOSES = [
  "Business Setup",
  "Exploring Investment Opportunities",
  "Exploring Job opportunities",
  "Real Estate / ITC Property",
  "Residency Through Investment",
  "Retirement Planning in Oman",
] as const;

export const PREFERRED_LOCATIONS = [
  "Muscat (Urban, business-friendly environment)",
  "Salalah (Coastal, peaceful, retirement-friendly)",
  "Sohar (Industrial hub and growing opportunities)",
  "Open / Flexible",
  "Other",
] as const;

export const RESIDENCY_OPTIONS = [
  "No",
  "Yes, for myself only",
  "Yes, including spouse and dependents",
] as const;

export const SERVICES_OPTIONS = [
  "Business Registration and Licensing",
  "Real Estate Property Search",
  "Cultural Orientation and Relocation Assistance",
  "Retirement Planning",
  "Career/Job opportunity",
  "None of the above",
] as const;

/**
 * Maps the visitor's stated purpose onto the existing leads.segment enum
 * (entrepreneur | investor | professional | retiree). This is a real merge,
 * not decoration: it means intake leads show up correctly in the segment
 * filter, the segment donut on the dashboard, and the intelligence queries
 * without any of those needing to know intake exists.
 */
export const PURPOSE_TO_SEGMENT: Record<string, string> = {
  "Business Setup": "entrepreneur",
  "Exploring Investment Opportunities": "investor",
  "Exploring Job opportunities": "professional",
  "Real Estate / ITC Property": "investor",
  "Residency Through Investment": "investor",
  "Retirement Planning in Oman": "retiree",
};
