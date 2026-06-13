import { SourcePasteClient } from '../app-sources/SourcePasteClient';

export default function Page() {
  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="eyebrow">Links</p>
        <h1>Source links</h1>
        <p>Save a source link for AIFT VPS.</p>
      </section>
      <SourcePasteClient />
    </main>
  );
}
