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
        <h2>Analytics and your choice</h2>
        <p>
          We use <strong>Google Analytics</strong> to understand how visitors use this site (for example, which
          pages are viewed and how the site is navigated), so we can improve it. When you first visit, a banner lets
          you <strong>Accept</strong> or <strong>Decline</strong> analytics. If you Decline, analytics is disabled
          and no analytics cookies are set on your device. Your choice is remembered for <strong>12 months</strong>,
          after which we will ask again. You can change your mind at any time by clearing your browser&apos;s site
          data for this domain, which will bring the banner back on your next visit.
        </p>
        <p>
          Separately from analytics, we use <strong>only strictly-necessary cookies</strong> &mdash; small pieces of
          data that are essential for the Service to function (for example, to keep you signed in). Under the{" "}
          <strong>Oman PDPL</strong> and the <strong>EU/UK GDPR</strong>, strictly-necessary cookies do not require
          prior consent.
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
            <tr>
              <td><code>_ga</code></td>
              <td>Distinguishes unique visitors for Google Analytics</td>
              <td>Analytics</td>
              <td>2 years</td>
            </tr>
            <tr>
              <td><code>_ga_&lt;container-id&gt;</code></td>
              <td>Retains session state for Google Analytics</td>
              <td>Analytics</td>
              <td>2 years</td>
            </tr>
          </tbody>
        </table>
        <p>
          The <code>_ga</code> and <code>_ga_&lt;container-id&gt;</code> cookies are set only if you have not
          declined analytics in the consent banner. If you Decline (or have not yet been asked), they are not set;
          if you later Accept, they are set from that point on. See &ldquo;Analytics and your choice&rdquo; above.
        </p>
        <p>
          We use Google Analytics to understand overall site usage; we do <strong>not</strong> use cookies for
          advertising, third-party tracking, or profiling.
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
          Write to us at our registered address (see the Contact section of the{" "}
          <a href="/privacy">Privacy Policy</a>).
        </p>
      </section>
    </LegalLayout>
  );
}
