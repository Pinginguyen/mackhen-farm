'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import ValidatedPhoneInput from '@/components/ValidatedPhoneInput';

type PasswordStrength = 'weak' | 'medium' | 'strong';

function getPasswordStrength(password: string): PasswordStrength {
  if (password.length < 8 || !/\p{L}/u.test(password) || !/\d/.test(password)) return 'weak';
  return password.length >= 12 ? 'strong' : 'medium';
}

export default function AuthForm({ mode }: { mode: 'register' | 'login' }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const passwordStrength = getPasswordStrength(password);
  const passwordStrengthLabel = { weak: 'Weak', medium: 'Medium', strong: 'Strong' }[passwordStrength];

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const data = new FormData(event.currentTarget);
    if (String(data.get('password') ?? '').length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự');
      return;
    }
    setSubmitting(true);
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
      <div className="field">
        <label htmlFor="password">Mật khẩu</label>
        <div className="password-input-wrap">
          <input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} aria-invalid={password.length > 0 && password.length < 8} aria-describedby="password-feedback" required maxLength={100} />
          <button className="password-visibility-toggle" type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>
            {showPassword ? <EyeOff size={19} aria-hidden="true" /> : <Eye size={19} aria-hidden="true" />}
          </button>
        </div>
        <div id="password-feedback" className="password-feedback" aria-live="polite">
          {password.length > 0 && password.length < 8
            ? <p className="password-validation-error">Mật khẩu phải có ít nhất 8 ký tự</p>
            : password.length >= 8 && <p className="password-validation-hint">Khuyến khích kết hợp chữ và số để tăng độ an toàn.</p>}
          {password.length > 0 && <div className={`password-strength password-strength-${passwordStrength}`} aria-label={`Độ mạnh mật khẩu: ${passwordStrengthLabel}`}>
            <span /><span /><span />
            <strong>{passwordStrengthLabel}</strong>
          </div>}
        </div>
      </div>
      <button className="primary-action" type="submit" disabled={submitting}>{submitting ? 'Đang xử lý...' : mode === 'register' ? 'Tạo tài khoản' : 'Đăng nhập'}</button>
      {error && <p className="form-error" role="alert">{error}</p>}
    </form>
  );
}