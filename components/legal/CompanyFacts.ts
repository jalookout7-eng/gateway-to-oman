/**
 * Company-specific facts referenced from the legal pages.
 * Edit this single file when company details change — every legal page
 * picks the new values up automatically.
 *
 * Notes 8 update: Ahmed supplied the registered details. Gateway to Oman
 * is a subsidiary brand of Alazizi Global Projects (AGP); `entityLine`
 * is a pre-composed string the legal pages drop in wherever the full
 * "trading name, subsidiary of parent" identifier is needed. The privacy
 * contact email has been removed from the pages per JA — visitors can
 * reach the team through the contact channels surfaced elsewhere on the
 * site (WhatsApp, Calendly, marketplace access form).
 */
export const COMPANY = {
  tradingName: "Gateway to Oman",
  legalEntity: "Alazizi Global Projects (AGP)",
  /** Pre-composed identifier used in privacy/terms intros + contact blocks. */
  entityLine: "Gateway to Oman, a subsidiary of Alazizi Global Projects (AGP)",
  licenseNumber: "80962",
  address:
    "P.O. Box 1727, Postal Code 132, Way 4756, Building 4477, Al Atta Street, Suite 13, South Mawalih, Al Seeb, Muscat, Sultanate of Oman",
  jurisdiction: "Sultanate of Oman",
} as const;

export const EFFECTIVE_DATE = "26 May 2026";
