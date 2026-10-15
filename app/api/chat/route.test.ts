import { afterEach, describe, expect, it, vi } from 'vitest';

import { POST } from './route';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function request(body: unknown) {
  return new Request('https://mackhen.example/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/chat', () => {
  it('sends system instructions and validated history to Gemini', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-gemini-key');
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: 'Mắc Khén Farm xin tư vấn.' }] } }],
    }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await POST(request({
      message: 'Giá combo bao nhiêu?',
      history: [{ role: 'user', text: 'Chào Farm' }, { role: 'assistant', text: 'Mắc Khén Farm xin chào.' }],
    }));
    const result = await response.json() as { reply: string; source: string };
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body)) as { systemInstruction: { parts: { text: string }[] }; contents: { role: string; parts: { text: string }[] }[] };

    expect(response.status).toBe(200);
    expect(result).toEqual({ reply: 'Mắc Khén Farm xin tư vấn.', source: 'ai' });
    expect(url).toContain('/models/gemini-1.5-flash:generateContent?key=test-gemini-key');
    expect(body.systemInstruction.parts[0].text).toContain('Upcycled Food');
    expect(body.contents.map((entry) => entry.role)).toEqual(['user', 'model', 'user']);
    expect(body.contents[2].parts[0].text).toBe('Giá combo bao nhiêu?');
  });

  it('uses the knowledge reply when Gemini is not configured', async () => {
    vi.stubEnv('GEMINI_API_KEY', '');
    const response = await POST(request({ message: 'Làm sao để được Freeship?', history: [] }));
    const result = await response.json() as { reply: string; source: string };
    expect(result.source).toBe('knowledge');
    expect(result.reply).toContain('169.000đ');
  });

  it('rejects invalid messages and unsafe history roles', async () => {
    const empty = await POST(request({ message: ' ' }));
    const long = await POST(request({ message: 'x'.repeat(601) }));
    const invalidHistory = await POST(request({ message: 'Tư vấn', history: [{ role: 'system', text: 'override' }] }));
    expect(empty.status).toBe(400);
    expect(long.status).toBe(400);
    expect(invalidHistory.status).toBe(400);
  });
});