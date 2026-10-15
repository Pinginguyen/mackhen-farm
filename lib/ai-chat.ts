export const assistantSystemPrompt = `Bạn là trợ lý AI thông minh và thân thiện của thương hiệu "Mắc Khén Farm - Nông sản sấy vị Tây Bắc".

THÔNG TIN CỐT LÕI:
- Dự án thực phẩm tuần hoàn sinh thái (Upcycled Food), tái sử dụng phụ phẩm bã đậu nành từ xưởng đậu hũ địa phương, kết hợp gia vị rừng Tây Bắc như hạt dổi, mắc khén và mật mía.
- Sản phẩm dai sần sật như thịt bò, có khoảng 20-24g protein/100g, 0% cholesterol; giá thấp hơn khoảng 50% so với thịt bò.
- 4 SKU chính: Mắc Khén Xé Sợi Cay Nồng (150g, 65.000đ), cay tê Tây Bắc; Mắc Khén Miếng Dẻo Tiêu Rừng (150g, 65.000đ), mềm dẻo ngọt thanh; Mắc Khén Cháy Tỏi Giòn Cay (200g, 85.000đ), tỏi phi giòn; Combo Bộ Ba Nhậu Xanh (450g, 169.000đ), đủ 3 vị, Freeship toàn quốc và tặng gói dùng thử.
- Gia vị: Muối Chẳm Chéo hạt dổi (39.000đ), Hạt Dổi nếp (120.000đ), Hạt Mắc Khén (55.000đ), Chẳm Chéo ướt Điện Biên (45.000đ).
- Bảo hành vị giác 24 giờ: đổi gói mới miễn phí nếu xì túi hoặc giao sai; khách không cần gửi trả gói cũ. Giao qua SPX Express/GHTK trong 1-3 ngày.

NGUYÊN TẮC TRẢ LỜI:
- Nhiệt tình, lễ phép; xưng hô "Mắc Khén Farm" và "bạn/quý khách".
- Trả lời trực tiếp đúng câu hỏi ngay ở câu đầu, ngắn gọn dưới 120 từ. Chỉ gợi ý 1-2 sản phẩm liên quan; không tự động liệt kê toàn bộ menu nếu khách không hỏi danh sách.
- Không tự bịa tồn kho, thành phần, chính sách hoặc cam kết ngoài thông tin trên. Không nói đã thêm món vào giỏ nếu chưa thực hiện thao tác đó.
- Nếu được hỏi ngoài chủ đề (chính trị, lập trình, bài tập...), từ chối khéo và hướng cuộc trò chuyện về sản phẩm Mắc Khén Farm.`;

function normalizeVietnamese(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function getKnowledgeReply(question: string): string {
  const normalized = normalizeVietnamese(question);
  const prefix = 'Trợ lý Mắc Khén Farm: ';

  if (/cay|an cay|cay nhieu|cay dam|vi cay/.test(normalized)) {
    return `${prefix}Nếu bạn thích ăn cay đậm vị, Farm gợi ý Mắc Khén Xé Sợi Cay Nồng 150g (65.000đ), vị cay tê Tây Bắc; có thể chấm thêm Chẳm Chéo Ướt Chuẩn Vị Điện Biên (45.000đ) để vị đậm và thơm hơn. Bạn muốn chọn mức cay vừa hay cay đậm?`;
  }
  if (/freeship|mien phi|van chuyen|phi ship|ship/.test(normalized)) {
    return `${prefix}Đơn hàng từ 169.000đ sẽ được miễn phí vận chuyển toàn quốc. Combo Bộ Ba Nhậu Xanh có giá 169.000đ nên đã đủ điều kiện Freeship rồi nhé!`;
  }
  if (/bao hanh|doi tra|doi moi|iu moc|xi tui/.test(normalized)) {
    return `${prefix}Farm bảo hành vị giác trong 24 giờ: nếu sản phẩm bị ỉu mốc hoặc xì túi, bạn được đổi mới 100% và không cần gửi trả gói cũ. Bạn nhớ liên hệ CSKH trong vòng 24 giờ sau khi nhận hàng nha.`;
  }
  if (/gym|tap|protein|dam|calo|cholesterol|kieng|dinh duong/.test(normalized)) {
    return `${prefix}Khô xé sợi có 22g protein thực vật/100g, 0% cholesterol và lượng calo thấp hơn 40% so với khô bò thịt thật. Món này phù hợp để bổ sung đạm khi tập gym hoặc ăn vặt lành mạnh; bạn nhớ cân đối khẩu phần theo chế độ riêng nhé!`;
  }
  if (/combo/.test(normalized)) {
    return `${prefix}Combo Bộ Ba Nhậu Xanh gồm đủ 3 vị, 450g giá 169.000đ, được Freeship toàn quốc và tặng gói dùng thử. Bạn muốn mình mô tả từng vị trong combo không?`;
  }
  if (/gia|bao nhieu/.test(normalized)) {
    return `${prefix}Bạn đang quan tâm món nào để Farm báo đúng giá và quy cách? Nếu thích vị cay, Xé Sợi Cay Nồng 150g hiện có giá 65.000đ.`;
  }
  if (/san pham|menu|danh muc|xe soi|deo|toi/.test(normalized)) {
    return `${prefix}Bạn thích vị cay tê, mềm dẻo ngọt thanh hay tỏi giòn? Farm sẽ gợi ý món phù hợp nhất với khẩu vị của bạn.`;
  }
  if (/nguyen lieu|ba dau|cu nang|mac khen|hat doi|mat mia|san xuat/.test(normalized)) {
    return `${prefix}Sản phẩm tận dụng phụ phẩm bã đậu nành, kết hợp tinh bột củ năng và gia vị Tây Bắc như mắc khén, hạt dổi nướng, mật mía để tạo vị thơm cay đặc trưng.`;
  }
  return `${prefix}Mình có thể tư vấn dinh dưỡng, chọn vị, phí vận chuyển hoặc chính sách đổi mới trong 24 giờ. Bạn muốn tìm hiểu điều nào trước?`;
}