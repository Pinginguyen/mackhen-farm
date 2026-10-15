import Link from 'next/link';

import AuthForm from '../auth-form';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return <main className="page-shell auth-shell"><section className="page-card auth-card"><p className="eyebrow">Mắc Khén Farm</p><h1>Đăng nhập</h1><p>Đăng nhập để xem lịch sử mua hàng của bạn.</p><AuthForm mode="login" /><p><Link href="/quen-mat-khau">Quên mật khẩu?</Link></p><p>Chưa có tài khoản? <Link href="/dang-ky">Đăng ký</Link></p></section></main>;
}