import { redirect } from 'next/navigation';

export default async function AdminMonitoringPage() {
  redirect('/admin/settings?tab=monitoring');
}