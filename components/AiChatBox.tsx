'use client';

import { useEffect, useRef, useState } from 'react';
import { Bot, Send, Sparkles, Sprout, X } from 'lucide-react';
import { usePathname } from 'next/navigation';

import { getKnowledgeReply } from '@/lib/ai-chat';

type ChatMessage = { id: number; role: 'assistant' | 'user'; text: string };

const quickQuestions = [
  'Người tập gym ăn có tốt không?',
  'Làm sao để được Freeship?',
  'Chính sách bảo hành đổi trả thế nào?',
];

export default function AiChatBox() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 0, role: 'assistant', text: 'Chào bạn! Mình là Trợ lý Mắc Khén Farm 🌿 Bạn muốn hỏi về dinh dưỡng, chọn vị hay ưu đãi Freeship nè?' },
  ]);
  const nextId = useRef(1);
  const messagesEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading, open]);

  if (pathname === '/admin' || pathname.startsWith('/admin/')) return null;

  async function sendMessage(text = input) {
    const question = text.trim();
    if (!question || loading) return;
    setMessages((current) => [...current, { id: nextId.current++, role: 'user', text: question }]);
    setInput('');
    setLoading(true);
    try {
      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      const result = await response.json() as { reply?: string; error?: string };
      if (!response.ok || !result.reply) throw new Error(result.error ?? 'Chat service unavailable');
      setMessages((current) => [...current, { id: nextId.current++, role: 'assistant', text: result.reply! }]);
    } catch {
      setMessages((current) => [...current, { id: nextId.current++, role: 'assistant', text: getKnowledgeReply(question) }]);
    } finally {
      setLoading(false);
    }
  }

  return <div className="ai-chat-widget"><button className="ai-chat-launcher" type="button" aria-label="Tư vấn dinh dưỡng & Đặt hàng" title="Tư vấn dinh dưỡng & Đặt hàng" aria-expanded={open} aria-controls="ai-chat-panel" onClick={() => setOpen((value) => !value)}>{open ? <X size={24} /> : <><Bot size={23} /><Sparkles className="ai-chat-sparkle" size={14} /></>}</button>{open && <section className="ai-chat-panel" id="ai-chat-panel" role="dialog" aria-label="Tư vấn Mắc Khén Farm"><header className="ai-chat-header"><span className="ai-chat-avatar"><Sprout size={23} /></span><span><strong>Trợ lý Mắc Khén Farm</strong><small>Tư vấn dinh dưỡng & đặt hàng</small></span><button type="button" aria-label="Đóng hộp thoại" onClick={() => setOpen(false)}><X size={19} /></button></header><div className="ai-chat-messages" aria-live="polite">{messages.map((message) => <p className={`ai-chat-message ${message.role}`} key={message.id}>{message.text}</p>)}{loading && <p className="ai-chat-message assistant ai-chat-typing"><span /><span /><span /><em>AI đang trả lời...</em></p>}<div ref={messagesEnd} /></div><div className="ai-chat-composer"><div className="ai-chat-quick-questions">{quickQuestions.map((question) => <button type="button" key={question} disabled={loading} onClick={() => sendMessage(question)}>{question}</button>)}</div><form onSubmit={(event) => { event.preventDefault(); void sendMessage(); }}><textarea aria-label="Tin nhắn của bạn" placeholder="Hỏi về sản phẩm, dinh dưỡng, Freeship..." rows={2} maxLength={600} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} /><button type="submit" aria-label="Gửi tin nhắn" disabled={loading || !input.trim()}><Send size={18} /></button></form></div></section>}</div>;
}