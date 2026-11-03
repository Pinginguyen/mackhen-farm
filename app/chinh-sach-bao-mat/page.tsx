import type { Metadata } from 'next';
import PrivacyPolicyContent from './privacy-policy-content';

export const metadata: Metadata = {
  title: 'Personal Data Protection & Information Security | Chính sách bảo vệ dữ liệu cá nhân | Mắc Khén Farm',
  description: 'Personal data collection, use, security and data subject rights at Mắc Khén Farm. Thông tin về thu thập, sử dụng, bảo vệ dữ liệu cá nhân và quyền của chủ thể dữ liệu.',
};

export default function PrivacyPolicyPage() {
  return (
    <main className="page-shell">
      <article className="page-card privacy-policy-page">
        <PrivacyPolicyContent />
      </article>
    </main>
  );
}