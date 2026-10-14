import Link from 'next/link';

import AuthForm from '../auth-form';
import Header from '@/components/layout/Header';

export const dynamic = 'force-dynamic';

export default function RegisterPage() {
  return <main className="page-shell auth-shell"><Header /><section className="page-card auth-card"><p className="eyebrow">Mắc Khén Farm</p><h1>Tạo tài khoản</h1><p>Lưu thông tin nhận hàng và theo dõi đơn hàng của bạn.</p><AuthForm mode="register" /><p>Đã có tài khoản? <Link href="/dang-nhap">Đăng nhập</Link></p></section></main>;
}