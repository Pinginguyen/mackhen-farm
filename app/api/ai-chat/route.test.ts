import { afterEach, describe, expect, it, vi } from 'vitest';

import { POST } from './route';

afterEach(() => vi.unstubAllEnvs());

describe('POST /api/ai-chat', () => {
  it('uses the knowledge fallback when no provider key is configured', async () => {
    vi.stubEnv('OPENAI_API_KEY', '');
    vi.stubEnv('GEMINI_API_KEY', '');
    const response = await POST(new Request('https://mackhen.example/api/ai-chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ question: 'Làm sao để được Freeship?' }),
    }));
    const result = await response.json() as { reply: string; source: string };
    expect(response.status).toBe(200);
    expect(result.source).toBe('knowledge');
    expect(result.reply).toContain('169.000đ');
  });

  it('rejects empty and oversized questions', async () => {
    const empty = await POST(new Request('https://mackhen.example/api/ai-chat', { method: 'POST', body: JSON.stringify({ question: ' ' }) }));
    const long = await POST(new Request('https://mackhen.example/api/ai-chat', { method: 'POST', body: JSON.stringify({ question: 'x'.repeat(601) }) }));
    expect(empty.status).toBe(400);
    expect(long.status).toBe(400);
  });
});