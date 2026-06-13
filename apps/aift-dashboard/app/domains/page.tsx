export default function DomainsPage() {
  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">AFT Domains</p>
        <h1>Domain control panel.</h1>
        <p className="lead">Reserve names, connect websites, manage DNS-like records, and prepare the future .aft registry experience.</p>
      </section>

      <section className="grid metrics">
        <div className="card metric"><span>Domains</span><strong>0</strong></div>
        <div className="card metric"><span>Connected Sites</span><strong>0</strong></div>
        <div className="card metric"><span>DNS Health</span><strong>Ready</strong></div>
        <div className="card metric"><span>Registry</span><strong>v0.1</strong></div>
      </section>

      <section className="card metric" style={{ marginTop: '1rem' }}>
        <span>Next step</span>
        <strong>Domain reservation model</strong>
        <p className="footer-note">The next layer will add internal AFT domain reservations, DNS records, domain-to-site linking, ownership controls, and registry governance.</p>
      </section>
    </main>
  );
}
