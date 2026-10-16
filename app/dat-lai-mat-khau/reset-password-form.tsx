'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function ResetPasswordForm({ token }: { token: string }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [complete, setComplete] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (newPassword.length < 10) {
      setError('Mật khẩu cần có ít nhất 10 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận chưa khớp.');
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, newPassword, confirmPassword }),
      });
      const result = await response.json() as { message?: string; error?: string };
      if (!response.ok) {
        setError(result.error ?? 'Không thể đặt lại mật khẩu. Vui lòng yêu cầu liên kết mới.');
        return;
      }
      setComplete(true);
    } catch {
      setError('Không thể kết nối. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  }

  if (complete) return <div className="password-reset-sent" role="status"><h2>Đã cập nhật mật khẩu</h2><p>Bạn có thể đăng nhập bằng mật khẩu mới.</p><Link className="primary-action" href="/dang-nhap">Đến trang đăng nhập</Link></div>;
  if (!token) return <div className="password-reset-sent"><p className="form-error">Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.</p><Link href="/quen-mat-khau">Yêu cầu liên kết mới</Link></div>;

  return <form className="form-list" onSubmit={submit}>
    <p>Liên kết chỉ có hiệu lực trong 15 phút. Mật khẩu cần từ 10 đến 100 ký tự.</p>
    <div className="field"><label htmlFor="reset-new-password">Mật khẩu mới</label><input id="reset-new-password" type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} maxLength={100} required /></div>
    <div className="field"><label htmlFor="reset-confirm-password">Xác nhận mật khẩu mới</label><input id="reset-confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} maxLength={100} required /></div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <button className="primary-action" type="submit" disabled={submitting}>{submitting ? 'Đang cập nhật...' : 'Lưu mật khẩu mới'}</button>
  </form>;
}
