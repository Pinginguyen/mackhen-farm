import { NextResponse } from 'next/server';

import { getRequestSession } from '@/lib/auth';
import { withDatabase } from '@/lib/api-database';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Nội dung bình luận không hợp lệ.' }, { status: 400 });
  }
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    return NextResponse.json({ error: 'Nội dung bình luận không hợp lệ.' }, { status: 400 });
  }

  const body = payload as { authorName?: unknown; content?: unknown };
  const session = getRequestSession(request);
  const content = typeof body.content === 'string' ? body.content.trim() : '';
  const authorName = session?.role === 'ADMIN'
    ? session.name.trim()
    : (session?.name ?? (typeof body.authorName === 'string' ? body.authorName : '')).trim();
  if (!authorName || authorName.length > 100 || !content || content.length > 1000) {
    return NextResponse.json({ error: 'Nhập tên hiển thị và nội dung bình luận (tối đa 1.000 ký tự).' }, { status: 400 });
  }

  return withDatabase(async () => {
    const review = await prisma.review.findUnique({ where: { id: params.id }, select: { id: true } });
    if (!review) return NextResponse.json({ error: 'Không tìm thấy đánh giá.' }, { status: 404 });
    const reply = await prisma.reviewReply.create({
      data: {
        reviewId: review.id,
        userId: session?.userId ?? null,
        authorName,
        authorRole: session?.role === 'ADMIN' ? 'ADMIN' : 'USER',
        content,
      },
      select: { id: true, reviewId: true, authorName: true, authorRole: true, content: true, createdAt: true },
    });
    return NextResponse.json({ reply }, { status: 201 });
  });
}
