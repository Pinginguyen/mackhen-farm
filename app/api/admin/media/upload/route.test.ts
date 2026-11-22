import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { put, requireAdmin, revalidatePath } = vi.hoisted(() => ({ put: vi.fn(), requireAdmin: vi.fn(), revalidatePath: vi.fn() }));

vi.mock('@vercel/blob', () => ({ put }));
vi.mock('@/lib/admin-auth', () => ({ requireAdmin }));
vi.mock('next/cache', () => ({ revalidatePath }));

import { POST } from './route';

const pngHeader = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function uploadRequest(bytes: number[], contentType = 'image/png', headers?: HeadersInit) {
  const formData = new FormData();
  formData.set('file', new Blob([new Uint8Array(bytes)], { type: contentType }), 'image.png');
  return new Request('https://mackhen.example/api/admin/media/upload', { method: 'POST', body: formData, headers });
}

describe('/api/admin/media/upload', () => {
  beforeEach(() => {
    requireAdmin.mockReset().mockResolvedValue(null);
    put.mockReset().mockResolvedValue({ url: 'https://blob.example/site-assets/hero.png' });
    revalidatePath.mockReset();
    vi.stubEnv('BLOB_READ_WRITE_TOKEN', 'test-token');
  });

  afterEach(() => vi.unstubAllEnvs());

  it('requires admin access before parsing an upload', async () => {
    requireAdmin.mockResolvedValueOnce(new Response(null, { status: 403 }));
    const response = await POST(uploadRequest(pngHeader));

    expect(response.status).toBe(403);
    expect(put).not.toHaveBeenCalled();
  });

  it('rejects files without a supported image signature', async () => {
    const response = await POST(uploadRequest([1, 2, 3, 4]));

    expect(response.status).toBe(415);
    expect(put).not.toHaveBeenCalled();
  });

  it('rejects oversized multipart requests before parsing the file', async () => {
    const response = await POST(uploadRequest(pngHeader, 'image/png', {
      'content-length': String(4 * 1024 * 1024 + 64 * 1024 + 1),
    }));

    expect(response.status).toBe(413);
    expect(put).not.toHaveBeenCalled();
  });

  it('uploads a verified image to public Blob storage', async () => {
    const response = await POST(uploadRequest(pngHeader));

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ url: 'https://blob.example/site-assets/hero.png' });
    expect(revalidatePath).toHaveBeenNthCalledWith(1, '/', 'layout');
    expect(revalidatePath).toHaveBeenNthCalledWith(2, '/admin/media');
    expect(put).toHaveBeenCalledWith(expect.stringMatching(/^site-assets\/.+\.png$/), expect.any(File), {
      access: 'public',
      contentType: 'image/png',
    });
  });

  it('reports missing Blob configuration without attempting an upload', async () => {
    vi.stubEnv('BLOB_READ_WRITE_TOKEN', '');
    const response = await POST(uploadRequest(pngHeader));

    expect(response.status).toBe(503);
    expect(put).not.toHaveBeenCalled();
  });
});