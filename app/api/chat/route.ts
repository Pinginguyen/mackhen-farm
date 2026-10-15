import { NextResponse } from 'next/server';

import { assistantSystemPrompt, getKnowledgeReply } from '@/lib/ai-chat';

export const dynamic = 'force-dynamic';

type ChatRole = 'user' | 'assistant';
type ChatHistoryMessage = { role: ChatRole; text: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseHistory(value: unknown): ChatHistoryMessage[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 24) return null;
  const history: ChatHistoryMessage[] = [];
  for (const entry of value) {
    if (!isRecord(entry)
      || (entry.role !== 'user' && entry.role !== 'assistant')
      || typeof entry.text !== 'string'
      || !entry.text.trim()
      || entry.text.length > 600) return null;
    history.push({ role: entry.role, text: entry.text.trim() });
  }
  return history.slice(-12);
}

async function askGemini(message: string, history: ChatHistoryMessage[]): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: assistantSystemPrompt }] },
          contents: [
            ...history.map((entry) => ({ role: entry.role === 'assistant' ? 'model' : 'user', parts: [{ text: entry.text }] })),
            { role: 'user', parts: [{ text: message }] },
          ],
          generationConfig: { temperature: 0.4, maxOutputTokens: 400 },
        }),
        signal: controller.signal,
        cache: 'no-store',
      },
    );
    if (!response.ok) return null;
    const result = await response.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    return result.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('').trim() || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Yêu cầu không hợp lệ.' }, { status: 400 });
  }

  if (!isRecord(body)) return NextResponse.json({ error: 'Yêu cầu không hợp lệ.' }, { status: 400 });
  const messageValue = typeof body.message === 'string' ? body.message : body.question;
  if (typeof messageValue !== 'string' || !messageValue.trim() || messageValue.length > 600) {
    return NextResponse.json({ error: 'Tin nhắn cần có nội dung và tối đa 600 ký tự.' }, { status: 400 });
  }
  const history = parseHistory(body.history);
  if (!history) return NextResponse.json({ error: 'Lịch sử trò chuyện không hợp lệ.' }, { status: 400 });

  const message = messageValue.trim();
  const reply = await askGemini(message, history);
  return NextResponse.json({ reply: reply ?? getKnowledgeReply(message), source: reply ? 'ai' : 'knowledge' });
}