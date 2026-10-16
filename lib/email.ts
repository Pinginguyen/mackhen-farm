import nodemailer from 'nodemailer';

function getGmailTransporter() {
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;
  if (!user || !password) throw new Error('SMTP_USER and SMTP_PASSWORD must be configured.');

  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user, pass: password },
  });
}

export async function sendPasswordResetEmail(toEmail: string, resetLink: string) {
  const user = process.env.SMTP_USER;
  const escapedLink = resetLink.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const transporter = getGmailTransporter();
  await transporter.sendMail({
    from: `Mắc Khén Farm <${user}>`,
    to: toEmail,
    subject: '[Mắc Khén Farm] Yêu cầu đặt lại mật khẩu của bạn',
    text: `Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Mở liên kết sau để tạo mật khẩu mới: ${resetLink}\n\nLiên kết chỉ có hiệu lực trong 15 phút. Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email.`,
    html: `<div style="margin:0;padding:36px 16px;background:#f7f4ed;font-family:Arial,sans-serif;color:#292524"><div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e7e1d8;border-radius:14px;overflow:hidden"><div style="padding:25px 30px;background:#8b1e1e;color:#fff"><p style="margin:0 0 7px;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#f4d8b0">Nông sản sấy vị Tây Bắc</p><h1 style="margin:0;font-size:23px">Mắc Khén Farm</h1></div><div style="padding:30px"><h2 style="margin:0 0 12px;font-size:20px;color:#292524">Đặt lại mật khẩu</h2><p style="margin:0;color:#57534e;line-height:1.65">Xin chào, chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản Mắc Khén Farm của bạn. Nhấn nút bên dưới để tiếp tục.</p><p style="margin:28px 0;text-align:center"><a href="${escapedLink}" style="display:inline-block;padding:14px 24px;border-radius:9px;background:#8b1e1e;color:#fff;text-decoration:none;font-size:15px;font-weight:700">Đặt lại mật khẩu ngay</a></p><p style="margin:0;padding:13px 15px;border-radius:8px;background:#fff8e7;color:#75551b;font-size:13px;line-height:1.6">Liên kết này chỉ có hiệu lực trong <strong>15 phút</strong> và chỉ sử dụng một lần.</p><p style="margin:20px 0 0;color:#78716c;font-size:12px;line-height:1.6">Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này. Mật khẩu hiện tại của bạn vẫn được giữ nguyên.</p></div></div></div>`,
  });
}
