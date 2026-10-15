'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import ValidatedPhoneInput from '@/components/ValidatedPhoneInput';

export default function AuthForm({ mode }: { mode: 'register' | 'login' }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(data.entries())),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) {
        setError(result.error ?? 'Không thể xác thực tài khoản.');
        return;
      }
      const next = searchParams.get('callbackUrl') ?? searchParams.get('next');
      router.push(next?.startsWith('/') && !next.startsWith('//') ? next : '/tai-khoan');
      router.refresh();
    } catch {
      setError('Không thể kết nối. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="form-list" onSubmit={submit}>
      {mode === 'register' && <div className="field"><label htmlFor="name">Họ và tên</label><input id="name" name="name" autoComplete="name" required maxLength={100} /></div>}
      <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" required /></div>
      {mode === 'register' && <div className="field"><label htmlFor="phone">Số điện thoại</label><ValidatedPhoneInput id="phone" name="phone" autoComplete="tel" /></div>}
      <div className="field"><label htmlFor="password">Mật khẩu</label><input id="password" name="password" type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} required minLength={mode === 'register' ? 10 : undefined} /></div>
      <button className="primary-action" type="submit" disabled={submitting}>{submitting ? 'Đang xử lý...' : mode === 'register' ? 'Tạo tài khoản' : 'Đăng nhập'}</button>
      {error && <p className="form-error" role="alert">{error}</p>}
    </form>
  );
}