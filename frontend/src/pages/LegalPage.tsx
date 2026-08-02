import { Link } from 'react-router-dom';

const updated = 'August 2, 2026';

function LegalShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground">
      <section className="mx-auto max-w-3xl rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Condominio Los Cedros</p>
            <h1 className="mt-1 text-2xl font-semibold text-foreground">{title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Last updated: {updated}</p>
          </div>
          <Link to="/login" className="text-sm text-primary hover:underline">Portal</Link>
        </div>
        <div className="space-y-5 text-sm leading-6 text-muted-foreground [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_p]:mt-1">
          {children}
        </div>
      </section>
    </main>
  );
}

export function TermsPage() {
  return (
    <LegalShell title="Terms of Use">
      <section>
        <h2>Portal Use</h2>
        <p>This resident portal is provided for Condominio Los Cedros residents and administrators to view community notices, review maintenance fee information, and make authorized payments.</p>
      </section>
      <section>
        <h2>Resident Accounts</h2>
        <p>Residents are responsible for keeping their login credentials private. Payments and account information are tied to the authenticated resident profile in the portal.</p>
      </section>
      <section>
        <h2>Payments</h2>
        <p>Online payments are processed by Stripe. Payment records may be synchronized with QuickBooks for condominium accounting. A payment is not considered complete until the payment processor confirms success.</p>
      </section>
      <section>
        <h2>Accuracy</h2>
        <p>If a resident believes an amount, apartment assignment, payment status, or account detail is incorrect, they should contact the condominium administration before making payment.</p>
      </section>
      <section>
        <h2>Contact</h2>
        <p>Questions about the portal or these terms can be sent to adm.loscedros1687@gmail.com.</p>
      </section>
    </LegalShell>
  );
}

export function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy">
      <section>
        <h2>Information We Collect</h2>
        <p>The portal may store resident name, apartment number, email address, phone number, language preference, invitation status, payment status, and payment history.</p>
      </section>
      <section>
        <h2>How Information Is Used</h2>
        <p>Information is used to operate the resident portal, send notices, manage resident access, process HOA maintenance payments, and maintain accounting records.</p>
      </section>
      <section>
        <h2>Payment Processing</h2>
        <p>Card and bank payment details are handled by Stripe. The portal stores payment references and status information, but it does not store full card or bank account numbers.</p>
      </section>
      <section>
        <h2>Accounting Sync</h2>
        <p>Successful payment records may be sent to QuickBooks and linked to the corresponding QuickBooks customer profile for condominium accounting.</p>
      </section>
      <section>
        <h2>Sharing</h2>
        <p>Resident information is not sold. Information is shared only with service providers needed to operate the portal, process payments, send email, and maintain accounting records.</p>
      </section>
      <section>
        <h2>Contact</h2>
        <p>Privacy questions or account correction requests can be sent to adm.loscedros1687@gmail.com.</p>
      </section>
    </LegalShell>
  );
}


export function QuickBooksDisconnectedPage() {
  return (
    <LegalShell title="QuickBooks Disconnected">
      <section>
        <h2>Accounting Sync</h2>
        <p>The QuickBooks connection for Condominio Los Cedros has been disconnected or needs to be reauthorized.</p>
      </section>
      <section>
        <h2>Reconnect</h2>
        <p>An authorized condominium administrator can sign in to the portal and reconnect QuickBooks from the accounting sync page.</p>
      </section>
      <section>
        <h2>Resident Payments</h2>
        <p>Residents do not sign in to QuickBooks. Resident payment access remains managed through the Condominio Los Cedros portal.</p>
      </section>
      <section>
        <h2>Contact</h2>
        <p>Questions can be sent to adm.loscedros1687@gmail.com.</p>
      </section>
    </LegalShell>
  );
}
