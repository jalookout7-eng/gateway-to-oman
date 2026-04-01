const SEGMENT_PHRASES: Record<string, string> = {
  investor: "investing in Oman",
  entrepreneur: "setting up a business in Oman",
  professional: "building your career in Oman",
  retiree: "relocating to Oman",
};

const INTEREST_PHRASES: Record<string, string> = {
  real_estate: "real estate opportunities",
  franchise: "franchise partnerships",
  visa: "visa and residency pathways",
  business_setup: "business setup and licensing",
  digital_banking: "digital banking and fintech",
  career: "career development",
};

interface WelcomeEmailData {
  name: string;
  segment: string | null;
  interest: string | null;
}

export function renderWelcomeEmail(data: WelcomeEmailData) {
  const firstName = data.name.split(" ")[0];
  const segmentPhrase =
    SEGMENT_PHRASES[data.segment ?? ""] ?? "exploring opportunities in Oman";
  const interestPhrase = data.interest
    ? INTEREST_PHRASES[data.interest] ?? data.interest.replace(/_/g, " ")
    : null;

  const interestLine = interestPhrase
    ? `Based on our conversation, it's clear you have some exciting goals — particularly around ${interestPhrase}.`
    : `Based on our conversation, it's clear you have some exciting goals.`;

  const subject = `Your Oman Journey Starts Here, ${firstName}`;
  const body = `Dear ${firstName},

Thank you for your interest in ${segmentPhrase}.

${interestLine} I'd love to personally walk you through the opportunities and answer your questions in detail.

With over 26 years of experience in Oman's telecom and legal sectors, I can offer you insights that go beyond what's publicly available.

Book a consultation at your convenience: [Meeting Link]

No sales pitch. Just an honest conversation about whether Oman is right for your journey.

Warm regards,
Ahmed Al-Azizi
Founder, Gateway to Oman`;

  return { subject, body };
}
