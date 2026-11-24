import { LoginClient } from './LoginClient';

export const metadata = { title: 'Sign in · AIFT Dashboard' };

export default function LoginPage() {
  return (
    <main className="page">
      <h1>Sign in</h1>
      <p>Dashboard actions (rebuilds, saving sources, node actions) need the operator token. Reading pages does not.</p>
      <LoginClient />
    </main>
  );
}
