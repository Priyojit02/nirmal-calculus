import type { Metadata } from 'next';
import Link from 'next/link';
import 'katex/dist/katex.min.css';
import './globals.css';
import { getUser } from '@/lib/auth';
import LogoutButton from '@/components/LogoutButton';
import NavLinks from '@/components/NavLinks';

export const metadata: Metadata = {
  title: 'Nirmal∫ — JEE Advanced & MIT Calculus Studio',
  description:
    'Master Limits, Differential & Integral Calculus, ODEs, Multivariable Calculus, and Infinite Series with AI-generated JEE Advanced and MIT-standard problems.',
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
          <div className="nav-left">
            <Link href="/" className="logo">
              Nirmal<span>∫</span>
            </Link>
            <NavLinks isSuperAdmin={user?.role === 'super_admin'} />
          </div>
          <div className="links">
            {user ? (
              <>
                <span className="mu">
                  {user.name}
                  {user.role === 'super_admin' && (
                    <span className="tag purple" style={{ marginLeft: 8 }}>
                      Super Admin
                    </span>
                  )}
                </span>
                <LogoutButton />
              </>
            ) : (
              <>
                <Link className="btn sm" href="/login?tab=login">
                  Login
                </Link>
                <Link className="btn p sm" href="/login?tab=register">
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
