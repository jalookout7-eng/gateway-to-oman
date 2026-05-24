import type { Surface } from "./surface";

export interface KbTopic {
  id: string;
  title: string;
  body: string;
  surfaces: Surface[];
  minPhase: 1 | 2 | 3;
}

const BOTH: Surface[] = ["main", "businesses"];

export const KB_TOPICS: KbTopic[] = [
  {
    id: "professional-bio",
    title: "About Gateway to Oman & Azizi Al Azizi",
    surfaces: BOTH,
    minPhase: 1,
    body:
      "Azizi Al Azizi is the founder of Gateway to Oman (GTO) and has 26 years of experience across telecommunications " +
      "and business development. He has founded more than 13 startups and has deep expertise navigating Oman's business, " +
      "investment, and regulatory landscape. " +
      "GTO is a multi-service platform connecting international entrepreneurs, investors, professionals, and families with " +
      "verified opportunities in Oman. Services span investment facilitation, business brokerage, relocation support, real " +
      "estate, Golden Visa assistance, employment matching, and logistics. " +
      "Azizi is based in Muscat, Oman and can be reached at azizi@alazizigroup.com or via WhatsApp at +968 95108257.",
  },
  {
    id: "consultation-pricing",
    title: "Consultation Duration & Pricing",
    surfaces: BOTH,
    minPhase: 1,
    body:
      "GTO offers initial consultations as a first step for any new client relationship — focused, outcome-oriented sessions, " +
      "not sales calls. Standard consultation: 60 minutes, via video call or in-person (Muscat). The session focuses on " +
      "understanding the client's goals, matching them with the right GTO service, and providing an honest assessment of " +
      "opportunities and timelines. Consultation fees vary by service track and are often absorbed into the service fee upon " +
      "engagement. Specific pricing is confirmed during the pre-booking stage.",
  },
  {
    id: "booking-process",
    title: "Consultation Booking Process",
    surfaces: BOTH,
    minPhase: 1,
    body:
      "The booking process is designed to qualify clients before committing time on both sides. Steps: (1) Submit an inquiry " +
      "via the platform or WhatsApp. (2) GTO reviews the inquiry and confirms fit within 24–48 hours. (3) A pre-booking " +
      "deposit may be requested for certain services to confirm seriousness. (4) Session is scheduled via WhatsApp or email " +
      "coordination.",
  },
  {
    id: "documents-required",
    title: "Documents Required from Clients",
    surfaces: BOTH,
    minPhase: 1,
    body:
      "Omar informs visitors about required documents — documents are submitted directly to GTO, not collected by the chatbot. " +
      "For company formation / investor residency: passport copy (PDF), degree certificate, bank statement (last 3 months), " +
      "proposed company name, preferred business activities (up to 10), and registered email address. " +
      "For Golden Visa: passport copy, proof of investment or property ownership in Oman, bank statements demonstrating " +
      "financial capacity, and any existing Oman residency or visa documentation. " +
      "For business purchase (buyer): proof of identity (passport), proof of funds or bank statement, and an overview of " +
      "prior business or management experience if applicable.",
  },
  {
    id: "engagement-timeline",
    title: "Engagement Timeline — Business Sale",
    surfaces: ["businesses"],
    minPhase: 1,
    body:
      "Timelines vary by complexity. General framework for a business acquisition through GTO: " +
      "Weeks 1–2: initial inquiry, qualification, platform access granted, and reservation fee paid to initiate listing access. " +
      "Weeks 2–3: buyer reviews financials, site visit arranged if needed. " +
      "Weeks 3–4: Letter of Intent (LOI) or formal expression of interest submitted. " +
      "Weeks 4–6: due diligence period — documents reviewed, questions answered. " +
      "Weeks 6–8: negotiation, deal structuring, and agreement on terms. " +
      "Weeks 8–12: legal transfer, license transition, residency/visa processing if applicable.",
  },
  {
    id: "investment-advisory",
    title: "Investment Advisory Service",
    surfaces: BOTH,
    minPhase: 1,
    body:
      "GTO provides structured investment advisory for individuals and institutions evaluating opportunities in Oman, covering " +
      "pre-entry strategy, opportunity identification, and deal evaluation. Scope includes: market assessment and opportunity " +
      "mapping specific to the client's sector or budget; evaluation of specific investment targets (businesses, real estate, " +
      "or projects); due diligence support and risk framing; introductions to Oman-based legal, financial, and government " +
      "contacts; and ongoing advisory for multi-step investment journeys. " +
      "Pricing: advisory engagements are scoped individually. Typical engagements begin at OMR 1,500 for a focused due " +
      "diligence project, up to OMR 3,500 for full acquisition support including negotiation and transition planning.",
  },
  {
    id: "business-setup",
    title: "Business Setup Service",
    surfaces: BOTH,
    minPhase: 1,
    body:
      "GTO facilitates company formation in Oman for foreign investors and entrepreneurs — an all-inclusive package with no " +
      "hidden fees. Package includes: business activity selection and trade name reservation; Commercial Registration (CR) and " +
      "legal document preparation; municipality license and Chamber of Commerce registration; VAT and tax registration (if " +
      "applicable); investment license issuance and Ministry of Labor clearance; personal bank account opening assistance; and " +
      "a 2-year Investor Residency Visa including medical test. " +
      "Pricing: OMR 1,500 per person (all-inclusive), split 50% on document submission and 50% on approval prior to visa " +
      "issuance. Family members (spouse, children under 21): OMR 200 per person. Additional partners: OMR 700 per partner " +
      "(up to 5 partners per company). Timeline: approximately 6 weeks from document submission to visa issuance.",
  },
  {
    id: "immigration-relocation",
    title: "Immigration & Relocation Service",
    surfaces: BOTH,
    minPhase: 1,
    body:
      "GTO supports individuals and families planning to relocate to Oman, whether tied to a business acquisition, investment, " +
      "or lifestyle move. Scope: visa pathway assessment (investor, residency, Golden Visa, family); step-by-step documentation " +
      "guidance; housing area recommendations (Muscat and beyond); school options for families; banking setup and account " +
      "opening assistance; cultural orientation and local contacts; and ongoing support for the first 90 days post-arrival. " +
      "Pricing: relocation advisory is typically bundled with business setup or Golden Visa services. Standalone relocation " +
      "consulting starts at OMR 300.",
  },
  {
    id: "ownership-structures",
    title: "Ownership Structures — Foreign Ownership Rules",
    surfaces: BOTH,
    minPhase: 1,
    body:
      "Oman has progressively liberalised foreign ownership under the Foreign Capital Investment Law. " +
      "Foreign investors can own up to 100% of companies in most sectors, effective from 2020 onwards under Royal Decree. " +
      "Some strategic sectors (defense, media, certain utilities) remain restricted or require an Omani partner. " +
      "Companies in Special Economic Zones such as Duqm and Salalah have additional benefits and ownership flexibility. " +
      "The most common structure for foreign investors is the Limited Liability Company (LLC); branch and representative offices are also available. " +
      "For current sector-specific restrictions, the official Invest in Oman portal (investinoman.gov.om) is the reference; GTO can facilitate that introduction.",
  },
  {
    id: "visa-types",
    title: "Visa Types — Investor, Residency & Family",
    surfaces: BOTH,
    minPhase: 1,
    body:
      "Investor Residency Visa: issued to foreign nationals who register a company in Oman; valid for 2 years and renewable; " +
      "requires active commercial registration and meeting minimum capital thresholds. " +
      "Golden Visa (Long-Term Residency): Oman's long-term residency program for investors meeting specific thresholds — " +
      "typically a minimum property or business investment; provides multi-year residency with renewal options; GTO's Golden " +
      "Visa support service (OMR 4,500 total, OMR 200 refundable pre-booking) covers the full application process. " +
      "Family Residency Visa: available for spouse and children (under 21) of an Oman resident; requires income certificate, " +
      "tenancy agreement, and supporting documents; cost through GTO: OMR 100 per family member. " +
      "Employment Visa: for professionals hired by an Oman-registered company, sponsored by the employer; not typically " +
      "relevant for investors or business owners.",
  },
  {
    id: "investment-vehicles",
    title: "Investment Vehicles Available in Oman",
    surfaces: BOTH,
    minPhase: 1,
    body:
      "Direct Business Ownership: purchase or establish a business — the most common route for operator-investors, including " +
      "LLC formation, branch registration, or franchise operations. " +
      "Real Estate Investment: foreign nationals can purchase property in designated Integrated Tourism Complexes (ITCs) and " +
      "approved zones; ITC property investment can also qualify for long-term residency. " +
      "Special Economic Zones (SEZs): zones such as Duqm (SEZAD) and Salalah Free Zone offer tax exemptions, full foreign " +
      "ownership, and duty-free benefits — attractive for manufacturing, logistics, and industrial investment. " +
      "Business Acquisition: purchasing an existing operational business; GTO's marketplace provides access to screened " +
      "listings across sectors; buyers can use the GTO platform (OMR 100 annual access + OMR 50 per inquiry) to initiate " +
      "acquisition discussions. " +
      "Joint Ventures: partnerships with Omani companies, particularly useful in restricted sectors; GTO can facilitate " +
      "introductions to suitable local partners.",
  },
  {
    id: "tax-compliance",
    title: "Tax & Compliance Framework",
    surfaces: BOTH,
    minPhase: 1,
    body:
      "Corporate Income Tax in Oman has three rates: 0% for 100%-Omani-owned companies meeting all qualifying conditions, " +
      "3% for qualifying SMEs, and 15% for all other companies including foreign-owned ones. Foreign investors and joint " +
      "ventures with foreign ownership should expect the standard 15% rate. " +
      "VAT is 5% (introduced April 2021); registration is mandatory above OMR 38,500 in annual taxable supplies. " +
      "Withholding tax applies to certain payments to foreign entities; the rate depends on any Double Taxation Agreement. " +
      "A Personal Income Tax takes effect in 2028 at 5% on individual income above OMR 42,000/year — Oman remains one of the " +
      "lowest personal-tax environments in the GCC even after this. " +
      "Businesses must register with the Tax Authority within 60 days of commencing operations and file annual returns. " +
      "Official source: tms.taxoman.gov.om.",
  },
  {
    id: "long-term-residency",
    title: "Long-Term Residency Planning",
    surfaces: BOTH,
    minPhase: 1,
    body:
      "Oman offers two primary pathways to long-term residency for foreign nationals. " +
      "Route 1 — Business/Investment: register a company and maintain active operations; the Investor Residency Visa (2 years, " +
      "renewable) is the most common starting point; accumulated business track record can support a Golden Visa application. " +
      "Route 2 — Golden Visa (property or capital investment): direct long-term residency through qualifying investment; GTO " +
      "handles this end-to-end for OMR 4,500 (OMR 200 refundable pre-booking deposit); government investment requirements " +
      "are separate and vary by program. " +
      "Planning considerations: residency does not automatically lead to citizenship (Oman's naturalization process is " +
      "discretionary); maintaining a clean compliance record and active business presence strengthens renewal prospects; " +
      "family members can be included under the same residency structure; Oman's stable political environment and quality of " +
      "life make it a strong long-term base in the GCC.",
  },
  {
    id: "oman-comparison",
    title: "Oman vs UAE / Qatar — Honest Comparison",
    surfaces: BOTH,
    minPhase: 1,
    body:
      "GTO uses this framing when advising clients comparing GCC entry points — honest, not promotional. " +
      "Market competition: Oman is low to moderate with significant first-mover advantage available; UAE is very high and " +
      "saturated in most sectors; Qatar is selective with a strong but smaller market. " +
      "Business setup cost: Oman is lower overall (OMR 1,500 all-in for LLC + residency); UAE varies widely and free zones " +
      "add cost; Qatar is moderate to high. " +
      "Lifestyle cost: Oman has a significantly lower cost of living than both UAE (very high, especially housing) and Qatar " +
      "(high). " +
      "Foreign ownership: Oman allows up to 100% in most sectors; UAE allows up to 100% in free zones with onshore varying; " +
      "Qatar allows up to 100% in select areas. " +
      "Tax: Oman is 15% corporate, 5% VAT, no current personal income tax; UAE is 9% corporate (new), 5% VAT, no personal " +
      "income tax; Qatar has no income or corporate tax for most businesses. " +
      "Residency: Oman offers investor visa and Golden Visa; UAE has a competitive Golden Visa program; Qatar ties residence " +
      "to employment or investment.",
  },
  {
    id: "banking",
    title: "Banking for Foreign Investors",
    surfaces: BOTH,
    minPhase: 1,
    body:
      "Opening a bank account in Oman as a foreign investor is straightforward once a valid residency or investment license " +
      "is in place. Personal account requirements: valid Oman residency or investor visa, passport copy, proof of address " +
      "(tenancy agreement or utility bill), and employment or business income documentation. " +
      "Corporate account requirements: Commercial Registration (CR) certificate, Ministry of Commerce approval, company " +
      "articles of association, passport copies of all signatories, and a board resolution authorizing account signatories " +
      "(for multi-partner companies). " +
      "Major banks: Bank Muscat, National Bank of Oman (NBO), Sohar International, HSBC Oman, and Bank Dhofar. Bank Muscat " +
      "and Sohar International tend to be most accessible for new business accounts. " +
      "Timeline: corporate accounts typically take 2–4 weeks from document submission; personal accounts can be opened within " +
      "1–2 weeks. GTO assists with bank introductions and document preparation as part of the business setup service.",
  },
];

export interface BuyerQualification {
  surface: Surface;
  dualIntentFilter: string;
  hotSignals: string[];
  seriousnessTriggers: string[];
  coldSignals: string[];
  keyQuestion: string;
  classification: Record<"HOT" | "WARM" | "COLD" | "JOBS", string>;
}

export const BUYER_QUALIFICATION: BuyerQualification = {
  surface: "businesses",
  dualIntentFilter:
    "A marketplace buyer here is buying a business AND moving to Oman. That dual intent is the key filter.",
  hotSignals: [
    "defined timeline (moving/operating within 6–18 months)",
    "capital available, not just 'exploring financing'",
    "asks about operations, staff, licensing — not just price and returns",
    "has researched Oman or has a prior connection",
    "mentions family or relocation context",
  ],
  seriousnessTriggers: [
    "asks the steps to transfer ownership / get the license in their name",
    "asks about staff retention or management continuity",
    "mentions involving a lawyer, accountant, or advisor",
    "asks for audited financials or proof of revenue",
    "does not make price the first or only topic",
  ],
  coldSignals: [
    "price-first questions",
    "visa-only interest (using the marketplace as a back-door to residency)",
    "no timeline",
    "unrealistic ROI expectations (30–40% annual)",
  ],
  keyQuestion: "Are you looking to operate this business yourself, or are you looking for a passive investment?",
  classification: {
    HOT: "Connect to Ahmed directly (WhatsApp handoff / book within 24–48h). Embed [WHATSAPP_HANDOFF] after capture.",
    WARM: "Nurture with knowledge-base content (residency, visas, ownership, tax, long-term residency). Do not push the inquiry fee yet.",
    COLD: "Point to the relevant knowledge-base topic or the Golden Visa waitlist. Keep it brief.",
    JOBS: "GTO's jobs platform is in development — invite them to submit a CV at the careers link; do not qualify them as a buyer.",
  },
};

export const GTO_REFERENCES = {
  whatsappDisplay: "+968 95108257",
  whatsappE164: "96895108257",
  email: "azizi@alazizigroup.com",
  goldenVisaWaitlist: "https://forms.gle/T9jRY5DSRBtkz4Yv7",
  cvSubmission: "https://advisorex.org/resumes",
} as const;
