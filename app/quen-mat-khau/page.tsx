'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function requestReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const result = await response.json() as { message?: string; error?: string };
      if (!response.ok) {
        setError(result.error ?? 'Không thể gửi mã xác nhận.');
        return;
      }
      setSent(true);
    } catch {
      setError('Không thể kết nối. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="page-shell auth-shell">
      <section className="page-card auth-card">
        <Link href="/" className="eyebrow">Mắc Khén Farm</Link>
        <p className="eyebrow">Khôi phục tài khoản</p>
        <h1>Quên mật khẩu</h1>
        {!sent ? <form className="form-list" onSubmit={requestReset}>
          <div className="field"><label htmlFor="reset-email">Email tài khoản</label><input id="reset-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
          <button className="primary-action" type="submit" disabled={submitting}>{submitting ? 'Đang gửi...' : 'Gửi liên kết đặt lại mật khẩu'}</button>
          {error && <p className="form-error" role="alert">{error}</p>}
        </form> : <div className="password-reset-sent" role="status"><h2>Hãy kiểm tra email</h2><p>Nếu email này đã đăng ký, hướng dẫn đặt lại mật khẩu sẽ được gửi trong ít phút. Liên kết có hiệu lực trong 15 phút.</p><p>💡 Mẹo: Nếu không thấy trong Hộp thư đến, bạn vui lòng kiểm tra thêm trong thư mục Thư rác (Spam) hoặc Quảng cáo nhé.</p><button type="button" className="secondary-action" onClick={() => { setSent(false); setError(''); }}>Gửi lại liên kết</button></div>}
        <p><Link href="/dang-nhap">Quay lại đăng nhập</Link></p>
      </section>
    </main>
  );
}