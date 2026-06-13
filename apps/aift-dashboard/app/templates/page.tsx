import { readTemplates } from '@/lib/templates';

export default async function TemplatesPage() {
  const templates = await readTemplates();

  return (
    <main className="page">
      <p className="eyebrow">App Templates</p>
      <h1>Templates.</h1>
      <p className="lead">
        Start apps from approved AIFT templates, then store every generated file in GitHub.
      </p>

      <section className="grid metrics">
        <div className="card metric"><span>Total templates</span><strong>{templates.length}</strong></div>
        <div className="card metric"><span>Source</span><strong>GitHub</strong></div>
        <div className="card metric"><span>Runtime</span><strong>Docker</strong></div>
        <div className="card metric"><span>Mode</span><strong>Mobile</strong></div>
      </section>

      <section className="app-list" style={{ marginTop: '1rem' }}>
        {templates.length ? templates.map((template) => (
          <article className="card app-card" key={template.id}>
            <div>
              <span className="status unknown">{template.framework}</span>
              <h3>{template.name}</h3>
              <div className="meta">
                <span>{template.id}</span>
                <span>{template.path}</span>
              </div>
              <p className="footer-note">{template.description || 'No description yet.'}</p>
            </div>
            <div className="actions">
              <a className="btn" href={`/new?template=${encodeURIComponent(template.id)}`}>Use Template</a>
              <a className="btn secondary" href="/api/templates">API</a>
            </div>
          </article>
        )) : (
          <article className="card metric">
            <span>No templates registered</span>
            <strong>Copy template registry</strong>
            <p className="footer-note">Copy registry-examples/templates.yml to /opt/aift/registry/templates.yml on the first node.</p>
          </article>
        )}
      </section>
    </main>
  );
}
