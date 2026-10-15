import { NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/admin-auth';
import { getRequestSession } from '@/lib/auth';
import { analyzeNewSentiment } from '@/lib/sentiment-analysis';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  return analyzeNewSentiment(request, getRequestSession(request)?.email ?? 'unknown-admin');
}