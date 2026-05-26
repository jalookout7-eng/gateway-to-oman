import { LegalLayout } from "@/components/legal/LegalLayout";
import { COMPANY } from "@/components/legal/CompanyFacts";

export const metadata = { title: "Cookie Notice — Gateway to Oman" };

export default function CookieNoticePage() {
  return (
    <LegalLayout title="Cookie Notice">
      <section>
        <h2>What this notice covers</h2>
        <p>
          This Notice explains how {COMPANY.tradingName} uses cookies and similar storage on your device when you
          visit our website and use our services. It supplements our Privacy Policy.
        </p>
      </section>

      <section>
        <h2>Why we don&apos;t show a consent banner today</h2>
        <p>
          Today we use <strong>only strictly-necessary cookies</strong> &mdash; small pieces of data that are
          essential for the Service to function (for example, to keep you signed in). Under the{" "}
          <strong>Oman PDPL</strong> and the <strong>EU/UK GDPR</strong>, strictly-necessary cookies do not require
          prior consent. If we introduce analytics, marketing, or other non-essential cookies in the future, we will
          add a clear consent banner allowing you to accept or reject them before they are set.
        </p>
      </section>

      <section>
        <h2>The cookies and storage we currently use</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Purpose</th>
              <th>Type</th>
              <th>Lifetime</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>gto_marketplace_session</code></td>
              <td>Authenticates marketplace users after sign-in</td>
              <td>Strictly necessary</td>
              <td>7 days</td>
            </tr>
            <tr>
              <td>Sign-in OAuth state cookie (set briefly during a Google sign-in flow)</td>
              <td>Protects against cross-site request forgery during sign-in</td>
              <td>Strictly necessary</td>
              <td>Minutes &mdash; cleared after sign-in completes</td>
            </tr>
          </tbody>
        </table>
        <p>
          We do <strong>not</strong> use cookies for advertising, third-party tracking, profiling, or cross-site
          analytics.
        </p>
      </section>

      <section>
        <h2>How to control cookies</h2>
        <p>
          You can clear or block cookies through your browser settings. Please note that blocking session cookies will
          prevent you from signing in to admin or marketplace areas of the Service; the rest of the public site will
          still work.
        </p>
      </section>

      <section>
        <h2>Third-party services</h2>
        <p>
          Some of our service providers may set their own cookies in limited circumstances (for example, Google during
          a sign-in flow you initiate). These are covered by their own policies. See the &ldquo;sub-processors&rdquo;
          table in our <a href="/privacy">Privacy Policy</a> for who they are and what they do.
        </p>
      </section>

      <section>
        <h2>Changes to this Notice</h2>
        <p>
          We may update this Notice when our use of cookies changes. The &ldquo;Effective date&rdquo; reflects the
          latest version.
        </p>
      </section>

      <section>
        <h2>Questions?</h2>
        <p>
          Contact us at{" "}
          <a href={`mailto:${COMPANY.privacyContact}`}>{COMPANY.privacyContact}</a>.
        </p>
      </section>
    </LegalLayout>
  );
}
