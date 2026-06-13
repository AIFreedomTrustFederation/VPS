import { redirect } from 'next/navigation';
import { reserveDomain } from '@/lib/domain-registry';
import { listNativeSites } from '@/lib/native-site-registry';

async function reserveDomainAction(formData: FormData) {
  'use server';

  const connectedSiteId = String(formData.get('connectedSiteId') || '');
  const domain = await reserveDomain({
    domainName: String(formData.get('domainName') || ''),
    ownerId: String(formData.get('ownerId') || 'local-owner'),
    connectedSiteId: connectedSiteId || undefined
  });

  redirect('/domains/' + domain.domainName);
}

export default async function NewDomainPage() {
  const sites = await listNativeSites();

  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">AFT Domains</p>
        <h1>Reserve domain.</h1>
        <p className="lead">Reserve an internal .aft name, lock ownership, and optionally connect it to an existing AFT site.</p>
      </section>

      <form action={reserveDomainAction} className="card metric" style={{ display: 'grid', gap: '1rem' }}>
        <label className="grid" style={{ gap: '.35rem' }}>
          <span>Domain name</span>
          <input name="domainName" required minLength={3} placeholder="capitalcity.aft" />
        </label>
        <label className="grid" style={{ gap: '.35rem' }}>
          <span>Owner ID</span>
          <input name="ownerId" defaultValue="local-owner" required />
        </label>
        <label className="grid" style={{ gap: '.35rem' }}>
          <span>Connect site now</span>
          <select name="connectedSiteId" defaultValue="">
            <option value="">Do not connect yet</option>
            {sites.map((site) => <option value={site.id} key={site.id}>{site.title} - {site.slug}</option>)}
          </select>
        </label>
        <button className="btn" type="submit">Reserve Domain</button>
      </form>
    </main>
  );
}
