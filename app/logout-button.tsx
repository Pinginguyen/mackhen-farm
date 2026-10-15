'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

export default function LogoutButton() {
  const router = useRouter();

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/dang-nhap');
    router.refresh();
  }

  return <button className="account-dropdown-logout" type="button" onClick={logout}><LogOut size={17} aria-hidden="true" />Đăng xuất</button>;
}