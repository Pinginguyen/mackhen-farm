import nodemailer from 'nodemailer';

function createEmailTransporter() {
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const password = process.env.SMTP_PASSWORD || process.env.EMAIL_PASS;
  if (!user || !password) throw new Error('SMTP_USER and SMTP_PASSWORD must be configured.');

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user, pass: password },
  });
  return { user, transporter };
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
  const { user, transporter } = createEmailTransporter();
  const escapedLink = resetLink.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  await transporter.sendMail({
    from: `"Mắc Khén Farm" <${user}>`,
    to: toEmail,
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
  const { user, transporter } = createEmailTransporter();
  const orderCode = escapeHtml(input.orderCode);
  const voucherCode = escapeHtml(input.voucherCode);
  const discount = input.discountType === 'PERCENTAGE'
    ? `${input.discountValue}%`
    : `${input.discountValue.toLocaleString('vi-VN')}đ`;
  const storeUrl = `${(process.env.NEXT_PUBLIC_APP_URL || 'https://mackhenfarm.vn').replace(/\/+$/, '')}/san-pham`;
  const escapedStoreUrl = escapeHtml(storeUrl);

  await transporter.sendMail({
    from: `"Mắc Khén Farm" <${user}>`,
    to: input.toEmail,
    subject: `[Mắc Khén Farm] Mã voucher bồi thường cho đơn hàng ${input.orderCode}`,
    text: `Xin lỗi bạn vì sự cố giao sai sản phẩm hoặc chất lượng hàng hóa của đơn ${input.orderCode}. Mắc Khén Farm gửi tặng bạn mã voucher ${input.voucherCode}, giảm ${discount}. Dùng ngay tại cửa hàng: ${storeUrl}`,
    html: `<div style="margin:0;padding:36px 16px;background:#f7f4ed;font-family:Arial,sans-serif;color:#292524"><div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e7e1d8;border-radius:14px;overflow:hidden"><div style="padding:25px 30px;background:#8b1e1e;color:#fff"><p style="margin:0 0 7px;font-size:12px;text-transform:uppercase;color:#f4d8b0">Mắc Khén Farm</p><h1 style="margin:0;font-size:23px">Lời xin lỗi và món quà từ chúng tôi</h1></div><div style="padding:30px"><p style="margin:0 0 16px;line-height:1.65">Xin lỗi bạn vì sự cố giao sai sản phẩm hoặc chất lượng hàng hóa trong đơn <strong>${orderCode}</strong>. Mắc Khén Farm gửi tặng bạn voucher bồi thường để thay lời xin lỗi.</p><p style="margin:20px 0;padding:18px;border:1px dashed #8b1e1e;border-radius:10px;text-align:center"><strong style="display:block;margin-bottom:8px;font-size:13px;color:#57534e">MÃ VOUCHER</strong><span style="font-size:23px;font-weight:700;letter-spacing:1px;color:#8b1e1e">${voucherCode}</span><span style="display:block;margin-top:8px;font-size:15px">Giảm <strong>${discount}</strong></span></p><p style="margin:28px 0;text-align:center"><a href="${escapedStoreUrl}" style="display:inline-block;padding:14px 24px;border-radius:9px;background:#8b1e1e;color:#fff;text-decoration:none;font-size:15px;font-weight:700">Dùng ngay tại cửa hàng</a></p><p style="margin:0;color:#78716c;font-size:12px;line-height:1.6">Cảm ơn bạn đã thông cảm và tiếp tục ủng hộ Mắc Khén Farm.</p></div></div></div>`,
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
  const { user, transporter } = createEmailTransporter();
  const recipient = process.env.SMTP_USER || 'trungchau1210@gmail.com';
  const companyName = escapeHtml(input.companyName);
  const country = escapeHtml(input.country);
  const contactName = escapeHtml(input.contactName);
  const email = escapeHtml(input.email);
  const phone = escapeHtml(input.phone || 'Không cung cấp');
  const expectedVolume = escapeHtml(input.expectedVolume);
  const message = escapeHtml(input.message || 'Không có');

  await transporter.sendMail({
    from: `"Mắc Khén Farm" <${user}>`,
    to: recipient,
    replyTo: input.email,
    subject: '[Mắc Khén Farm] Yêu cầu hợp tác B2B mới',
    text: `Công ty: ${input.companyName}\nQuốc gia: ${input.country}\nNgười liên hệ: ${input.contactName}\nEmail: ${input.email}\nĐiện thoại: ${input.phone || 'Không cung cấp'}\nMOQ dự kiến: ${input.expectedVolume}\nNội dung: ${input.message || 'Không có'}`,
    html: `<div style="font-family:Arial,sans-serif;color:#292524"><h1>Yêu cầu hợp tác B2B mới</h1><p><strong>Công ty:</strong> ${companyName}</p><p><strong>Quốc gia:</strong> ${country}</p><p><strong>Người liên hệ:</strong> ${contactName}</p><p><strong>Email:</strong> ${email}</p><p><strong>Điện thoại:</strong> ${phone}</p><p><strong>MOQ dự kiến:</strong> ${expectedVolume}</p><p><strong>Nội dung:</strong><br>${message.replace(/\n/g, '<br>')}</p></div>`,
  });
}
