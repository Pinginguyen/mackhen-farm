import { describe, expect, it } from 'vitest';

import { getKnowledgeReply } from './ai-chat';

describe('Mắc Khén Farm chat knowledge fallback', () => {
  it('answers gym and nutrition questions', () => {
    const reply = getKnowledgeReply('Người tập gym ăn có tốt không?');
    expect(reply).toContain('22g protein thực vật/100g');
    expect(reply).toContain('0% cholesterol');
  });

  it('answers free-shipping questions', () => {
    expect(getKnowledgeReply('Làm sao để được Freeship?')).toContain('169.000đ');
  });

  it('answers warranty questions', () => {
    const reply = getKnowledgeReply('Chính sách bảo hành đổi trả thế nào?');
    expect(reply).toContain('24 giờ');
    expect(reply).toContain('không cần gửi trả');
  });
});