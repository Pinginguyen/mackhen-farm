type PaidOrderNotice = {
  orderCode: string;
  totalAmount: number;
  phone: string;
  address: string;
};

type B2bLeadNotice = {
  companyName: string;
  country: string;
  contactName: string;
  email: string;
  phone: string | null;
  expectedVolume: string;
};

type CustomerCaseNotice = {
  kind: 'Bảo hành' | 'Đổi trả';
  orderCode: string;
  phone: string;
  description: string;
};

function escapeHtml(value: unknown) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]!);
}

async function sendTelegramMessage(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) console.warn(`Telegram notification failed with status ${response.status}.`);
  } catch (error) {
    console.warn('Telegram notification could not be delivered.', error instanceof Error ? error.name : 'UnknownError');
  }
}

export function notifyPaidOrder(order: PaidOrderNotice) {
  return sendTelegramMessage([
    '<b>Thanh toán đơn hàng thành công</b>',
    `Mã đơn: <b>${escapeHtml(order.orderCode)}</b>`,
    `Tổng tiền: ${Number(order.totalAmount || 0).toLocaleString('vi-VN')}đ`,
    `SĐT: ${escapeHtml(order.phone)}`,
    `Địa chỉ: ${escapeHtml(order.address)}`,
  ].join('\n'));
}

export function notifyB2bLead(lead: B2bLeadNotice) {
  return sendTelegramMessage([
    '<b>Yêu cầu hợp tác B2B mới</b>',
    `Doanh nghiệp: <b>${escapeHtml(lead.companyName)}</b> (${escapeHtml(lead.country)})`,
    `Liên hệ: ${escapeHtml(lead.contactName)} · ${escapeHtml(lead.email)}`,
    `SĐT: ${escapeHtml(lead.phone || 'Chưa cung cấp')}`,
    `Sản lượng dự kiến: ${escapeHtml(lead.expectedVolume)}`,
  ].join('\n'));
}

export function notifyCustomerCase(request: CustomerCaseNotice) {
  return sendTelegramMessage([
    `<b>Phát sinh yêu cầu ${request.kind}</b>`,
    `Mã đơn: <b>${escapeHtml(request.orderCode)}</b>`,
    `SĐT: ${escapeHtml(request.phone)}`,
    `Nội dung: ${escapeHtml(request.description)}`,
  ].join('\n'));
}