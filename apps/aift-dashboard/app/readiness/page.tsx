import { listDomains, listDnsRecords } from '@/lib/domain-registry';
import { listNativeSites, readNativeSiteRegistry } from '@/lib/native-site-registry';
import { readNodes } from '@/lib/nodes';

export default async function ReadinessPage() {
  const sites = await listNativeSites();
  const siteRegistry = await readNativeSiteRegistry();
  const domains = await listDomains();
  const dnsRecords = await listDnsRecords();
  const nodes = await readNodes();

  const checks = [
    {
      label: 'Dashboard shell',
      status: 'ready',
      evidence: 'Home, Domains, Sites, DNS, Deployments, Nodes, Registry, and Readiness routes are present.'
    },
    {
      label: 'Native site registry',
      status: 'ready',
      evidence: sites.length + ' site records found.'
    },
    {
      label: 'Site deployments',
      status: siteRegistry.deployments.length ? 'ready' : 'pending',
      evidence: siteRegistry.deployments.length + ' deployment records found.'
    },
    {
      label: 'Domain registry',
      status: 'ready',
      evidence: domains.length + ' internal .aft domains reserved.'
    },
    {
      label: 'DNS records',
      status: dnsRecords.length ? 'ready' : 'pending',
      evidence: dnsRecords.length + ' DNS or AFT resolver records found.'
    },
    {
      label: 'Node registry',
      status: nodes.length ? 'ready' : 'pending',
      evidence: nodes.length + ' nodes registered.'
    },
    {
      label: 'Gateway failover',
      status: 'pending',
      evidence: 'Next layer: route domain.aft to connected site, active deployment, and fallback deployment.'
    }
  ];

  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">Readiness</p>
        <h1>Production readiness.</h1>
        <p className="lead">Only real, open-source, non-simulated product paths should move toward launch. This page does not depend on a self-fetching localhost API, so it should not blank-screen when a node port changes.</p>
      </section>

      <nav className="toolbar">
        <a className="btn" href="/sites/new">Create Site</a>
        <a className="btn secondary" href="/domains/new">Reserve Domain</a>
        <a className="btn secondary" href="/domains">Domains</a>
        <a className="btn secondary" href="/dns">DNS</a>
      </nav>

      <section className="grid metrics">
        <div className="card metric"><span>Sites</span><strong>{sites.length}</strong></div>
        <div className="card metric"><span>Domains</span><strong>{domains.length}</strong></div>
        <div className="card metric"><span>Records</span><strong>{dnsRecords.length}</strong></div>
        <div className="card metric"><span>Nodes</span><strong>{nodes.length}</strong></div>
      </section>

      <section className="app-list" style={{ marginTop: '1rem' }}>
        {checks.map((check) => (
          <article className="card app-card" key={check.label}>
            <div>
              <span className={'status ' + (check.status === 'ready' ? 'successful' : 'pending')}>{check.status}</span>
              <h3>{check.label}</h3>
              <p className="footer-note">{check.evidence}</p>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
