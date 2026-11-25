import type { Metadata } from 'next';
import Link from 'next/link';
import 'katex/dist/katex.min.css';
import './globals.css';
import { getUser } from '@/lib/auth';
import LogoutButton from '@/components/LogoutButton';

export const metadata: Metadata = {
  title: 'Nirmal Calculus — JEE Advanced & MIT Math Practice Platform',
  description:
    'Master Limits, Differential & Integral Calculus, ODEs, Multivariable Calculus, and Infinite Series with JEE Advanced and MIT-standard problems.',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  return (
    <html lang="en">
      <body>
        <nav>
          <Link href="/" className="logo">
            Nirmal<span>∫</span>
          </Link>
          <div className="links">
            <Link href="/problems">Problem Bank</Link>
            <Link href="/tests">Timed Mocks</Link>
            <Link href="/dashboard">Dashboard</Link>
            {user ? (
              <>
                <span className="mu">Hi, {user.name}</span>
                <LogoutButton />
              </>
            ) : (
              <Link className="btn p sm" href="/login">
                Login
              </Link>
            )}
          </div>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
