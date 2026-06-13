export default function ProviderSecretsPage() {
  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="eyebrow">Provider Console</p>
        <h1>Tenant Secrets</h1>
        <p>
          Bootstrap runtime secrets for the first tenant without storing secret values in GitHub.
        </p>
      </section>

      <section className="grid two">
        <div className="panel-card">
          <h2>Tenant One</h2>
          <p className="muted">AI Freedom Trust</p>
          <p>
            The runtime bootstrap endpoint creates a tenant secret record on the VPS and returns only a safe summary.
          </p>
        </div>

        <div className="panel-card">
          <h2>Endpoint</h2>
          <pre>{`POST /api/tenant-secrets/bootstrap
Authorization: Bearer <dashboard token>

{
  "tenant_name": "AI Freedom Trust"
}`}</pre>
        </div>
      </section>

      <section className="panel-card">
        <h2>Generated Secret Names</h2>
        <div className="stack-list">
          {[
            'tenant_api_token',
            'dashboard_session_secret',
            'node_registration_token',
            'webhook_signing_secret',
            'registry_encryption_key',
            'deploy_action_token',
          ].map((name) => (
            <div className="row-card" key={name}>
              <strong>{name}</strong>
              <span>Stored on the VPS only</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
