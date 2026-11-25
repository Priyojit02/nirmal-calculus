'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavLinksProps {
  isSuperAdmin: boolean;
}

export default function NavLinks({ isSuperAdmin }: NavLinksProps) {
  const pathname = usePathname();

  const items = [
    { href: '/', label: 'Overview', exact: true },
    { href: '/problems', label: 'Practice Bank', exact: false },
    { href: '/tests', label: 'Timed Mocks', exact: false },
    { href: '/dashboard', label: 'Dashboard', exact: false },
  ];

  return (
    <div className="nav-tabs">
      {items.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-tab ${active ? 'active' : ''}`}
          >
            {item.label}
          </Link>
        );
      })}
      {isSuperAdmin && (
        <Link
          href="/admin"
          className={`nav-tab ${pathname.startsWith('/admin') ? 'active' : ''}`}
        >
          Admin
        </Link>
      )}
    </div>
  );
}
