import { LegalLayout } from "@/components/legal/LegalLayout";
import { COMPANY } from "@/components/legal/CompanyFacts";

export const metadata = { title: "Privacy Policy — Gateway to Oman" };

export default function PrivacyPolicyPage() {
  return (
    <LegalLayout title="Privacy Policy">
      <section>
        <p>
          This Privacy Policy explains how {COMPANY.tradingName} (&ldquo;Gateway to Oman&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) &mdash; operated
          by {COMPANY.legalEntity} (CR {COMPANY.crNumber}), {COMPANY.address} &mdash; collects, uses, shares, and
          protects personal information when you use our website (<code>gatewaytooman.com</code> and{" "}
          <code>gateway-to-oman.vercel.app</code>), the businesses-for-sale marketplace, our AI assistant, and related
          services (together, the &ldquo;Service&rdquo;).
        </p>
        <p>
          We are the <strong>data controller</strong> of the personal information we collect about you.
        </p>
      </section>

      <section>
        <h2>1. Information we collect</h2>
        <p>When you use the Service, we collect:</p>
        <ul>
          <li>
            <strong>Information you provide directly:</strong> your name, email address, phone number, country, and any
            messages, enquiries, or preferences you share through forms, the AI chatbot, sign-up, account profile, or
            contact requests.
          </li>
          <li>
            <strong>Account information (marketplace):</strong> if you create a marketplace account, your email, hashed
            password, full name, phone, country code, and whether your email is verified and access is activated.
          </li>
          <li>
            <strong>Lead and qualification data:</strong> information you share during qualification (intent, timeline,
            budget bracket, business goals), the segment and tier we assign you, and any internal notes admins make
            about your enquiry.
          </li>
          <li>
            <strong>Chat transcripts:</strong> messages exchanged with our AI assistant (&ldquo;Omar&rdquo;) and any
            signals derived from them (e.g. interest area).
          </li>
          <li>
            <strong>Marketplace enquiry data:</strong> enquiries you submit on individual listings (message, contact
            details).
          </li>
          <li>
            <strong>Technical information:</strong> IP address, browser type, device type, referring page, and
            timestamps, collected automatically when you interact with the Service.
          </li>
          <li>
            <strong>Sign-in identifiers:</strong> if you sign in with Google, basic profile information Google shares
            with us (your Google account ID, email, and name).
          </li>
        </ul>
        <p>
          We do <strong>not</strong> collect special-category data (such as health, religious, or biometric data)
          intentionally; please do not include this in messages or forms.
        </p>
      </section>

      <section>
        <h2>2. How we use your information</h2>
        <p>We use your information to:</p>
        <ul>
          <li>respond to your enquiries and provide consultancy or marketplace services;</li>
          <li>operate, secure, and improve the Service, including the AI assistant;</li>
          <li>qualify leads and route them to the right team member;</li>
          <li>authenticate marketplace accounts and grant/revoke marketplace access;</li>
          <li>
            send transactional communications (e.g. sign-in codes, booking confirmations, access updates);
          </li>
          <li>comply with legal obligations and enforce our Terms.</li>
        </ul>
      </section>

      <section>
        <h2>3. Legal bases (GDPR)</h2>
        <p>
          Where GDPR applies, we rely on: your <strong>consent</strong> (for marketing communications and the
          marketplace sign-up consent checkbox); <strong>contract</strong> (to deliver services you have requested,
          including marketplace access); <strong>legitimate interests</strong> (to operate, secure, and improve the
          Service, qualify leads, and prevent abuse); and <strong>legal obligation</strong> (where required by law).
        </p>
      </section>

      <section>
        <h2>4. Who we share your information with — sub-processors and recipients</h2>
        <p>
          We use the following service providers to operate the Service. They process personal information on our
          behalf under appropriate contractual safeguards:
        </p>
        <table>
          <thead>
            <tr>
              <th>Provider</th>
              <th>Purpose</th>
              <th>Location of processing</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Vercel, Inc.</strong></td>
              <td>Website hosting and content delivery</td>
              <td>Global edge network</td>
            </tr>
            <tr>
              <td><strong>Turso</strong> (ChiselStrike Inc.)</td>
              <td>
                Hosted SQLite database &mdash; stores your account, lead, enquiry, and conversation data
              </td>
              <td>AWS Tokyo (AP Northeast 1)</td>
            </tr>
            <tr>
              <td><strong>Groq, Inc.</strong></td>
              <td>
                AI inference &mdash; receives the contents of your chat messages and conversation history to
                generate the AI assistant&apos;s replies
              </td>
              <td>United States</td>
            </tr>
            <tr>
              <td><strong>Google LLC</strong></td>
              <td>Sign-in with Google (if you choose to use it) &mdash; receives the OAuth sign-in flow</td>
              <td>United States and global</td>
            </tr>
            <tr>
              <td>
                <strong>Resend / SendGrid / SMTP provider</strong> (the configured email provider at the time)
              </td>
              <td>
                Sending verification codes, booking confirmations, and other transactional emails
              </td>
              <td>United States and global</td>
            </tr>
          </tbody>
        </table>
        <p>
          In addition, <strong>our internal team</strong> (admins authorised by Gateway to Oman) can view information
          you submit through the Service in order to respond to you, qualify your enquiry, and operate the marketplace.
          We do <strong>not</strong> sell your personal information, and we do not share it with advertising networks.
        </p>
        <p>
          We may also disclose information when required by law, to protect our rights or the safety of others, or in
          connection with a merger, acquisition, or sale of assets, with notice to you where required.
        </p>
      </section>

      <section>
        <h2>5. International transfers</h2>
        <p>
          Your information is processed outside the Sultanate of Oman (notably Turso in Japan, and Vercel / Groq /
          Google / our email provider in the United States and other regions). Where we transfer personal data
          internationally, we rely on appropriate safeguards required by the{" "}
          <strong>Oman Personal Data Protection Law (Royal Decree 6/2022)</strong> (&ldquo;PDPL&rdquo;) and, where
          applicable, the <strong>EU/UK GDPR</strong> &mdash; including the recipient&apos;s adequacy, contractual
          safeguards, or your explicit consent.
        </p>
      </section>

      <section>
        <h2>6. Retention</h2>
        <p>
          We retain personal information only as long as necessary for the purposes set out in this Policy, or as
          required by law. As a general rule: lead and enquiry data is retained for as long as it is useful to follow
          up on your request and for a reasonable period afterwards for legitimate business records; marketplace
          accounts are retained while active and for a reasonable period after closure; chat transcripts are retained
          for service-improvement and quality-assurance purposes. You may request deletion at any time (see
          &ldquo;Your rights&rdquo;).
        </p>
      </section>

      <section>
        <h2>7. Security</h2>
        <p>
          We protect your information with administrative, technical, and physical safeguards, including: HTTPS
          encryption in transit across the Service; <strong>bcrypt password hashing</strong> (cost 12) so we never
          store plaintext passwords; <strong>HttpOnly, time-limited session cookies</strong> for authenticated areas;
          role-restricted admin access; and our database held in our own controlled cloud account. No method of
          transmission or storage is perfectly secure, but we work to apply industry-standard practices.
        </p>
      </section>

      <section>
        <h2>8. Your rights</h2>
        <p>
          Subject to applicable law (including the Oman PDPL and the GDPR where it applies), you have the right to:{" "}
          <strong>access</strong> your personal information, <strong>correct</strong> inaccurate information,{" "}
          <strong>delete</strong> your information (&ldquo;right to erasure&rdquo;),{" "}
          <strong>object to or restrict</strong> certain processing,{" "}
          <strong>withdraw consent</strong> at any time where we rely on consent,{" "}
          <strong>portability</strong> of information you provided to us, and{" "}
          <strong>lodge a complaint</strong> with the relevant supervisory authority (in Oman, the Ministry of
          Transport, Communications and Information Technology / National Centre for Personal Data Protection; in the
          EU/UK, your local data protection authority).
        </p>
        <p>
          To exercise any of these rights, contact us at <code>{COMPANY.privacyContact}</code>. We will respond within
          the timeframe required by applicable law.
        </p>
      </section>

      <section>
        <h2>9. Cookies</h2>
        <p>
          We use only strictly-necessary session cookies (for authentication and sign-in flows). See our{" "}
          <a href="/cookies">Cookie Notice</a> for details.
        </p>
      </section>

      <section>
        <h2>10. Children</h2>
        <p>
          The Service is not directed at individuals under 18, and we do not knowingly collect personal information
          from children. If you believe a child has provided us with personal information, please contact us and we
          will delete it.
        </p>
      </section>

      <section>
        <h2>11. Automated decision-making</h2>
        <p>
          Our AI assistant assigns a qualification &ldquo;tier&rdquo; (hot / warm / cold) and a numeric lead score to
          support our team&apos;s follow-up. This does <strong>not</strong> produce legal or similarly significant
          effects about you on its own, and an authorised admin reviews leads before any meaningful action. You may
          request a human review of any qualification decision by contacting us.
        </p>
      </section>

      <section>
        <h2>12. Changes to this Policy</h2>
        <p>
          We may update this Policy from time to time. The &ldquo;Effective date&rdquo; at the top will reflect the
          latest version. Material changes will be communicated where required by law.
        </p>
      </section>

      <section>
        <h2>13. Contact</h2>
        <p>Questions, requests, or complaints about this Policy or our handling of your personal information:</p>
        <p>
          {COMPANY.legalEntity} &mdash; {COMPANY.tradingName}
          <br />
          {COMPANY.address}
          <br />
          Email: <a href={`mailto:${COMPANY.privacyContact}`}>{COMPANY.privacyContact}</a>
        </p>
      </section>
    </LegalLayout>
  );
}
