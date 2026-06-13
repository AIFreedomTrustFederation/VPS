import { redirect } from 'next/navigation';
import { createNativeSite, deployNativeSite } from '@/lib/native-site-registry';

async function createSiteAction(formData: FormData) {
  'use server';

  const site = await createNativeSite({
    slug: String(formData.get('slug') || ''),
    title: String(formData.get('title') || ''),
    description: String(formData.get('description') || '')
  });

  await deployNativeSite(site.id, { sourceType: 'static-template' });
  redirect('/sites');
}

export default function NewSitePage() {
  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">AFT Site Registry</p>
        <h1>Create test site.</h1>
        <p className="lead">This creates a registry record, builds a static artifact, marks it healthy, and publishes it under the browser-safe AFT gateway path.</p>
      </section>

      <form action={createSiteAction} className="card metric" style={{ display: 'grid', gap: '1rem' }}>
        <label className="grid" style={{ gap: '.35rem' }}>
          <span>Site slug</span>
          <input name="slug" required minLength={3} placeholder="capital-city-provisions" />
        </label>
        <label className="grid" style={{ gap: '.35rem' }}>
          <span>Site title</span>
          <input name="title" required placeholder="Capital City Provisions" />
        </label>
        <label className="grid" style={{ gap: '.35rem' }}>
          <span>Description</span>
          <input name="description" placeholder="A starter website hosted through the AFT cloud." />
        </label>
        <button className="btn" type="submit">Create and Deploy</button>
      </form>
    </main>
  );
}
