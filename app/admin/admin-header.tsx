'use client';

import Link from 'next/link';
import { UserRound } from 'lucide-react';

export default function AdminHeader({ name, email }: { name: string; email: string }) {
  return (
    <header className="admin-header">
      <Link className="admin-store-link" href="/">Xem cửa hàng</Link>
      <div className="admin-identity">
        <span className="admin-identity-icon"><UserRound size={17} /></span>
        <span><strong>{name}</strong><small>{email}</small></span>
      </div>
    </header>
  );
}