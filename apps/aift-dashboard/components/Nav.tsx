const links = [
  ['Dashboard', '/'],
  ['Apps', '/apps'],
  ['New', '/new'],
  ['Templates', '/templates'],
  ['Builds', '/builds'],
  ['Deployments', '/deployments'],
  ['Nodes', '/nodes'],
  ['Settings', '/settings']
];

export function Nav() {
  return (
    <header className="topbar">
      <a className="brand" href="/">AIFT Cloud</a>
      <nav className="nav-scroll" aria-label="Main navigation">
        {links.map(([label, href]) => (
          <a key={href} href={href}>{label}</a>
        ))}
      </nav>
    </header>
  );
}
