import { NextResponse } from 'next/server';

const batches = {
  'BATCH-KB-2026-01': {
    batchCode: 'BATCH-KB-2026-01',
    productName: 'Khô bò thực vật Mắc Khén Xé Sợi Cay Nồng',
    manufacturingDate: '10/10/2026',
    expiryDate: '10/04/2027',
    packaging: 'Túi zip tráng màng nhôm 3 lớp kèm gói khử oxy',
    steps: [
      { label: 'Nguyên liệu thô', detail: 'Bã đậu nành sạch thu gom từ Cơ sở Đậu Hũ Hiệp Thành (Quận 7, TP.HCM) trong vòng 3.5 giờ sau khi phát sinh; Hạt dổi và hạt mắc khén thu hái tự nhiên từ HTX Nông nghiệp Bản Lướt, Sơn La.' },
      { label: 'Chế biến & Định hình', detail: 'Ép ly tâm khử nước, phối trộn tinh bột củ năng và gia vị bản địa, cán tạo thớ và hấp chín định hình.' },
      { label: 'Sấy dẻo', detail: 'Sấy ở nhiệt độ 60°C trong 10 giờ liên tục, kiểm soát độ ẩm thành phẩm dưới 11.5%.' },
      { label: 'Kiểm nghiệm an toàn', detail: 'Phiếu kiểm nghiệm số 26/ATTP-MKF: Salmonella không phát hiện, E.Coli < 10 CFU/g, kim loại nặng đạt chuẩn QCVN 8-2:2011/BYT.' },
    ],
  },
  'BATCH-CC-2026-02': {
    batchCode: 'BATCH-CC-2026-02',
    productName: 'Chẳm Chéo Ướt Chuẩn Vị Điện Biên',
    manufacturingDate: '12/10/2026',
    expiryDate: '12/10/2027',
    ingredients: 'Ớt thóc tươi, tỏi nếp Điện Biên, rau mùi tàu, mắc khén rang xay thủ công, muối hầm.',
    steps: [
      { label: 'Nguyên liệu thô', detail: 'Ớt thóc tươi, tỏi nếp Điện Biên thu mua từ nông hộ Mường Phăng; Hạt mắc khén & hạt dổi rừng rang thơm từ HTX Bản Lướt, Sơn La; Muối hầm sạch.' },
      { label: 'Phối trộn & Giã tay', detail: 'Nướng thơm tỏi ớt trên than củi, giã nhuyễn thủ công cùng hạt mắc khén và rau mùi tàu theo công thức truyền thống dân tộc Thái.' },
      { label: 'Ủ vị & Chiết rót', detail: 'Ủ cân bằng vị cay nồng tê nhẹ trong 24 giờ, chiết rót tự động vào hũ nắp nhôm 250g, dán màng seal nhiệt ngăn oxy hóa.' },
      { label: 'Kiểm nghiệm an toàn', detail: 'Đạt chuẩn an toàn sinh học QCVN 8-2:2011/BYT. Không phẩm màu, không chất bảo quản nhân tạo. Phiếu kiểm nghiệm vi sinh số 28/ATTP-MKF.' },
    ],
  },
} as const;

export async function GET(_request: Request, { params }: { params: { batchCode: string } }) {
  const batchCode = params.batchCode?.trim().toUpperCase() ?? '';
  const data = batches[batchCode as keyof typeof batches];

  if (!data) {
    return NextResponse.json(
      { success: false, error: 'Mã lô không tồn tại hoặc chưa được phát hành trên hệ thống.' },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true, data }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
}