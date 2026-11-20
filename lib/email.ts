import nodemailer from 'nodemailer';

type EmailMessage = { toEmail: string; subject: string; text: string; html: string; replyTo?: string };

async function sendEmail({ toEmail, subject, text, html, replyTo }: EmailMessage): Promise<boolean> {
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const password = process.env.SMTP_PASSWORD || process.env.SMTP_PASS || process.env.EMAIL_PASS;
  if (!user || !password) {
    console.warn('[EMAIL_CONFIG_MISSING] Configure SMTP_USER/EMAIL_USER and SMTP_PASSWORD/SMTP_PASS/EMAIL_PASS to enable email delivery.');
    console.log('[DEV_EMAIL_SIMULATOR] To:', toEmail, 'Subject:', subject, 'Link/Content:', text);
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user, pass: password },
    });
    await transporter.sendMail({
      from: `"Mắc Khén Farm" <${user}>`,
      to: toEmail,
      subject,
      text,
      html,
      ...(replyTo ? { replyTo } : {}),
    });
    return true;
  } catch (error) {
    console.error('[EMAIL_SEND_FAILED]', error instanceof Error ? error.message : error);
    return false;
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] ?? character);
}

export async function sendPasswordResetEmail(toEmail: string, resetLink: string) {
  const escapedLink = resetLink.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return sendEmail({
    toEmail,
    subject: '[Mắc Khén Farm] Yêu cầu đặt lại mật khẩu',
    text: `Bạn vừa yêu cầu đặt lại mật khẩu tại Mắc Khén Farm. Vui lòng truy cập đường link sau để đổi mật khẩu: ${resetLink}\n\nLiên kết chỉ có hiệu lực trong 15 phút. Nếu bạn không yêu cầu, hãy bỏ qua email này.`,
    html: `<div style="margin:0;padding:36px 16px;background:#f7f4ed;font-family:Arial,sans-serif;color:#292524"><div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e7e1d8;border-radius:14px;overflow:hidden"><div style="padding:25px 30px;background:#8b1e1e;color:#fff"><p style="margin:0 0 7px;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#f4d8b0">Nông sản sấy vị Tây Bắc</p><h1 style="margin:0;font-size:23px">Mắc Khén Farm</h1></div><div style="padding:30px"><h2 style="margin:0 0 12px;font-size:20px;color:#292524">Đặt lại mật khẩu</h2><p style="margin:0;color:#57534e;line-height:1.65">Xin chào, chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản Mắc Khén Farm của bạn. Nhấn nút bên dưới để tiếp tục.</p><p style="margin:28px 0;text-align:center"><a href="${escapedLink}" style="display:inline-block;padding:14px 24px;border-radius:9px;background:#8b1e1e;color:#fff;text-decoration:none;font-size:15px;font-weight:700">Đặt lại mật khẩu</a></p><p style="margin:0;padding:13px 15px;border-radius:8px;background:#fff8e7;color:#75551b;font-size:13px;line-height:1.6">Liên kết này chỉ có hiệu lực trong <strong>15 phút</strong> và chỉ sử dụng một lần.</p><p style="margin:20px 0 0;color:#78716c;font-size:12px;line-height:1.6">Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này. Mật khẩu hiện tại của bạn vẫn được giữ nguyên.</p></div></div></div>`,
  });
}

export async function sendCompensationVoucherEmail(input: {
  toEmail: string;
  orderCode: string;
  voucherCode: string;
  discountValue: number;
  discountType: 'PERCENTAGE' | 'FIXED';
}) {
  const orderCode = escapeHtml(input.orderCode);
  const voucherCode = escapeHtml(input.voucherCode);
  const discount = input.discountType === 'PERCENTAGE'
    ? `${input.discountValue}%`
    : `${input.discountValue.toLocaleString('vi-VN')}đ`;
  const storeUrl = `${(process.env.NEXT_PUBLIC_APP_URL || 'https://mackhenfarm.vn').replace(/\/+$/, '')}/san-pham`;
  const escapedStoreUrl = escapeHtml(storeUrl);

  return sendEmail({
    toEmail: input.toEmail,
    subject: `[Mắc Khén Farm] Mã voucher bồi thường cho đơn hàng ${input.orderCode}`,
    text: `Xin lỗi bạn vì sự cố giao sai sản phẩm hoặc chất lượng hàng hóa của đơn ${input.orderCode}. Mắc Khén Farm gửi tặng bạn mã voucher ${input.voucherCode}, giảm ${discount}. Dùng ngay tại cửa hàng: ${storeUrl}`,
    html: `<div style="margin:0;padding:36px 16px;background:#f7f4ed;font-family:Arial,sans-serif;color:#292524"><div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e7e1d8;border-radius:14px;overflow:hidden"><div style="padding:25px 30px;background:#8b1e1e;color:#fff"><p style="margin:0 0 7px;font-size:12px;text-transform:uppercase;color:#f4d8b0">Mắc Khén Farm</p><h1 style="margin:0;font-size:23px">Lời xin lỗi và món quà từ chúng tôi</h1></div><div style="padding:30px"><p style="margin:0 0 16px;line-height:1.65">Xin lỗi bạn vì sự cố giao sai sản phẩm hoặc chất lượng hàng hóa trong đơn <strong>${orderCode}</strong>. Mắc Khén Farm gửi tặng bạn voucher bồi thường để thay lời xin lỗi.</p><p style="margin:20px 0;padding:18px;border:1px dashed #8b1e1e;border-radius:10px;text-align:center"><strong style="display:block;margin-bottom:8px;font-size:13px;color:#57534e">MÃ VOUCHER</strong><span style="font-size:23px;font-weight:700;letter-spacing:1px;color:#8b1e1e">${voucherCode}</span><span style="display:block;margin-top:8px;font-size:15px">Giảm <strong>${discount}</strong></span></p><p style="margin:28px 0;text-align:center"><a href="${escapedStoreUrl}" style="display:inline-block;padding:14px 24px;border-radius:9px;background:#8b1e1e;color:#fff;text-decoration:none;font-size:15px;font-weight:700">Dùng ngay tại cửa hàng</a></p><p style="margin:0;color:#78716c;font-size:12px;line-height:1.6">Cảm ơn bạn đã thông cảm và tiếp tục ủng hộ Mắc Khén Farm.</p></div></div></div>`,
  });
}

export async function sendReviewRewardEmail(input: { toEmail: string; customerName: string; voucherCode: string; expiresAt: Date }) {
  const customerName = escapeHtml(input.customerName);
  const voucherCode = escapeHtml(input.voucherCode);
  const expiresAt = input.expiresAt.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  const shopUrl = `${(process.env.NEXT_PUBLIC_APP_URL || 'https://mackhenfarm.vn').replace(/\/+$/, '')}/products`;
  const html = emailLayout('Cảm ơn bạn đã chia sẻ trải nghiệm', `<p style="margin:0 0 14px;line-height:1.6">Xin chào ${customerName}, đánh giá của bạn đã được duyệt. Mắc Khén Farm gửi tặng bạn voucher giảm 10% như lời cảm ơn.</p><p style="margin:20px 0;padding:16px;border:1px dashed #8b1e1e;text-align:center"><strong style="display:block;color:#78716c;font-size:12px">MÃ ƯU ĐÃI CÁ NHÂN</strong><span style="display:block;margin:8px 0;color:#8b1e1e;font-size:22px;font-weight:700">${voucherCode}</span><small>Giảm 10% cho đơn từ 100.000đ · Hạn dùng ${escapeHtml(expiresAt)}</small></p><p style="margin:22px 0;text-align:center"><a href="${escapeHtml(shopUrl)}" style="display:inline-block;padding:12px 20px;background:#7c1d1d;color:#fff;text-decoration:none;font-weight:bold">Khám phá sản phẩm</a></p>`);

  return sendEmail({
    toEmail: input.toEmail,
    subject: '[Mắc Khén Farm] Voucher cảm ơn đánh giá của bạn',
    text: `Xin chào ${input.customerName}, đánh giá của bạn đã được duyệt. Mã voucher ${input.voucherCode} giảm 10% cho đơn từ 100.000đ, hạn dùng đến ${expiresAt}. ${shopUrl}`,
    html,
  });
}

export async function sendB2bInquiryEmail(input: {
  companyName: string;
  country: string;
  contactName: string;
  email: string;
  phone: string | null;
  expectedVolume: string;
  message: string | null;
}) {
  const recipient = process.env.SMTP_USER || 'trungchau1210@gmail.com';
  const companyName = escapeHtml(input.companyName);
  const country = escapeHtml(input.country);
  const contactName = escapeHtml(input.contactName);
  const email = escapeHtml(input.email);
  const phone = escapeHtml(input.phone || 'Không cung cấp');
  const expectedVolume = escapeHtml(input.expectedVolume);
  const message = escapeHtml(input.message || 'Không có');

  return sendEmail({
    toEmail: recipient,
    replyTo: input.email,
    subject: '[Mắc Khén Farm] Yêu cầu hợp tác B2B mới',
    text: `Công ty: ${input.companyName}\nQuốc gia: ${input.country}\nNgười liên hệ: ${input.contactName}\nEmail: ${input.email}\nĐiện thoại: ${input.phone || 'Không cung cấp'}\nMOQ dự kiến: ${input.expectedVolume}\nNội dung: ${input.message || 'Không có'}`,
    html: `<div style="font-family:Arial,sans-serif;color:#292524"><h1>Yêu cầu hợp tác B2B mới</h1><p><strong>Công ty:</strong> ${companyName}</p><p><strong>Quốc gia:</strong> ${country}</p><p><strong>Người liên hệ:</strong> ${contactName}</p><p><strong>Email:</strong> ${email}</p><p><strong>Điện thoại:</strong> ${phone}</p><p><strong>MOQ dự kiến:</strong> ${expectedVolume}</p><p><strong>Nội dung:</strong><br>${message.replace(/\n/g, '<br>')}</p></div>`,
  });
}

type OrderEmailItem = { productName: string; variantLabel?: string | null; quantity: number; unitPrice: number };

function emailLayout(title: string, content: string): string {
  return `<div style="margin:0;padding:24px 12px;background:#f7f4ed;font-family:Arial,Helvetica,sans-serif;color:#292524"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #e7e1d8;border-collapse:separate;border-spacing:0"><tr><td style="padding:24px;background:#1b4332;color:#fff"><p style="margin:0 0 6px;font-size:11px;letter-spacing:1px;color:#e8d7b8">NÔNG SẢN SẤY VỊ TÂY BẮC</p><h1 style="margin:0;font-size:22px;line-height:1.3">Mắc Khén Farm</h1></td></tr><tr><td style="padding:24px 20px"><h2 style="margin:0 0 14px;font-size:20px;line-height:1.35;color:#1b4332">${escapeHtml(title)}</h2>${content}</td></tr><tr><td style="padding:16px 20px;background:#f8f6f1;color:#78716c;font-size:12px;line-height:1.6">Mắc Khén Farm · Đặc sản thủ công từ vùng nguyên liệu Tây Bắc</td></tr></table></div>`;
}

export async function sendAbandonedCartEmail(input: {
  toEmail: string;
  voucherCode: string;
  expiresAt: Date;
  cartUrl: string;
  items: { name: string; quantity: number; unitPrice: number }[];
}) {
  const items = input.items.map((item) => `${item.name} × ${item.quantity} · ${(item.unitPrice * item.quantity).toLocaleString('vi-VN')}đ`).join('\n');
  const rows = input.items.map((item) => `<tr><td style="padding:9px 5px;border-bottom:1px solid #eee8df">${escapeHtml(item.name)}</td><td style="padding:9px 5px;border-bottom:1px solid #eee8df;text-align:center">${item.quantity}</td><td style="padding:9px 5px;border-bottom:1px solid #eee8df;text-align:right">${(item.unitPrice * item.quantity).toLocaleString('vi-VN')}đ</td></tr>`).join('');
  const voucherCode = escapeHtml(input.voucherCode);
  const cartUrl = escapeHtml(input.cartUrl);
  const expiry = input.expiresAt.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  const html = emailLayout('Giỏ hàng của bạn vẫn đang chờ', `<p style="margin:0 0 14px;line-height:1.6">Bạn đã để lại một số sản phẩm trong giỏ hàng. Giỏ hàng được lưu để bạn tiếp tục khi thuận tiện.</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;font-size:13px"><tbody>${rows}</tbody></table><p style="margin:20px 0;padding:14px;background:#f8f6f1;line-height:1.6">Mã ưu đãi một lần: <strong style="color:#841e1e">${voucherCode}</strong><br>Giảm 10% tối đa 30.000đ cho đơn từ 100.000đ. Hạn dùng đến ${escapeHtml(expiry)}.</p><p style="margin:24px 0;text-align:center"><a href="${cartUrl}" style="display:inline-block;padding:12px 20px;background:#7c1d1d;color:#fff;text-decoration:none;font-weight:bold">Quay lại giỏ hàng</a></p>`);

  return sendEmail({
    toEmail: input.toEmail,
    subject: '[Mắc Khén Farm] Giỏ hàng của bạn đang chờ',
    text: `Các sản phẩm đang chờ trong giỏ hàng:\n${items}\n\nMã ưu đãi một lần: ${input.voucherCode}. Giảm 10% tối đa 30.000đ cho đơn từ 100.000đ, có hạn đến ${expiry}. Tiếp tục tại: ${input.cartUrl}`,
    html,
  });
}

export async function sendOrderConfirmationEmail(input: {
  toEmail: string;
  customerName: string;
  orderCode: string;
  paymentMethod: 'COD' | 'VIETQR' | 'MOMO' | 'WALLET';
  subtotal: number;
  shippingFee: number;
  discountAmount: number;
  walletAmountSpent?: number;
  totalAmount: number;
  items: OrderEmailItem[];
}) {
  const orderCode = escapeHtml(input.orderCode);
  const customerName = escapeHtml(input.customerName);
  const rows = input.items.map((item) => `<tr><td style="padding:10px 6px;border-bottom:1px solid #eee8df"><strong>${escapeHtml(item.productName)}</strong>${item.variantLabel ? `<br><small style="color:#78716c">${escapeHtml(item.variantLabel)}</small>` : ''}</td><td style="padding:10px 6px;border-bottom:1px solid #eee8df;text-align:center">${item.quantity}</td><td style="padding:10px 6px;border-bottom:1px solid #eee8df;text-align:right;white-space:nowrap">${(item.unitPrice * item.quantity).toLocaleString('vi-VN')}đ</td></tr>`).join('');
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://mackhenfarm.vn').replace(/\/+$/, '');
  const trackingUrl = `${appUrl}/tra-cuu?orderCode=${encodeURIComponent(input.orderCode)}`;
  const bankId = process.env.VIETQR_BANK_ID;
  const accountNumber = process.env.VIETQR_ACCOUNT_NUMBER;
  const accountName = process.env.VIETQR_ACCOUNT_NAME ?? '';
  const amountDue = input.totalAmount - (input.walletAmountSpent ?? 0);
  let qrUrl = '';
  if (input.paymentMethod === 'VIETQR' && amountDue > 0 && bankId && accountNumber) {
    const qr = new URL(`https://img.vietqr.io/image/${encodeURIComponent(bankId)}-${encodeURIComponent(accountNumber)}-compact2.png`);
    qr.searchParams.set('amount', String(amountDue));
    qr.searchParams.set('addInfo', input.orderCode);
    if (accountName) qr.searchParams.set('accountName', accountName);
    qrUrl = qr.toString();
  }
  const transferBlock = input.paymentMethod === 'VIETQR'
    ? `<h3 style="margin:22px 0 8px;color:#1b4332;font-size:15px">Thông tin chuyển khoản</h3>${qrUrl ? `<p style="text-align:center;margin:14px 0"><img src="${escapeHtml(qrUrl)}" width="220" height="220" alt="Mã VietQR cho đơn ${orderCode}" style="display:block;width:220px;max-width:100%;height:auto;margin:0 auto"></p>` : ''}<p style="margin:6px 0;line-height:1.6">Ngân hàng: <strong>${escapeHtml(bankId ?? 'MB')}</strong><br>Số tài khoản: <strong>${escapeHtml(accountNumber ?? 'Xem thông tin tại trang thanh toán')}</strong><br>Chủ tài khoản: <strong>${escapeHtml(accountName || 'Mắc Khén Farm')}</strong><br>Nội dung chuyển khoản: <strong>${orderCode}</strong><br>Số tiền còn phải chuyển: <strong>${amountDue.toLocaleString('vi-VN')}đ</strong></p>`
    : `<p style="margin:18px 0;padding:12px;background:#f8f6f1;line-height:1.6">${input.paymentMethod === 'COD' ? 'Bạn thanh toán khi nhận hàng.' : input.paymentMethod === 'WALLET' ? 'Đơn hàng đã được thanh toán bằng ví nội bộ.' : 'Phương thức thanh toán đã được ghi nhận cho đơn hàng.'}</p>`;
  const walletLine = input.walletAmountSpent ? `<tr><td style="padding:4px 0">Đã dùng ví nội bộ</td><td align="right">−${input.walletAmountSpent.toLocaleString('vi-VN')}đ</td></tr>` : '';
  const html = emailLayout('Xác nhận đơn hàng', `<p style="margin:0 0 12px;line-height:1.6">Xin chào ${customerName}, Mắc Khén Farm đã tiếp nhận đơn <strong>${orderCode}</strong>.</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;font-size:13px"><thead><tr><th align="left" style="padding:8px 6px;border-bottom:2px solid #d6c9b3">Sản phẩm</th><th style="padding:8px 6px;border-bottom:2px solid #d6c9b3">SL</th><th align="right" style="padding:8px 6px;border-bottom:2px solid #d6c9b3">Thành tiền</th></tr></thead><tbody>${rows}</tbody></table><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:12px;font-size:13px"><tr><td style="padding:4px 0">Tạm tính</td><td align="right">${input.subtotal.toLocaleString('vi-VN')}đ</td></tr><tr><td style="padding:4px 0">Vận chuyển</td><td align="right">${input.shippingFee.toLocaleString('vi-VN')}đ</td></tr>${input.discountAmount ? `<tr><td style="padding:4px 0">Ưu đãi</td><td align="right">−${input.discountAmount.toLocaleString('vi-VN')}đ</td></tr>` : ''}${walletLine}<tr><td style="padding:9px 0;border-top:1px solid #ddd;font-size:16px"><strong>Tổng thanh toán</strong></td><td align="right" style="padding:9px 0;border-top:1px solid #ddd;color:#841e1e;font-size:16px"><strong>${(input.totalAmount - (input.walletAmountSpent ?? 0)).toLocaleString('vi-VN')}đ</strong></td></tr></table>${transferBlock}<p style="margin:22px 0;text-align:center"><a href="${escapeHtml(trackingUrl)}" style="display:inline-block;padding:12px 20px;background:#7c1d1d;color:#fff;text-decoration:none;font-weight:bold">Theo dõi đơn hàng</a></p>`);

  return sendEmail({
    toEmail: input.toEmail,
    subject: `[Mắc Khén Farm] Xác nhận đơn hàng ${input.orderCode}`,
    text: `Xin chào ${input.customerName}, đơn ${input.orderCode} đã được tiếp nhận. Tổng thanh toán: ${(input.totalAmount - (input.walletAmountSpent ?? 0)).toLocaleString('vi-VN')}đ. Tra cứu: ${trackingUrl}`,
    html,
  });
}

export async function sendShippingUpdateEmail(input: {
  toEmail: string;
  customerName: string;
  orderCode: string;
  carrier: string;
  trackingCode: string;
}) {
  const orderCode = escapeHtml(input.orderCode);
  const trackingCode = escapeHtml(input.trackingCode);
  const trackingUrl = `${(process.env.NEXT_PUBLIC_APP_URL || 'https://mackhenfarm.vn').replace(/\/+$/, '')}/tra-cuu?orderCode=${encodeURIComponent(input.orderCode)}`;
  const html = emailLayout('Đơn hàng đang trên đường đến bạn', `<p style="margin:0 0 12px;line-height:1.6">Xin chào ${escapeHtml(input.customerName)}, đơn <strong>${orderCode}</strong> đã được bàn giao cho đơn vị vận chuyển.</p><p style="margin:16px 0;padding:14px;background:#f8f6f1;line-height:1.7">Đơn vị: <strong>${escapeHtml(input.carrier)}</strong><br>Mã vận đơn: <strong style="font-size:18px;color:#841e1e">${trackingCode}</strong></p><p style="margin:22px 0;text-align:center"><a href="${escapeHtml(trackingUrl)}" style="display:inline-block;padding:12px 20px;background:#7c1d1d;color:#fff;text-decoration:none;font-weight:bold">Tra cứu hành trình</a></p>`);
  return sendEmail({
    toEmail: input.toEmail,
    subject: `[Mắc Khén Farm] Đơn ${input.orderCode} đang được giao`,
    text: `Đơn ${input.orderCode} đang được giao qua ${input.carrier}. Mã vận đơn: ${input.trackingCode}. Tra cứu: ${trackingUrl}`,
    html,
  });
}

export async function sendReviewRequestEmail(input: {
  toEmail: string;
  customerName: string;
  orderCode: string;
  products: { productName: string; productUrl: string }[];
}) {
  const orderCode = escapeHtml(input.orderCode);
  const products = input.products.map((item) => `<li style="margin:8px 0"><a href="${escapeHtml(item.productUrl)}" style="color:#1b4332;font-weight:bold">${escapeHtml(item.productName)}</a></li>`).join('');
  const html = emailLayout('Bạn thấy mẻ sấy thế nào?', `<p style="margin:0 0 12px;line-height:1.6">Xin chào ${escapeHtml(input.customerName)}, cảm ơn bạn đã nhận đơn <strong>${orderCode}</strong>. Một đánh giá ngắn sẽ giúp khách hàng khác chọn vị phù hợp.</p><ul style="padding-left:20px;line-height:1.5">${products}</ul><p style="color:#78716c;font-size:12px;line-height:1.6">Email này được gửi một lần cho đơn đã giao. Nếu bạn đã đánh giá, vui lòng bỏ qua lời nhắc này.</p>`);
  return sendEmail({
    toEmail: input.toEmail,
    subject: `[Mắc Khén Farm] Mời bạn đánh giá đơn hàng ${input.orderCode}`,
    text: `Xin chào ${input.customerName}, mời bạn chia sẻ cảm nhận về sản phẩm trong đơn ${input.orderCode}: ${input.products.map((item) => `${item.productName} ${item.productUrl}`).join('\n')}`,
    html,
  });
}

export async function sendMarketingOfferEmail(input: { toEmail: string; voucherCode: string; unsubscribeUrl: string }) {
  const voucherCode = escapeHtml(input.voucherCode);
  const storeUrl = `${(process.env.NEXT_PUBLIC_APP_URL || 'https://mackhenfarm.vn').replace(/\/+$/, '')}/products`;
  return sendEmail({
    toEmail: input.toEmail,
    subject: '[Mắc Khén Farm] Ưu đãi dành riêng cho bạn',
    text: `Cảm ơn bạn đã đăng ký nhận tin. Dùng mã ${input.voucherCode} tại ${storeUrl}. Hủy đăng ký: ${input.unsubscribeUrl}`,
    html: emailLayout('Ưu đãi dành cho bạn', `<p style="line-height:1.6">Cảm ơn bạn đã đồng ý nhận tin từ Mắc Khén Farm. Nhập mã dưới đây khi thanh toán để nhận ưu đãi.</p><p style="padding:16px;border:1px dashed #8b1e1e;text-align:center;font-size:22px;font-weight:bold;color:#8b1e1e">${voucherCode}</p><p style="text-align:center"><a href="${escapeHtml(storeUrl)}" style="display:inline-block;padding:12px 20px;background:#7c1d1d;color:#fff;text-decoration:none;font-weight:bold">Khám phá sản phẩm</a></p><p style="font-size:12px;color:#78716c">Không muốn nhận email nữa? <a href="${escapeHtml(input.unsubscribeUrl)}" style="color:#57534e">Hủy đăng ký tại đây</a>.</p>`),
  });
}
