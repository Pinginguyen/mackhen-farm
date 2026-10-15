import { prisma } from '@/lib/prisma';

type AuditEntry = {
  adminEmail: string;
  action: string;
  targetEntity: string;
  targetId: string;
  oldValue?: unknown;
  newValue?: unknown;
};

function getClientIp(request: Request): string | undefined {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const candidate = request.headers.get('x-real-ip')?.trim() || forwarded;
  return candidate && candidate.length <= 64 ? candidate : undefined;
}

export async function writeAuditLog(request: Request, entry: AuditEntry): Promise<void> {
  try {
    const auditModel = (prisma as typeof prisma & { auditLog?: { create?: typeof prisma.auditLog.create } }).auditLog;
    if (!auditModel?.create) return;
    await auditModel.create({
      data: {
        adminEmail: entry.adminEmail,
        action: entry.action,
        targetEntity: entry.targetEntity,
        targetId: entry.targetId,
        oldValue: entry.oldValue === undefined ? undefined : JSON.parse(JSON.stringify(entry.oldValue)),
        newValue: entry.newValue === undefined ? undefined : JSON.parse(JSON.stringify(entry.newValue)),
        ipAddress: getClientIp(request),
      },
    });
  } catch (error) {
    console.error('Admin audit log write failed:', error instanceof Error ? error.name : 'UnknownError');
  }
}
