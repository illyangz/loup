import { LegalPage, LegalSection } from "@/components/legal-shell";

export default function Privacy() {
  return (
    <LegalPage title="Privacy Policy" updated="August 2026" current="/privacy">
      <p className="text-muted-foreground">
        This policy describes how Loup collects, uses, and protects information across the employee, institution, provider, and operations
        experiences. Loup is currently in pilot with partner institutions in the UAE; this policy will be reviewed and updated as the platform
        moves from pilot to general availability.
      </p>

      <LegalSection heading="What we collect">
        <p>Depending on your role, Loup processes:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li><strong className="text-foreground">Employees &amp; household members:</strong> name, work email, household composition, service bookings, and benefit redemption history.</li>
          <li><strong className="text-foreground">Institutions:</strong> roster data (name, department, campus, benefit tier, eligibility status) supplied by the institution's HR system.</li>
          <li><strong className="text-foreground">Providers:</strong> business details, service capacity, job history, and performance ratings.</li>
          <li><strong className="text-foreground">Everyone:</strong> basic usage data (pages visited, actions taken) used to keep the platform reliable and secure.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="Household privacy">
        <p>
          A core design principle of Loup: an institution's HR administrators see roster-level and aggregate data (activation rates, category
          spend, satisfaction) — never the private details of what a household books or how a family spends its allowance. That boundary is
          enforced at the data layer, not just in the interface, and is described in more technical detail in our{" "}
          <a href="/api-docs" className="text-primary hover:opacity-70 transition-opacity">API documentation</a>.
        </p>
      </LegalSection>

      <LegalSection heading="How we use it">
        <ul className="list-disc space-y-2 pl-5">
          <li>Operating the service — matching bookings to providers, tracking allowance balances, processing settlements.</li>
          <li>Institution-level reporting — utilization and adoption metrics, never individual booking detail.</li>
          <li>Platform reliability and fraud prevention.</li>
          <li>Legally required record-keeping (billing, dispute resolution).</li>
        </ul>
      </LegalSection>

      <LegalSection heading="Data sharing">
        <p>
          We share the minimum data necessary for a booking to happen: a provider sees what they need to fulfill a service (member name,
          address, service details) and nothing about the household's broader benefit usage or financial account. We do not sell personal
          data to third parties.
        </p>
      </LegalSection>

      <LegalSection heading="Your rights">
        <p>
          You can request a copy of your data, ask us to correct inaccurate data, or request deletion, subject to what we're legally
          required to retain (e.g. completed billing records). See our{" "}
          <a href="/pdpl" className="text-primary hover:opacity-70 transition-opacity">PDPL compliance</a> page for the formal process.
        </p>
      </LegalSection>

      <LegalSection heading="Contact">
        <p>
          Questions about this policy can be sent through our{" "}
          <a href="/support" className="text-primary hover:opacity-70 transition-opacity">support page</a>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
