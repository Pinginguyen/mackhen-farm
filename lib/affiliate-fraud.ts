import { createHmac } from 'node:crypto';

export function getClientIpHash(request: Request): string | null {
  const ip = request.headers.get('x-real-ip')?.trim()
    || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const secret = process.env.AFFILIATE_IP_HASH_SECRET || process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!ip || !secret) return null;
  return createHmac('sha256', secret).update(ip).digest('hex');
}

export function normalizeAffiliatePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  const national = digits.startsWith('0084') ? `0${digits.slice(4)}` : digits.startsWith('84') ? `0${digits.slice(2)}` : digits;
  return /^0[35789]\d{8}$/.test(national) ? national : null;
}

export function isSelfReferral(input: {
  buyerUserId: string | null;
  buyerPhone: string;
  buyerIpHash: string | null;
  affiliateUserId: string;
  affiliatePhone: string | null;
  affiliateIpHash: string | null;
}): boolean {
  return input.buyerUserId === input.affiliateUserId
    || normalizeAffiliatePhone(input.buyerPhone) !== null
      && normalizeAffiliatePhone(input.buyerPhone) === normalizeAffiliatePhone(input.affiliatePhone)
    || Boolean(input.buyerIpHash && input.affiliateIpHash && input.buyerIpHash === input.affiliateIpHash);
}