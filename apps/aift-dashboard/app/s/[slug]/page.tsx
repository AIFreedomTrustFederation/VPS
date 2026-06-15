import { notFound } from 'next/navigation';
import { readDeploymentArtifact, resolveNativeSite } from '@/lib/native-site-registry';

type Props = { params: Promise<{ slug: string }> };

export default async function PublicSitePage({ params }: Props) {
  const { slug } = await params;
  const resolved = await resolveNativeSite(slug);

  if (!resolved?.ready || !resolved.activeDeployment) {
    notFound();
  }

  const html = await readDeploymentArtifact(resolved.activeDeployment);

  if (!html) {
    notFound();
  }

  return (
    <main className="public-site-shell" style={{ minHeight: '100vh' }}>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </main>
  );
}
