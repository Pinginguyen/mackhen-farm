import Link from 'next/link';

import ResetPasswordForm from './reset-password-form';

export default function ResetPasswordPage({ searchParams }: { searchParams?: { token?: string } }) {
  return (
    <main className="page-shell auth-shell">
      <section className="page-card auth-card">
        <Link href="/" className="eyebrow">Mắc Khén Farm</Link>
        <p className="eyebrow">Bảo mật tài khoản</p>
        <h1>Đặt lại mật khẩu</h1>
        <ResetPasswordForm token={searchParams?.token ?? ''} />
      </section>
    </main>
  );
}
