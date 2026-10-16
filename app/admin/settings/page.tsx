import { fetchApiWithFallback } from '@/lib/server-api';
import SettingsTabs, { type AuditEntry, type MonitoringData } from './settings-tabs';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage({ searchParams }: { searchParams?: { tab?: string } }) {
  const [audit, monitoring] = await Promise.all([
    fetchApiWithFallback<{ items: AuditEntry[] }>('/api/admin/audit-logs', { items: [] }),
    fetchApiWithFallback<MonitoringData>('/api/admin/monitoring', {
      database: 'unavailable', databaseLatencyMs: null, connectionPooler: 'unknown',
      api: { sampleCount: 0, averageLatencyMs: null, errors500: 0, errors504: 0, errorRate5xxPercent: null, windowMinutes: 15 },
      measuredAt: new Date().toISOString(),
    }),
  ]);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://mackhen-farm.vercel.app';
  const bank = process.env.VIETQR_BANK_ID ?? 'MB';

  return <main className="page-shell"><section className="page-card admin-settings-page">
    <div className="page-title"><div><p className="eyebrow">Quản trị</p><h1>Cài đặt hệ thống</h1></div></div>
    <SettingsTabs
      defaultTab={searchParams?.tab === 'audit' || searchParams?.tab === 'monitoring' ? searchParams.tab : 'general'}
      appUrl={appUrl}
      bank={bank}
      auditEntries={audit.data.items}
      auditUnavailable={audit.unavailable}
      monitoring={monitoring.data}
      monitoringUnavailable={monitoring.unavailable}
    />
  </section></main>;
}
