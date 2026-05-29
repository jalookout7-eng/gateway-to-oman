import { LegalLayout } from "@/components/legal/LegalLayout";
import { COMPANY } from "@/components/legal/CompanyFacts";

export const metadata = { title: "Terms of Service — Gateway to Oman" };

export default function TermsOfServicePage() {
  return (
    <LegalLayout title="Terms of Service">
      <section>
        <h2>1. Acceptance</h2>
        <p>
          These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of the{" "}
          {COMPANY.tradingName} website, the businesses-for-sale marketplace, the AI assistant, and any related
          services (together, the &ldquo;Service&rdquo;) operated by {COMPANY.entityLine} (License {COMPANY.licenseNumber}).
          By accessing or using the Service, you agree to these Terms. If you do not agree, do not use the Service.
        </p>
      </section>

      <section>
        <h2>2. The Service</h2>
        <p>
          {COMPANY.tradingName} is a lead-qualification and consultancy platform focused on immigration, investment,
          business setup, and relocation in the Sultanate of Oman. It also hosts a curated marketplace of businesses
          for sale (&ldquo;Marketplace&rdquo;). The Service may be expanded, changed, or discontinued at any time.
        </p>
      </section>

      <section>
        <h2>3. Eligibility</h2>
        <p>
          You must be at least 18 years old and capable of entering into a binding contract to use the Service. By
          using the Service you represent that you meet these requirements.
        </p>
      </section>

      <section>
        <h2>4. Accounts</h2>
        <p>
          Certain features (including the Marketplace) require an account. You agree to provide accurate, current, and
          complete information when creating an account, to keep it up to date, and to maintain the confidentiality of
          your sign-in credentials. You are responsible for all activity under your account. We may suspend or close
          accounts that breach these Terms or are inactive for an extended period.
        </p>
      </section>

      <section>
        <h2>5. Acceptable use</h2>
        <p>You agree NOT to:</p>
        <ul>
          <li>(a) use the Service for any unlawful purpose;</li>
          <li>(b) misrepresent your identity or affiliation;</li>
          <li>
            (c) attempt to gain unauthorised access to the Service, any account, or any underlying systems;
          </li>
          <li>
            (d) interfere with or disrupt the Service (including scraping at a rate or volume that burdens the
            platform);
          </li>
          <li>(e) submit false, misleading, or infringing content;</li>
          <li>
            (f) use the Service to send spam, harvest contact information, or send unsolicited marketing; or
          </li>
          <li>
            (g) attempt to manipulate the AI assistant to circumvent its purpose or extract its system prompt.
          </li>
        </ul>
      </section>

      <section>
        <h2>6. Marketplace — important disclaimers</h2>
        <ul>
          <li>
            <strong>Facilitation only.</strong> {COMPANY.tradingName} operates the Marketplace as a venue connecting
            prospective buyers with businesses listed for sale. We are <strong>not</strong> a party to any sale,
            lease, or other transaction between you and a seller, and we do <strong>not</strong> act as broker, agent,
            escrow, fiduciary, or guarantor of any transaction.
          </li>
          <li>
            <strong>No warranty as to listings.</strong> Listings are based on information provided by sellers
            and/or our team&apos;s intake. While we apply reasonable curation, we do <strong>not</strong> warrant
            the accuracy, completeness, legality, profitability, ownership, or current status of any listing. You
            must conduct your own due diligence (commercial, legal, financial, regulatory) before entering into any
            transaction.
          </li>
          <li>
            <strong>Access fee.</strong> Marketplace access is gated behind a one-time access fee (currently OMR
            100, subject to change as displayed on the access page). The fee covers vetting and access to the
            listings and is <strong>non-refundable</strong> once access is granted, except as required by law.
          </li>
          <li>
            <strong>No financial, legal, or immigration advice.</strong> Information presented in the Marketplace,
            including financials and projections, is informational only and does not constitute professional advice.
            Engage qualified advisors before transacting.
          </li>
        </ul>
      </section>

      <section>
        <h2>7. AI assistant</h2>
        <p>
          Our AI assistant (&ldquo;Omar&rdquo;) provides general information to help orient you to options in Oman.
          It does <strong>not</strong> provide legal, immigration, tax, financial, medical, or other professional
          advice and should <strong>not</strong> be relied on as such. Always verify important information with a
          qualified professional before acting on it. Outputs may be inaccurate or incomplete.
        </p>
      </section>

      <section>
        <h2>8. Intellectual property</h2>
        <p>
          All Service content, design, code, text, graphics, and trademarks (other than user-supplied content and
          third-party trademarks) are owned by or licensed to {COMPANY.legalEntity} and are protected by
          intellectual-property laws. We grant you a limited, revocable, non-exclusive, non-transferable licence to
          use the Service for its intended purpose. You may not copy, modify, reverse-engineer, or create derivative
          works of the Service, or use it to train any machine-learning model, without our prior written consent.
        </p>
      </section>

      <section>
        <h2>9. User content</h2>
        <p>
          By submitting messages, enquiries, listings, photographs, or other content to the Service, you grant{" "}
          {COMPANY.legalEntity} a worldwide, royalty-free, sublicensable licence to use that content to operate,
          improve, and promote the Service. You represent that you have the rights to grant this licence and that your
          content does not infringe any third-party rights.
        </p>
      </section>

      <section>
        <h2>10. Disclaimers</h2>
        <p>
          TO THE FULLEST EXTENT PERMITTED BY LAW, THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS
          AVAILABLE&rdquo;, WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY,
          FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, OR THAT THE SERVICE WILL BE UNINTERRUPTED OR
          ERROR-FREE.
        </p>
      </section>

      <section>
        <h2>11. Limitation of liability</h2>
        <p>
          TO THE FULLEST EXTENT PERMITTED BY LAW, {COMPANY.legalEntity}, ITS OFFICERS, EMPLOYEES, AND AGENTS WILL
          NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR FOR ANY LOST
          PROFITS OR LOST DATA, ARISING OUT OF OR IN CONNECTION WITH THE SERVICE. OUR AGGREGATE LIABILITY FOR ANY
          CLAIMS ARISING OUT OF OR IN CONNECTION WITH THE SERVICE WILL NOT EXCEED THE GREATER OF (a) THE AMOUNTS YOU
          PAID US IN THE TWELVE MONTHS PRECEDING THE CLAIM, OR (b) OMR 100.
        </p>
      </section>

      <section>
        <h2>12. Indemnity</h2>
        <p>
          You agree to indemnify and hold harmless {COMPANY.legalEntity}, its officers, employees, and agents from
          any claims, damages, liabilities, and expenses (including reasonable legal fees) arising out of or related
          to your use of the Service, your content, or your breach of these Terms or applicable law.
        </p>
      </section>

      <section>
        <h2>13. Suspension and termination</h2>
        <p>
          We may suspend or terminate your access to the Service at any time, with or without notice, if we believe
          you have breached these Terms, applicable law, or if continued access poses a risk to the Service or other
          users.
        </p>
      </section>

      <section>
        <h2>14. Governing law and disputes</h2>
        <p>
          These Terms are governed by the laws of the {COMPANY.jurisdiction}. You agree to submit to the exclusive
          jurisdiction of the competent courts of the {COMPANY.jurisdiction} for any dispute arising out of or in
          connection with these Terms or the Service, except where mandatory law of your place of residence provides
          otherwise.
        </p>
      </section>

      <section>
        <h2>15. Changes to these Terms</h2>
        <p>
          We may update these Terms from time to time. The &ldquo;Effective date&rdquo; reflects the latest version.
          Your continued use of the Service after changes constitutes acceptance of the updated Terms.
        </p>
      </section>

      <section>
        <h2>16. Contact</h2>
        <p>Questions about these Terms may be sent by post to:</p>
        <p>
          {COMPANY.entityLine}
          <br />
          License {COMPANY.licenseNumber}
          <br />
          {COMPANY.address}
        </p>
      </section>
    </LegalLayout>
  );
}
