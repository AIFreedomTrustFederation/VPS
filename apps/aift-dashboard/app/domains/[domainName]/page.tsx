import { notFound, redirect } from 'next/navigation';
import { addDnsRecord, connectDomainToSite, getDomain } from '@/lib/domain-registry';
import { listNativeSites } from '@/lib/native-site-registry';

async function addRecordAction(formData: FormData) {
  'use server';
  const domainName = String(formData.get('domainName') || '');
  await addDnsRecord({
    domainName,
    type: String(formData.get('type') || 'TXT'),
    name: String(formData.get('name') || '@'),
    value: String(formData.get('value') || ''),
    ttl: formData.get('ttl') || 300,
    priority: formData.get('priority') || undefined
  });
  redirect('/domains/' + domainName);
}

async function connectSiteAction(formData: FormData) {
  'use server';
  const domainName = String(formData.get('domainName') || '');
  await connectDomainToSite(domainName, String(formData.get('siteId') || ''));
  redirect('/domains/' + domainName);
}

export default async function DomainDetailPage({ params }: { params: { domainName: string } }) {
  const data = await getDomain(params.domainName);
  if (!data) notFound();

  const sites = await listNativeSites();
  const connectedSite = sites.find((site) => site.id === data.domain.connectedSiteId) || null;

  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">AFT Domain Control</p>
        <h1>{data.domain.domainName}</h1>
        <p className="lead">Manage ownership, DNS records, site connection, lock status, and audit history for this internal .aft name.</p>
      </section>

      <nav className="toolbar">
        <a className="btn secondary" href="/domains">All Domains</a>
        <a className="btn secondary" href="/dns">DNS</a>
        {connectedSite ? <a className="btn" href={connectedSite.gatewayPath}>Open Connected Site</a> : null}
      </nav>

      <section className="grid metrics">
        <div className="card metric"><span>Status</span><strong>{data.domain.status}</strong></div>
        <div className="card metric"><span>Owner</span><strong>{data.domain.ownerId}</strong></div>
        <div className="card metric"><span>Lock</span><strong>{data.domain.locked ? 'Locked' : 'Unlocked'}</strong></div>
        <div className="card metric"><span>Records</span><strong>{data.records.length}</strong></div>
      </section>

      <section className="card metric" style={{ marginTop: '1rem' }}>
        <span>Website connection</span>
        <strong>{connectedSite ? connectedSite.title : 'No site connected'}</strong>
        <form action={connectSiteAction} className="toolbar" style={{ marginBottom: 0 }}>
          <input type="hidden" name="domainName" value={data.domain.domainName} />
          <select name="siteId" required defaultValue={data.domain.connectedSiteId || ''}>
            <option value="">Choose site</option>
            {sites.map((site) => <option value={site.id} key={site.id}>{site.title} - {site.slug}</option>)}
          </select>
          <button className="btn" type="submit">Connect Site</button>
        </form>
      </section>

      <h2 style={{ marginTop: '1.5rem' }}>DNS records</h2>
      <section className="app-list">
        {data.records.length ? data.records.map((record) => (
          <article className="card app-card" key={record.id}>
            <div>
              <span className="status healthy">{record.type}</span>
              <h3>{record.name}</h3>
              <div className="meta">
                <span>{record.value}</span>
                <span>TTL {record.ttl}</span>
                {record.priority !== undefined ? <span>Priority {record.priority}</span> : null}
              </div>
            </div>
          </article>
        )) : (
          <article className="card metric">
            <span>No records</span>
            <strong>Add the first DNS record</strong>
          </article>
        )}
      </section>

      <section className="card metric" style={{ marginTop: '1rem' }}>
        <span>Add DNS record</span>
        <form action={addRecordAction} className="grid" style={{ gap: '.75rem', marginTop: '.75rem' }}>
          <input type="hidden" name="domainName" value={data.domain.domainName} />
          <select name="type" defaultValue="TXT">
            {['A', 'AAAA', 'CNAME', 'TXT', 'MX', 'NS', 'SRV', 'CAA', 'ALIAS', 'AFT-LINK', 'AFT-NODE', 'AFT-MIRROR', 'AFT-CID', 'AFT-APP'].map((type) => <option value={type} key={type}>{type}</option>)}
          </select>
          <input name="name" defaultValue="@" required />
          <input name="value" placeholder="record value" required />
          <input name="ttl" type="number" min="60" max="86400" defaultValue="300" required />
          <input name="priority" type="number" min="0" max="65535" placeholder="priority optional" />
          <button className="btn" type="submit">Add Record</button>
        </form>
      </section>

      <h2 style={{ marginTop: '1.5rem' }}>Audit trail</h2>
      <section className="app-list">
        {data.audit.map((event) => (
          <article className="card app-card" key={event.id}>
            <div>
              <span className="status pending">{event.action}</span>
              <h3>{event.message}</h3>
              <p className="footer-note">{event.createdAt}</p>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
