export default async function AppLinkPage({ params }: { params: Promise<{ linkId: string }> }) {
  const { linkId } = await params;

  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="eyebrow">App Link</p>
        <h1>Preview unavailable</h1>
        <p>Link id: {linkId}</p>
      </section>

      <section className="panel-card">
        <h2>Real preview required</h2>
        <p className="muted">AIFT will only expose clickable app URLs after a real workspace, install, build, and local runtime process are completed. This page is intentionally not a simulated launch.</p>
      </section>
    </main>
  );
}
