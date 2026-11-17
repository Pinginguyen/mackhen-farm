import { NextResponse } from 'next/server';

import { withDatabase } from '@/lib/api-database';
import { sendB2bInquiryEmail } from '@/lib/email';
import { prisma } from '@/lib/prisma';
import { notifyB2bLead } from '@/lib/services/telegram-notifier';

export const dynamic = 'force-dynamic';

const supportedCountries = new Set(['Singapore', 'Malaysia', 'Australia', 'Khác']);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: { message: 'Yêu cầu không hợp lệ.' } }, { status: 400 });
  }
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    return NextResponse.json({ error: { message: 'Yêu cầu không hợp lệ.' } }, { status: 400 });
  }

  const body = payload as Record<string, unknown>;
  const companyName = typeof body.companyName === 'string' ? body.companyName.trim() : '';
  const country = typeof body.country === 'string' ? body.country.trim() : '';
  const contactName = typeof body.contactName === 'string' ? body.contactName.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  const expectedVolume = typeof body.expectedVolume === 'string' ? body.expectedVolume.trim() : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';

  if (!companyName || companyName.length > 160
    || !supportedCountries.has(country)
    || !contactName || contactName.length > 120
    || !email || email.length > 254 || !emailPattern.test(email)
    || (body.phone != null && typeof body.phone !== 'string')
    || phone.length > 32 || (phone !== '' && !/^[+\d().\s-]{6,32}$/.test(phone))
    || !expectedVolume || expectedVolume.length > 160
    || (body.message != null && typeof body.message !== 'string')
    || message.length > 3000) {
    return NextResponse.json({ error: { message: 'Vui lòng kiểm tra lại thông tin đối tác.' } }, { status: 400 });
  }

  return withDatabase(async () => {
    const inquiry = await prisma.b2bInquiry.create({
      data: {
        companyName,
        country,
        contactName,
        email,
        phone: phone || null,
        expectedVolume,
        message: message || null,
      },
      select: { id: true },
    });

    try {
      await sendB2bInquiryEmail({ companyName, country, contactName, email, phone: phone || null, expectedVolume, message: message || null });
    } catch (error) {
      console.error('B2B inquiry email delivery failed.', error);
    }
    await notifyB2bLead({ companyName, country, contactName, email, phone: phone || null, expectedVolume });

    return NextResponse.json({ success: true, id: inquiry.id }, { status: 201 });
  }, 'B2B inquiry persistence failed.');
}