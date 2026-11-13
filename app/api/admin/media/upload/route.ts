import { randomUUID } from 'node:crypto';
import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 4 * 1024 * 1024;

function detectImage(bytes: Uint8Array): { extension: string; contentType: string } | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
    && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) {
    return { extension: 'png', contentType: 'image/png' };
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { extension: 'jpg', contentType: 'image/jpeg' };
  }
  if (bytes.length >= 12
    && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF'
    && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') {
    return { extension: 'webp', contentType: 'image/webp' };
  }
  return null;
}

export async function POST(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: 'Chưa cấu hình kho lưu trữ hình ảnh.' }, { status: 503 });
  }
  const contentLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_FILE_SIZE + 64 * 1024) {
    return NextResponse.json({ error: 'Ảnh phải có dung lượng tối đa 4 MB.' }, { status: 413 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Không đọc được dữ liệu tải lên.' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!file || typeof file === 'string' || typeof file.arrayBuffer !== 'function') {
    return NextResponse.json({ error: 'Vui lòng chọn một tệp hình ảnh.' }, { status: 400 });
  }
  if (file.size < 1 || file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'Ảnh phải có dung lượng tối đa 4 MB.' }, { status: 413 });
  }

  const image = detectImage(new Uint8Array(await file.arrayBuffer()));
  if (!image || (file.type && file.type !== image.contentType)) {
    return NextResponse.json({ error: 'Chỉ hỗ trợ ảnh JPEG, PNG hoặc WebP hợp lệ.' }, { status: 415 });
  }

  try {
    const blob = await put(`site-assets/${randomUUID()}.${image.extension}`, file, {
      access: 'public',
      contentType: image.contentType,
    });
    return NextResponse.json({ url: blob.url }, { status: 201 });
  } catch (error) {
    console.error('Admin media upload failed:', error);
    return NextResponse.json({ error: 'Không thể tải ảnh lên kho lưu trữ.' }, { status: 502 });
  }
}