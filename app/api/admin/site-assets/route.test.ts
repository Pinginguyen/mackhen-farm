import { beforeEach, describe, expect, it, vi } from 'vitest';

const { assetFindMany, assetFindUnique, assetUpdate, requireAdmin, ensureSiteAssets, revalidateTag, writeAuditLog, prisma } = vi.hoisted(() => {
  const assetFindMany = vi.fn();
  const assetFindUnique = vi.fn();
  const assetUpdate = vi.fn();
  const requireAdmin = vi.fn();
  const ensureSiteAssets = vi.fn();
  const revalidateTag = vi.fn();
  const writeAuditLog = vi.fn();
  return {
    assetFindMany,
    assetFindUnique,
    assetUpdate,
    requireAdmin,
    ensureSiteAssets,
    revalidateTag,
    writeAuditLog,
    prisma: { siteAsset: { findMany: assetFindMany, findUnique: assetFindUnique, update: assetUpdate } },
  };
});

vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/admin-auth', () => ({ requireAdmin }));
vi.mock('@/lib/site-assets', () => ({ ensureSiteAssets }));
vi.mock('@/lib/auth', () => ({ getRequestSession: () => ({ email: 'admin@example.com' }) }));
vi.mock('@/lib/audit-log', () => ({ writeAuditLog }));
vi.mock('next/cache', () => ({ revalidateTag }));

import { GET, PATCH } from './route';

function request(method: string, body?: unknown) {
  return new Request('https://mackhen.example/api/admin/site-assets', {
    method,
    headers: { 'content-type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

describe('/api/admin/site-assets', () => {
  beforeEach(() => {
    assetFindMany.mockReset().mockResolvedValue([]);
    assetFindUnique.mockReset().mockResolvedValue({ key: 'HERO_BANNER_MAIN', imageUrl: '/old.jpg' });
    assetUpdate.mockReset().mockResolvedValue({ key: 'HERO_BANNER_MAIN', imageUrl: 'https://blob.example/hero.jpg', altText: 'Hero' });
    requireAdmin.mockReset().mockResolvedValue(null);
    ensureSiteAssets.mockReset().mockResolvedValue(undefined);
    revalidateTag.mockReset();
    writeAuditLog.mockReset().mockResolvedValue(undefined);
  });

  it('requires admin access before listing assets', async () => {
    requireAdmin.mockResolvedValueOnce(new Response(null, { status: 403 }));
    const response = await GET(request('GET'));

    expect(response.status).toBe(403);
    expect(assetFindMany).not.toHaveBeenCalled();
  });

  it('creates default slots and lists stored assets', async () => {
    assetFindMany.mockResolvedValueOnce([{ key: 'HERO_BANNER_MAIN' }]);
    const response = await GET(request('GET'));

    expect(response.status).toBe(200);
    expect(ensureSiteAssets).toHaveBeenCalledOnce();
    expect(await response.json()).toEqual({ items: [{ key: 'HERO_BANNER_MAIN' }] });
  });

  it('rejects unsafe image URLs before writing', async () => {
    const response = await PATCH(request('PATCH', { key: 'HERO_BANNER_MAIN', imageUrl: 'javascript:alert(1)' }));

    expect(response.status).toBe(400);
    expect(assetFindUnique).not.toHaveBeenCalled();
    expect(assetUpdate).not.toHaveBeenCalled();
  });

  it('updates the selected slot, writes an audit record, and invalidates its cache', async () => {
    const response = await PATCH(request('PATCH', {
      key: 'HERO_BANNER_MAIN',
      imageUrl: 'https://blob.example/hero.jpg',
      altText: 'Hero',
    }));

    expect(response.status).toBe(200);
    expect(assetUpdate).toHaveBeenCalledWith({
      where: { key: 'HERO_BANNER_MAIN' },
      data: { imageUrl: 'https://blob.example/hero.jpg', altText: 'Hero' },
    });
    expect(revalidateTag).toHaveBeenCalledWith('site-asset:HERO_BANNER_MAIN');
    expect(writeAuditLog).toHaveBeenCalledWith(expect.any(Request), expect.objectContaining({ action: 'UPDATE_SITE_ASSET' }));
  });
});