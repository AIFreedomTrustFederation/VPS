export default function DeployPage() {
  return (
    <main className="page">
      <p className="eyebrow">Launch New App</p>
      <h1>Deploy flow reserved.</h1>
      <p className="lead">
        The first deploy flow will import a GitHub repo, assign a domain, select a builder, and hand the deployment to Coolify or the selected open-source PaaS controller.
      </p>
      <section className="card metric">
        <span>Next implementation</span>
        <strong>Repo URL → App Name → Domain → Deploy</strong>
        <p className="footer-note">This page is intentionally safe until the backend deployment adapter is wired.</p>
      </section>
    </main>
  );
}
