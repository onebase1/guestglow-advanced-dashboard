import Seo from "@/components/Seo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const Terms = () => {
  const url = `${window.location.origin}/terms`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Terms of Service - GuestGlow",
    url,
    about: { "@type": "Organization", name: "GuestGlow" },
  };

  return (
    <>
      <Seo
        title="Terms of Service | GuestGlow"
        description="GuestGlow Terms of Service covering acceptable use, accounts, subscriptions, disclaimers, and limitations of liability."
        canonicalPath="/terms"
        jsonLd={jsonLd}
      />
      <main className="container mx-auto px-4 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Terms of Service</h1>
          <p className="text-muted-foreground mt-2">Effective: Aug 2025</p>
        </header>

        <Card className="bg-background border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Agreement</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-4">
            <p>
              These Terms govern your access to and use of GuestGlow. By using the service, you agree to these Terms.
              If you are using the services on behalf of an organization, you represent that you have authority to bind
              that organization.
            </p>

            <Separator />

            <section>
              <h2 className="text-foreground font-medium mb-2">Accounts</h2>
              <ul className="list-disc ml-6 space-y-1">
                <li>You are responsible for maintaining the confidentiality of your credentials.</li>
                <li>You must provide accurate information and notify us of changes.</li>
                <li>You must comply with applicable laws and these Terms.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-foreground font-medium mb-2">Acceptable Use</h2>
              <ul className="list-disc ml-6 space-y-1">
                <li>No unlawful, harmful, or abusive activity.</li>
                <li>No attempts to disrupt or compromise the service or data of others.</li>
                <li>Respect intellectual property and privacy rights.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-foreground font-medium mb-2">Subscriptions & Payment</h2>
              <p>
                Paid plans, if any, are billed in advance and are non-refundable except as required by law. You may cancel at any time.
              </p>
            </section>

            <section>
              <h2 className="text-foreground font-medium mb-2">Data</h2>
              <p>
                You retain ownership of your data. You grant us a limited license to process it to provide and improve the services. Our
                use of data is governed by our Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-foreground font-medium mb-2">Warranty Disclaimer</h2>
              <p>
                The services are provided "as is" without warranties of any kind, express or implied.
              </p>
            </section>

            <section>
              <h2 className="text-foreground font-medium mb-2">Limitation of Liability</h2>
              <p>
                To the maximum extent permitted by law, GuestGlow will not be liable for any indirect, incidental, special, consequential,
                or exemplary damages.
              </p>
            </section>

            <section>
              <h2 className="text-foreground font-medium mb-2">Termination</h2>
              <p>We may suspend or terminate access for violations of these Terms or for security reasons.</p>
            </section>

            <section>
              <h2 className="text-foreground font-medium mb-2">Changes</h2>
              <p>
                We may update these Terms from time to time. Changes will be posted on this page with an updated effective date.
              </p>
            </section>

            <section>
              <h2 className="text-foreground font-medium mb-2">Contact</h2>
              <p>For questions about these Terms, contact: legal@guestglow.com</p>
            </section>
          </CardContent>
        </Card>
      </main>
    </>
  );
};

export default Terms;
