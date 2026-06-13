import { notFound } from 'next/navigation';
import { readNativeSiteRegistry } from '@/lib/native-site-registry';

type Props = {
  params: Promise<{ siteId: string }>;
};

export default async function SiteDetailPage({ params }: Props) {
  const { siteId } = await params;
  const registry = await readNativeSiteRegistry();
  const site = registry.sites.find((item) => item.id === siteId);

  if (!site) notFound();

  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">AFT Site Control</p>
        <h1>{site.title}</h1>
        <p className="lead">Site control panel loaded.</p>
      </section>
      <nav className="toolbar">
        <a className="btn" href={site.gatewayPath}>Open Live Site</a>
        <a className="btn secondary" href="/sites">All Sites</a>
      </nav>
    </main>
  );
}
