import { notFound, redirect } from 'next/navigation';
import { browserSafeServiceUrl, getAftService, httpsAftUrl, localAftGatewayUrl } from '@/lib/aft-service-registry';

type Props = {
  params: Promise<{ service: string }>;
};

export default async function AftServicePage({ params }: Props) {
  const { service } = await params;
  const record = getAftService(service);
  if (!record) notFound();

  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">AFT Service URL</p>
        <h1>{record.name}</h1>
        <p className="lead">{record.description}</p>
      </section>

      <section className="grid metrics">
        <div className="card metric"><span>Status</span><strong>{record.status}</strong></div>
        <div className="card metric"><span>Route</span><strong>{record.route}</strong></div>
        <div className="card metric"><span>Port</span><strong>{record.port}</strong></div>
        <div className="card metric"><span>Health</span><strong>{record.healthPath}</strong></div>
      </section>

      <section className="card metric" style={{ marginTop: '1rem' }}>
        <span>HTTPS .aft URL</span>
        <strong>{httpsAftUrl(record)}</strong>
        <p className="footer-note">This is the target internal .aft service name. Browser-safe gateway URL: {localAftGatewayUrl(record)}. Direct local URL: {browserSafeServiceUrl(record)}.</p>
      </section>

      <nav className="toolbar">
        <a className="btn" href={record.route}>Open Service</a>
        <a className="btn secondary" href="/aft">All AFT URLs</a>
      </nav>
    </main>
  );
}

export async function openAftServiceAction(formData: FormData) {
  'use server';
  const service = String(formData.get('service') || 'dashboard');
  const record = getAftService(service);
  if (record) redirect(record.route);
}
