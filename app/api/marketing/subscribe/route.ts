import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { withDatabase } from '@/lib/api-database';
import { sendMarketingOfferEmail } from '@/lib/email';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: { message: 'Dữ liệu đăng ký không hợp lệ.' } }, { status: 400 });
  }
  if (!isRecord(payload) || typeof payload.email !== 'string' || payload.consent !== true) {
    return NextResponse.json({ error: { message: 'Vui lòng nhập email và đồng ý nhận ưu đãi.' } }, { status: 400 });
  }
  const email = payload.email.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: { message: 'Địa chỉ email không hợp lệ.' } }, { status: 400 });
  }

  return withDatabase(async () => {
    const unsubscribeToken = randomBytes(24).toString('hex');
    const subscriber = await prisma.marketingSubscriber.upsert({
      where: { email },
      create: { email, source: 'EXIT_INTENT', unsubscribeToken },
      update: { source: 'EXIT_INTENT', unsubscribeToken, consentAt: new Date(), unsubscribedAt: null },
      select: { unsubscribeToken: true },
    });
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    const unsubscribeUrl = new URL('/api/marketing/subscribe', baseUrl);
    unsubscribeUrl.searchParams.set('token', subscriber.unsubscribeToken);
    let emailSent = false;
    try {
      await sendMarketingOfferEmail({ toEmail: email, voucherCode: 'GIAM10', unsubscribeUrl: unsubscribeUrl.toString() });
      emailSent = true;
    } catch (error) {
      console.error('Exit offer email delivery failed.', error instanceof Error ? error.name : 'UnknownError');
    }
    return NextResponse.json({ success: true, emailSent, message: 'Đã lưu đăng ký ưu đãi của bạn.' }, { status: 201 });
  }, 'Marketing subscription failed');
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token')?.trim() ?? '';
  if (!/^[a-f0-9]{48}$/.test(token)) {
    return new NextResponse('Liên kết hủy đăng ký không hợp lệ.', { status: 400, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  }
  return withDatabase(async () => {
    const result = await prisma.marketingSubscriber.updateMany({
      where: { unsubscribeToken: token, unsubscribedAt: null },
      data: { unsubscribedAt: new Date() },
    });
    return new NextResponse(result.count ? 'Bạn đã hủy đăng ký nhận email ưu đãi.' : 'Liên kết đã được sử dụng hoặc không còn hợp lệ.', {
      status: result.count ? 200 : 404,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }, 'Marketing unsubscribe failed');
}
