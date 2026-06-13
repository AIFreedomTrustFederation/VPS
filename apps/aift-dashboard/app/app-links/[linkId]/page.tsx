export default async function AppLinkPage({ params }: { params: Promise<{ linkId: string }> }) {
  const { linkId } = await params;

  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="eyebrow">App Link</p>
        <h1>AIFT app link</h1>
        <p>System assigned app link: {linkId}</p>
      </section>

      <section className="panel-card">
        <h2>Launch page</h2>
        <p className="muted">This route is reserved for opening a prepared app profile through AIFT Cloud.</p>
      </section>
    </main>
  );
}
