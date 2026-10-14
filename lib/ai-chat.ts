export const assistantSystemPrompt = `Bạn là Trợ lý Mắc Khén Farm, tư vấn thân thiện, trẻ trung bằng tiếng Việt. Chỉ trả lời dựa trên bộ tri thức sau; không tự bịa thông tin, tồn kho hoặc cam kết ngoài chính sách.

Sản phẩm: Khô thực vật làm từ phụ phẩm bã đậu nành, kết hợp tinh bột củ năng và gia vị Tây Bắc gồm mắc khén, hạt dổi nướng, mật mía. Danh mục: Mắc Khén Xé Sợi Cay Nồng 65.000đ; Mắc Khén Miếng Dẻo Tiêu Rừng 65.000đ; Mắc Khén Cháy Tỏi Giòn Cay 85.000đ; Combo Bộ Ba Nhậu Xanh 169.000đ.
Dinh dưỡng: sản phẩm xé sợi chứa 22g protein thực vật/100g, 0% cholesterol, calo thấp hơn 40% so với khô bò thịt thật; phù hợp người tập gym, ăn kiêng và nhậu lành mạnh.
Vận chuyển: đơn từ 169.000đ được miễn phí vận chuyển toàn quốc.
Bảo hành vị giác trong 24 giờ: đổi mới 100% nếu sản phẩm bị ỉu mốc hoặc xì túi; khách không cần gửi trả hàng cũ.
Tự xưng là “Trợ lý Mắc Khén Farm”. Trả lời ngắn gọn, hữu ích; nếu không chắc, nói rõ và hướng khách liên hệ CSKH.`;

function normalizeVietnamese(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function getKnowledgeReply(question: string): string {
  const normalized = normalizeVietnamese(question);
  const prefix = 'Trợ lý Mắc Khén Farm: ';

  if (/freeship|mien phi|van chuyen|phi ship|ship/.test(normalized)) {
    return `${prefix}Đơn hàng từ 169.000đ sẽ được miễn phí vận chuyển toàn quốc. Combo Bộ Ba Nhậu Xanh có giá 169.000đ nên đã đủ điều kiện Freeship rồi nhé!`;
  }
  if (/bao hanh|doi tra|doi moi|iu moc|xi tui/.test(normalized)) {
    return `${prefix}Farm bảo hành vị giác trong 24 giờ: nếu sản phẩm bị ỉu mốc hoặc xì túi, bạn được đổi mới 100% và không cần gửi trả gói cũ. Bạn nhớ liên hệ CSKH trong vòng 24 giờ sau khi nhận hàng nha.`;
  }
  if (/gym|tap|protein|dam|calo|cholesterol|kieng|dinh duong/.test(normalized)) {
    return `${prefix}Khô xé sợi có 22g protein thực vật/100g, 0% cholesterol và lượng calo thấp hơn 40% so với khô bò thịt thật. Món này phù hợp để bổ sung đạm khi tập gym hoặc ăn vặt lành mạnh; bạn nhớ cân đối khẩu phần theo chế độ riêng nhé!`;
  }
  if (/gia|bao nhieu|san pham|menu|danh muc|combo|xe soi|deo|toi/.test(normalized)) {
    return `${prefix}Farm có 4 lựa chọn nè: Xé Sợi Cay Nồng 65.000đ, Miếng Dẻo Tiêu Rừng 65.000đ, Cháy Tỏi Giòn Cay 85.000đ và Combo Bộ Ba Nhậu Xanh 169.000đ. Đơn từ 169.000đ được Freeship toàn quốc.`;
  }
  if (/nguyen lieu|ba dau|cu nang|mac khen|hat doi|mat mia|san xuat/.test(normalized)) {
    return `${prefix}Sản phẩm tận dụng phụ phẩm bã đậu nành, kết hợp tinh bột củ năng và gia vị Tây Bắc như mắc khén, hạt dổi nướng, mật mía để tạo vị thơm cay đặc trưng.`;
  }
  return `${prefix}Mình có thể tư vấn dinh dưỡng, chọn vị, phí vận chuyển hoặc chính sách đổi mới trong 24 giờ. Bạn muốn tìm hiểu điều nào trước?`;
}