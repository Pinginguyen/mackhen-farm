import { NextResponse } from 'next/server';

import { analyzeNewSentiment } from '@/lib/sentiment-analysis';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return analyzeNewSentiment(request, 'system:sentiment-cron');
}
