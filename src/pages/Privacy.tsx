import { useEffect } from "react";
import { Link } from "react-router-dom";
import Seo from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const Privacy = () => {
  const url = `${window.location.origin}/privacy`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Privacy Policy - GuestGlow",
    url,
    about: { "@type": "Organization", name: "GuestGlow" },
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("print") === "1") {
      setTimeout(() => window.print(), 0);
    }
  }, []);

  return (
    <>
      <Seo
        title="Privacy Policy | GuestGlow"
        description="Learn how GuestGlow collects, uses, and protects your data. Our privacy policy covers data processing, cookies, and your rights."
        canonicalPath="/privacy"
        jsonLd={jsonLd}
      />
      <main className="container mx-auto px-4 py-10">
        <header className="mb-6">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Privacy Policy</h1>
          <p className="text-muted-foreground mt-2">Last updated: Aug 2025</p>
        </header>

        <div className="flex items-center gap-3 mb-6 print:hidden">
          <Button onClick={() => window.print()} aria-label="Download Privacy Policy as PDF">
            Download PDF
          </Button>
          <Button variant="outline" asChild>
            <Link to="/privacy?print=1">Open print-friendly version</Link>
          </Button>
        </div>

        <Card className="bg-background border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Overview</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-4">
            <p>
              GuestGlow ("we", "our", "us") provides guest feedback and experience management solutions for hospitality
              organizations. This Privacy Policy explains how we collect, use, disclose, and protect personal information
              when you use our website and platform.
            </p>

            <Separator />

            <section>
              <h2 className="text-foreground font-medium mb-2">Information We Collect</h2>
              <ul className="list-disc ml-6 space-y-1">
                <li>Account data such as name, email address, and authentication details.</li>
                <li>Operational data such as guest feedback, survey responses, and communications logs.</li>
                <li>Usage data such as device, browser, IP, pages visited, and interaction events.</li>
                <li>Cookies and similar technologies used for analytics, authentication, and preferences.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-foreground font-medium mb-2">How We Use Information</h2>
              <ul className="list-disc ml-6 space-y-1">
                <li>To provide, maintain, and improve the GuestGlow platform and services.</li>
                <li>To authenticate users and secure the platform.</li>
                <li>To analyze product usage and improve performance and reliability.</li>
                <li>To communicate important updates, security alerts, and support information.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-foreground font-medium mb-2">Legal Bases</h2>
              <p>We process personal data under legitimate interests, consent, and contract performance where applicable.</p>
            </section>

            <section>
              <h2 className="text-foreground font-medium mb-2">Data Sharing</h2>
              <p>
                We do not sell personal information. We may share data with trusted processors (e.g., hosting, analytics) under
                data processing agreements and only as necessary to operate the service.
              </p>
            </section>

            <section>
              <h2 className="text-foreground font-medium mb-2">Data Retention</h2>
              <p>We retain information for as long as needed to provide services and comply with legal obligations.</p>
            </section>

            <section>
              <h2 className="text-foreground font-medium mb-2">International Transfers</h2>
              <p>We may process data in the United States and other jurisdictions with appropriate safeguards in place.</p>
            </section>

            <section>
              <h2 className="text-foreground font-medium mb-2">Your Rights</h2>
              <ul className="list-disc ml-6 space-y-1">
                <li>Access, correction, deletion, and portability of your personal data where applicable.</li>
                <li>Opt-out of certain processing or withdraw consent, subject to legal or contractual restrictions.</li>
                <li>Submit a complaint to your supervisory authority if you believe your rights are infringed.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-foreground font-medium mb-2">Cookies</h2>
              <p>
                We use cookies for core functionality (authentication) and analytics. You can control cookies through your
                browser settings.
              </p>
            </section>

            <section>
              <h2 className="text-foreground font-medium mb-2">Security</h2>
              <p>
                We implement administrative, technical, and physical safeguards to protect information against unauthorized
                access, alteration, disclosure, or destruction.
              </p>
            </section>

            <section>
              <h2 className="text-foreground font-medium mb-2">Contact</h2>
              <p>
                For privacy inquiries, contact: privacy@guestglow.com. Business address available upon request.
              </p>
            </section>
          </CardContent>
        </Card>
      </main>
    </>
  );
};

export default Privacy;
