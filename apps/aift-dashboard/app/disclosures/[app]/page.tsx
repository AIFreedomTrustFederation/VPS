import { getDisclosure } from '@/lib/disclosures';

export default async function DisclosurePage({ params }: { params: Promise<{ app: string }> }) {
  const { app } = await params;
  const decoded = decodeURIComponent(app);
  const disclosure = await getDisclosure(decoded);

  if (!disclosure) {
    return (
      <main className="page">
        <p className="eyebrow">Deployment Disclosure</p>
        <h1>Not found.</h1>
        <p className="lead">No deployment disclosure record exists for {decoded}.</p>
      </main>
    );
  }

  return (
    <main className="page">
      <p className="eyebrow">Deployment Disclosure</p>
      <h1>{disclosure.app}</h1>
      <p className="lead">{disclosure.statement}</p>

      <section className="grid metrics">
        <div className="card metric"><span>Node</span><strong>{disclosure.node}</strong></div>
        <div className="card metric"><span>Operator Class</span><strong>{disclosure.operator_class}</strong></div>
        <div className="card metric"><span>Trust Level</span><strong>{disclosure.trust_level}</strong></div>
        <div className="card metric"><span>Region</span><strong>{disclosure.region}</strong></div>
      </section>

      <section className="card metric" style={{ marginTop: '1rem' }}>
        <span>Operator</span>
        <strong>{disclosure.operator}</strong>
        <p className="footer-note">Domain: {disclosure.domain || 'not assigned'} | Status: {disclosure.status}</p>
      </section>
    </main>
  );
}
