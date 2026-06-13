import { listDnsRecords, listDomains } from '@/lib/domain-registry';

const plannedRecords = ['A', 'AAAA', 'CNAME', 'TXT', 'MX', 'NS', 'SRV', 'CAA', 'ALIAS', 'AFT-LINK', 'AFT-NODE', 'AFT-MIRROR', 'AFT-CID', 'AFT-APP'];

export default async function DnsPage() {
  const domains = await listDomains();
  const records = await listDnsRecords();
  const aftRecords = records.filter((record) => record.type.startsWith('AFT-'));

  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">AFT DNS</p>
        <h1>DNS and resolver control.</h1>
        <p className="lead">Manage normal DNS-style records and AFT-specific records that connect names to sites, deployments, nodes, mirrors, and decentralized artifacts.</p>
      </section>

      <nav className="toolbar">
        <a className="btn" href="/domains/new">Reserve Domain</a>
        <a className="btn secondary" href="/domains">Domains</a>
        <a className="btn secondary" href="/sites">Sites</a>
      </nav>

      <section className="grid metrics">
        <div className="card metric"><span>Zones</span><strong>{domains.length}</strong></div>
        <div className="card metric"><span>Records</span><strong>{records.length}</strong></div>
        <div className="card metric"><span>AFT Records</span><strong>{aftRecords.length}</strong></div>
        <div className="card metric"><span>Resolver</span><strong>v0.1</strong></div>
      </section>

      <section className="card metric" style={{ marginTop: '1rem' }}>
        <span>Supported record types</span>
        <strong>{plannedRecords.join(', ')}</strong>
        <p className="footer-note">AFT records power the internal resolver first. Standard DNS records remain the compatibility bridge for normal browsers and future .aft delegation.</p>
      </section>

      <section className="app-list" style={{ marginTop: '1rem' }}>
        {records.length ? records.map((record) => (
          <article className="card app-card" key={record.id}>
            <div>
              <span className="status healthy">{record.type}</span>
              <h3>{record.domainName}</h3>
              <div className="meta">
                <span>{record.name}</span>
                <span>{record.value}</span>
                <span>TTL {record.ttl}</span>
              </div>
            </div>
            <div className="actions">
              <a className="btn secondary" href={'/domains/' + record.domainName}>Manage</a>
            </div>
          </article>
        )) : (
          <article className="card metric">
            <span>No DNS records</span>
            <strong>Reserve a domain and add records</strong>
            <p className="footer-note">DNS records are managed from each domain control panel so changes stay attached to ownership and audit history.</p>
          </article>
        )}
      </section>
    </main>
  );
}
