import Seo from "@/components/Seo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Security = () => {
  const url = `${window.location.origin}/security`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Security | GuestGlow",
    url,
    about: { "@type": "Organization", name: "GuestGlow" },
  };

  return (
    <>
      <Seo
        title="Security | GuestGlow"
        description="Learn how GuestGlow protects your data: encryption, access controls, monitoring, incident response, and compliance."
        canonicalPath="/security"
        jsonLd={jsonLd}
      />
      <main className="container mx-auto px-4 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Security</h1>
          <p className="text-muted-foreground mt-2">Our approach to safeguarding your data</p>
        </header>

        <Card className="bg-background border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Overview</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-5">
            <section>
              <h2 className="text-foreground font-medium mb-2">Encryption</h2>
              <p>All data is encrypted in transit (TLS 1.2+) and at rest. Secrets are stored securely.</p>
            </section>

            <section>
              <h2 className="text-foreground font-medium mb-2">Access Controls</h2>
              <p>Role-based access with least-privilege principles, audit logging, and session controls.</p>
            </section>

            <section>
              <h2 className="text-foreground font-medium mb-2">Monitoring & Logging</h2>
              <p>Continuous monitoring of system health and security events with alerting on anomalies.</p>
            </section>

            <section>
              <h2 className="text-foreground font-medium mb-2">Reliability</h2>
              <p>Backups and disaster recovery procedures are in place for business continuity.</p>
            </section>

            <section>
              <h2 className="text-foreground font-medium mb-2">Incident Response</h2>
              <p>We assess, contain, and notify affected customers in line with legal and contractual obligations.</p>
            </section>

            <section>
              <h2 className="text-foreground font-medium mb-2">Contact</h2>
              <p>Report security issues to: security@guestglow.com</p>
            </section>
          </CardContent>
        </Card>
      </main>
    </>
  );
};

export default Security;
