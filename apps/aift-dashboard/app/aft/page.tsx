import { browserSafeServiceUrl, httpsAftUrl, listAftServices, localAftGatewayUrl } from '@/lib/aft-service-registry';

export default function AftServicesPage() {
  const services = listAftServices();

  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">AFT Service URLs</p>
        <h1>Internal .aft gateway.</h1>
        <p className="lead">Every core AFT service gets an internal .aft name, a browser-safe gateway URL, a route, a port, and a health path.</p>
      </section>

      <section className="grid metrics">
        <div className="card metric"><span>Services</span><strong>{services.length}</strong></div>
        <div className="card metric"><span>Port</span><strong>{services[0]?.port || 3000}</strong></div>
        <div className="card metric"><span>Namespace</span><strong>.aft</strong></div>
        <div className="card metric"><span>Mode</span><strong>Internal</strong></div>
      </section>

      <section className="app-list" style={{ marginTop: '1rem' }}>
        {services.map((service) => (
          <article className="card app-card" key={service.id}>
            <div>
              <span className={'status ' + service.status}>{service.status}</span>
              <h3>{service.name}</h3>
              <div className="meta">
                <span>{httpsAftUrl(service)}</span>
                <span>{service.route}</span>
                <span>port {service.port}</span>
              </div>
              <p className="footer-note">{service.description}</p>
              <p className="footer-note">Gateway: {localAftGatewayUrl(service)}</p>
            </div>
            <div className="actions">
              <a className="btn" href={service.route}>Open</a>
              <a className="btn secondary" href={'/aft/' + service.id}>AFT URL</a>
              <a className="btn secondary" href={browserSafeServiceUrl(service)}>Direct</a>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
