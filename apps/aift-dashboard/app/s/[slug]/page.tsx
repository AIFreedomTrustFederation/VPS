import { notFound } from 'next/navigation';
import { readDeploymentArtifact, resolveNativeSite } from '@/lib/native-site-registry';

export default async function PublicSitePage({ params }: { params: { slug: string } }) {
  const resolved = await resolveNativeSite(params.slug);
  if (!resolved) notFound();

  const html = await readDeploymentArtifact(resolved.activeDeployment) || await readDeploymentArtifact(resolved.fallbackDeployment);
  if (!html) {
    return (
      <main className="page">
        <section className="hero">
          <p className="eyebrow">AFT Site Gateway</p>
          <h1>Site is preparing.</h1>
          <p className="lead">This site exists in the AFT registry, but no healthy deployment artifact is ready yet.</p>
        </section>
      </main>
    );
  }

  return <iframe title={resolved.site.title} srcDoc={html} style={{ width: '100%', minHeight: 'calc(100vh - 74px)', border: 0, display: 'block', background: '#07060a' }} />;
}
