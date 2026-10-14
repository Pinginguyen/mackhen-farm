'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type Step = 'email' | 'reset' | 'complete';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const otpInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [demoOtp, setDemoOtp] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (step !== 'complete') return;
    const timeout = window.setTimeout(() => router.push('/dang-nhap'), 2000);
    return () => window.clearTimeout(timeout);
  }, [router, step]);

  async function sendOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const result = await response.json() as { sent?: boolean; testMode?: boolean; otp?: string; error?: string };
      if (!response.ok) {
        setError(result.error ?? 'Không thể gửi mã xác nhận.');
        return;
      }
      setDemoOtp(result.testMode ? result.otp ?? '' : '');
      setOtp('');
      setMessage('Mã OTP đã được gửi về email của bạn!');
      setStep('reset');
    } catch {
      setError('Không thể kết nối. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  }

  async function resetPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setMessage('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, otp: form.get('otp'), newPassword: form.get('newPassword') }),
      });
      const result = await response.json() as { message?: string; error?: string };
      if (!response.ok) {
        setError(result.error ?? 'Không thể đổi mật khẩu.');
        return;
      }
      setMessage('Đổi mật khẩu thành công! Đang chuyển hướng về trang đăng nhập...');
      setStep('complete');
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
        <ol className="password-reset-steps" aria-label="Các bước đặt lại mật khẩu">
          <li aria-current={step === 'email' ? 'step' : undefined}>1. Email</li>
          <li aria-current={step === 'reset' ? 'step' : undefined}>2. Mã xác nhận</li>
        </ol>

        {step === 'email' && <form className="form-list" onSubmit={sendOtp}>
          <div className="field"><label htmlFor="reset-email">Email tài khoản</label><input id="reset-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
          <button className="primary-action" type="submit" disabled={submitting}>{submitting ? 'Đang gửi mã...' : 'Gửi mã xác nhận về Gmail'}</button>
        </form>}

        {step === 'reset' && <form className="form-list" onSubmit={resetPassword}>
          <div className="field"><label htmlFor="reset-email-confirm">Email</label><input id="reset-email-confirm" type="email" value={email} readOnly /></div>
          {message && <p role="status">{message}</p>}
          {demoOtp && <aside className="password-reset-demo-code" aria-label="Mã OTP chế độ thử nghiệm"><strong>🔔 [Chế độ thử nghiệm] Mã OTP của bạn là: <span>{demoOtp}</span></strong><button className="secondary-action" type="button" onClick={() => { setOtp(demoOtp); passwordInputRef.current?.focus(); }}>⚡ Bấm để tự động điền mã</button></aside>}
          <div className="field"><label htmlFor="reset-otp">Mã OTP 6 số</label><input ref={otpInputRef} id="reset-otp" name="otp" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} required /></div>
          <div className="field"><label htmlFor="new-password">Mật khẩu mới</label><input ref={passwordInputRef} id="new-password" name="newPassword" type="password" autoComplete="new-password" minLength={10} maxLength={100} required /></div>
          <button className="primary-action" type="submit" disabled={submitting}>{submitting ? 'Đang cập nhật...' : 'Xác nhận đổi mật khẩu'}</button>
        </form>}

        {step === 'complete' && <p role="status">{message}</p>}
        {message && step === 'email' && <p role="status">{message}</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
        {step === 'complete' ? <Link className="primary-action" href="/dang-nhap">Đến trang đăng nhập</Link> : <p><Link href="/dang-nhap">Quay lại đăng nhập</Link></p>}
      </section>
    </main>
  );
}