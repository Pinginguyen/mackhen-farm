import { NextResponse } from 'next/server';

import { getRequestSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(request: Request) {
  try {
    const session = getRequestSession(request);
    if (!session) return NextResponse.json({ error: 'Cần đăng nhập để cập nhật hồ sơ.' }, { status: 401 });

    const body = await request.json() as { name?: string; phone?: string; address?: string };
    const name = body.name?.trim();
    const phone = body.phone?.trim() ?? '';
    const address = body.address?.trim() ?? '';
    if (!name || name.length > 100 || phone.length > 30 || address.length > 500) {
      return NextResponse.json({ error: 'Thông tin hồ sơ không hợp lệ.' }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: session.userId },
      data: { name, phone: phone || null, address: address || null },
      select: { name: true, email: true, phone: true, address: true },
    });
    return NextResponse.json({ user });
  } catch (error) {
    console.error('Account profile update failed:', error);
    return NextResponse.json({ error: 'Không thể cập nhật hồ sơ lúc này.' }, { status: 500 });
  }
}