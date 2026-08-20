import { LegalPage, LegalSection } from "@/components/legal-shell";

export default function Terms() {
  return (
    <LegalPage title="Terms of Use" updated="August 2026" current="/terms">
      <p className="text-muted-foreground">
        These terms govern access to Loup's employee benefit, institution, provider, and operations workspaces. By using any Loup workspace
        you agree to the terms below. Loup is currently operating as a pilot program with partner institutions; commercial terms are set out
        separately in each institution's service agreement.
      </p>

      <LegalSection heading="Who can use Loup">
        <p>
          Access is granted by an enrolled institution to its eligible employees, or directly to vetted service providers and Loup
          operations staff. You're responsible for keeping your access credentials confidential and for activity under your account.
        </p>
      </LegalSection>

      <LegalSection heading="The benefit allowance">
        <p>
          Each institution sets its own benefit plan — tier, monthly allowance, rollover policy, and eligible categories. Loup shows real-time
          balances (redeemed, reserved, available) but the plan terms themselves are configured and owned by the institution, not Loup.
          Unused allowance handling (expiry vs. rollover) follows the specific plan you're enrolled in.
        </p>
      </LegalSection>

      <LegalSection heading="Bookings and providers">
        <p>
          Loup coordinates bookings between employees and independent service providers. Providers are vetted for quality and reliability,
          but each booking is a service agreement between the household and the provider — Loup facilitates matching, scheduling, and
          settlement, and monitors quality through the ratings and incident process described in our provider standards.
        </p>
      </LegalSection>

      <LegalSection heading="Fees">
        <p>
          Institutions are billed according to their configured fee model (a percentage of redemptions, a flat per-employee fee, or a
          hybrid of both) — shown transparently on the institution portal's overview. Providers are paid out net of the platform fee on the
          settlement schedule shown in their workspace.
        </p>
      </LegalSection>

      <LegalSection heading="Acceptable use">
        <ul className="list-disc space-y-2 pl-5">
          <li>Don't attempt to access data outside your role's scope (e.g. an institution admin viewing individual booking detail).</li>
          <li>Don't use the platform, API, or embeddable widget for anything unlawful or that misrepresents Loup.</li>
          <li>Report suspected security issues to us before disclosing them publicly.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="Changes">
        <p>
          We'll update this page as the platform evolves from pilot to general availability, and will notify enrolled institutions of any
          material change to these terms or to fee structures ahead of time.
        </p>
      </LegalSection>

      <LegalSection heading="Contact">
        <p>
          Questions about these terms can be sent through our{" "}
          <a href="/support" className="text-primary hover:opacity-70 transition-opacity">support page</a>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
