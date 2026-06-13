import { AppProfilesClient } from './AppProfilesClient';

export default function AppProfilesPage() {
  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="eyebrow">Foundry</p>
        <h1>App profiles</h1>
        <p>Generate launch-ready profiles from saved GitHub sources, then move them into build and preview workflows.</p>
      </section>

      <AppProfilesClient />
    </main>
  );
}
