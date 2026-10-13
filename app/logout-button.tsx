'use client';

import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const router = useRouter();

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/dang-nhap');
    router.refresh();
  }

  return <button className="secondary-action" type="button" onClick={logout}>Đăng xuất</button>;
}