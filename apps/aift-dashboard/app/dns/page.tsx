const plannedRecords = ['A', 'AAAA', 'CNAME', 'TXT', 'MX', 'NS', 'SRV', 'CAA', 'ALIAS', 'AFT-LINK', 'AFT-NODE', 'AFT-MIRROR', 'AFT-CID', 'AFT-APP'];

export default function DnsPage() {
  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">AFT DNS</p>
        <h1>DNS and resolver control.</h1>
        <p className="lead">Manage normal DNS-style records and AFT-specific records that connect names to sites, deployments, nodes, mirrors, and decentralized artifacts.</p>
      </section>

      <section className="grid metrics">
        <div className="card metric"><span>Zones</span><strong>0</strong></div>
        <div className="card metric"><span>Records</span><strong>0</strong></div>
        <div className="card metric"><span>Resolver</span><strong>v0.1</strong></div>
        <div className="card metric"><span>Status</span><strong>Design</strong></div>
      </section>

      <section className="card metric" style={{ marginTop: '1rem' }}>
        <span>Supported record plan</span>
        <strong>{plannedRecords.join(', ')}</strong>
        <p className="footer-note">AFT records will power the internal resolver first. Standard DNS records remain the compatibility bridge for normal browsers and future .aft delegation.</p>
      </section>
    </main>
  );
}
