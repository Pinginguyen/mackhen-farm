import { NextResponse } from 'next/server';

import { assistantSystemPrompt, getKnowledgeReply } from '@/lib/ai-chat';

export const dynamic = 'force-dynamic';

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 10000): Promise<Response | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: 'no-store' });
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function askOpenAI(question: string): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
      temperature: 0.4,
      max_tokens: 260,
      messages: [{ role: 'system', content: assistantSystemPrompt }, { role: 'user', content: question }],
    }),
  });
  if (!response?.ok) return null;
  try {
    const result = await response.json() as { choices?: { message?: { content?: string } }[] };
    return result.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}

async function askGemini(question: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: assistantSystemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: question }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 260 },
    }),
  });
  if (!response?.ok) return null;
  try {
    const result = await response.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    return result.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('').trim() || null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  let body: { question?: unknown };
  try {
    body = await request.json() as { question?: unknown };
  } catch {
    return NextResponse.json({ error: 'Yêu cầu không hợp lệ.' }, { status: 400 });
  }

  if (typeof body.question !== 'string' || !body.question.trim() || body.question.length > 600) {
    return NextResponse.json({ error: 'Tin nhắn cần có nội dung và tối đa 600 ký tự.' }, { status: 400 });
  }

  const question = body.question.trim();
  try {
    const reply = await askOpenAI(question) ?? await askGemini(question);
    return NextResponse.json({ reply: reply ?? getKnowledgeReply(question), source: reply ? 'ai' : 'knowledge' });
  } catch {
    return NextResponse.json({ reply: getKnowledgeReply(question), source: 'knowledge' });
  }
}