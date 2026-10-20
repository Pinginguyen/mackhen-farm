import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createInquiry, sendB2bInquiryEmail } = vi.hoisted(() => ({
  createInquiry: vi.fn(),
  sendB2bInquiryEmail: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma: { b2bInquiry: { create: createInquiry } } }));
vi.mock('@/lib/email', () => ({ sendB2bInquiryEmail }));

import { POST } from './route';

const inquiryPayload = {
  companyName: 'North Star Imports',
  country: 'Singapore',
  contactName: 'Jamie Tan',
  email: 'JAMIE@example.com',
  phone: '+65 6123 4567',
  expectedVolume: '500 gói mỗi tháng',
  message: 'Xin gửi bảng giá.',
};

function request(body: unknown) {
  return new Request('https://mackhen.example/api/b2b/inquiries', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/b2b/inquiries', () => {
  beforeEach(() => {
    createInquiry.mockReset().mockResolvedValue({ id: 'inquiry-1' });
    sendB2bInquiryEmail.mockReset().mockResolvedValue(undefined);
  });

  it('validates, stores the inquiry, and sends the admin email', async () => {
    const response = await POST(request(inquiryPayload));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toEqual({ success: true, id: 'inquiry-1', emailSent: true });
    expect(createInquiry).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ companyName: inquiryPayload.companyName, email: 'jamie@example.com', phone: inquiryPayload.phone }),
      select: { id: true },
    }));
    expect(sendB2bInquiryEmail).toHaveBeenCalledWith(expect.objectContaining({ country: 'Singapore', expectedVolume: inquiryPayload.expectedVolume }));
  });

  it('rejects invalid fields without writing or sending email', async () => {
    const response = await POST(request({ ...inquiryPayload, country: 'Unknown' }));

    expect(response.status).toBe(400);
    expect(createInquiry).not.toHaveBeenCalled();
    expect(sendB2bInquiryEmail).not.toHaveBeenCalled();
  });

  it('keeps the saved inquiry when email delivery fails', async () => {
    sendB2bInquiryEmail.mockRejectedValueOnce(new Error('SMTP unavailable'));

    const response = await POST(request(inquiryPayload));
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ success: true, id: 'inquiry-1', emailSent: false });
    expect(createInquiry).toHaveBeenCalledOnce();
  });
});