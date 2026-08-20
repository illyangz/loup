import { LegalPage, LegalSection } from "@/components/legal-shell";

export default function Pdpl() {
  return (
    <LegalPage title="PDPL Compliance" updated="August 2026" current="/pdpl">
      <p className="text-muted-foreground">
        Loup operates in the UAE and processes personal data in line with Federal Decree-Law No. 45 of 2021 on the Protection of Personal
        Data (PDPL). This page explains, in plain language, how that shows up in the product — the technical detail behind it is the same
        tenant-isolation and data-boundary design described in our{" "}
        <a href="/api-docs" className="text-primary hover:opacity-70 transition-opacity">API documentation</a>.
      </p>

      <LegalSection heading="Lawful basis for processing">
        <p>
          Institutions enroll employees under a benefits program they administer; processing household and booking data is necessary to
          deliver that benefit. Providers' data is processed under the service agreement that makes them available on the platform.
        </p>
      </LegalSection>

      <LegalSection heading="Data minimization by design">
        <p>
          Each role sees only the data its function requires — an institution's HR admin sees roster and aggregate utilization, never
          individual booking or household detail; a provider sees only what's needed to fulfill an assigned job. This isn't just a policy
          statement — it's enforced at the query layer for every request.
        </p>
      </LegalSection>

      <LegalSection heading="Data subject rights">
        <p>Under PDPL, individuals can request:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li><strong className="text-foreground">Access</strong> — a copy of the personal data we hold about you.</li>
          <li><strong className="text-foreground">Correction</strong> — fixing inaccurate or incomplete data.</li>
          <li><strong className="text-foreground">Erasure</strong> — deletion where we're not legally required to retain it (e.g. completed billing records).</li>
          <li><strong className="text-foreground">Portability</strong> — an exportable copy of your data in a structured format.</li>
        </ul>
        <p className="mt-3">
          Institution admins can generate a full PDPL-compliant data export for their organization directly from the Reports tab of the
          institution portal. Individual requests can be made through our{" "}
          <a href="/support" className="text-primary hover:opacity-70 transition-opacity">support page</a>.
        </p>
      </LegalSection>

      <LegalSection heading="Data residency and retention">
        <p>
          Data is retained for as long as your institution's program is active, plus a limited period afterward for legal and billing
          purposes. When an institution's program ends, data is deleted or anonymized on a schedule agreed in that institution's service
          agreement.
        </p>
      </LegalSection>

      <LegalSection heading="Breach notification">
        <p>
          In the event of a data breach affecting personal data, we will notify affected institutions and, where required by law, the UAE
          Data Office, within the timeframe PDPL requires.
        </p>
      </LegalSection>

      <LegalSection heading="Contact">
        <p>
          For PDPL-specific requests or questions, reach us through our{" "}
          <a href="/support" className="text-primary hover:opacity-70 transition-opacity">support page</a>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
