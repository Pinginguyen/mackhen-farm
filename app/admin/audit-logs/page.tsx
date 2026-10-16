import { redirect } from 'next/navigation';

export default async function AdminAuditLogsPage() {
  redirect('/admin/settings?tab=audit');
}