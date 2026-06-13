type Props = { params: Promise<{ slug: string }> };

export default async function PublicSitePage({ params }: Props) {
  const { slug } = await params;

  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">AFT Site Gateway</p>
        <h1>{slug}</h1>
        <p className="lead">Public site route is active.</p>
      </section>
    </main>
  );
}
