import { MessageCircle, Phone } from 'lucide-react';

export default function FloatingContact() {
  const zaloUrl = process.env.NEXT_PUBLIC_SUPPORT_ZALO_URL;
  const phone = process.env.NEXT_PUBLIC_SUPPORT_PHONE?.replace(/[^\d+]/g, '');
  const href = zaloUrl || (phone ? `tel:${phone}` : '/tra-cuu');
  const label = zaloUrl ? 'Zalo CSKH' : phone ? 'Gọi hotline CSKH' : 'Tra cứu và hỗ trợ';

  return <a className="floating-contact" href={href} aria-label={label} title={label} target={zaloUrl ? '_blank' : undefined} rel={zaloUrl ? 'noopener noreferrer' : undefined}>{zaloUrl ? <MessageCircle size={23} /> : phone ? <Phone size={21} /> : <MessageCircle size={23} />}<span>{label}</span></a>;
}