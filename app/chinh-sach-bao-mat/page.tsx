import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Chính sách bảo vệ dữ liệu cá nhân | Mắc Khén Farm',
  description: 'Thông tin về việc thu thập, sử dụng, bảo vệ và thực hiện quyền đối với dữ liệu cá nhân tại Mắc Khén Farm.',
};

export default function PrivacyPolicyPage() {
  return (
    <main className="page-shell">
      <article className="page-card privacy-policy-page">
        <p className="eyebrow">MẮC KHÉN FARM · PHÁP LÝ & QUYỀN RIÊNG TƯ</p>
        <h1>CHÍNH SÁCH BẢO VỆ DỮ LIỆU CÁ NHÂN &amp; AN NINH THÔNG TIN</h1>
        <p className="privacy-policy-updated">Cập nhật ngày 03/11/2026</p>

        <section aria-labelledby="privacy-legal-basis">
          <h2>Căn cứ và phạm vi</h2>
          <p>Chính sách này được xây dựng theo Luật Giao dịch điện tử số 20/2023/QH15, Luật An ninh mạng số 24/2018/QH14, Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15 và các văn bản hướng dẫn đang có hiệu lực. Nghị định số 13/2023/NĐ-CP được áp dụng trong phạm vi còn hiệu lực và phù hợp với quy định hiện hành.</p>
          <p>Chính sách giải thích cách Mắc Khén Farm xử lý dữ liệu khi khách đặt hàng, tra cứu đơn hoặc liên hệ hỗ trợ. Việc xử lý cụ thể còn phụ thuộc vào chức năng khách hàng sử dụng và nghĩa vụ lưu trữ theo pháp luật.</p>
        </section>

        <section aria-labelledby="privacy-purpose">
          <h2 id="privacy-purpose">1. Mục đích thu thập và sử dụng dữ liệu</h2>
          <p>Để tiếp nhận và giao đơn hàng, chúng tôi sử dụng họ tên người nhận, số điện thoại và địa chỉ giao hàng nhằm xác nhận đơn, liên hệ giao nhận và đối soát với đơn vị vận chuyển (3PL). Dữ liệu chỉ được dùng cho các mục đích cần thiết này và hỗ trợ sau bán hàng liên quan đến đơn.</p>
          <p>Nếu khách đăng ký tài khoản, hệ thống cần email và mật khẩu để xác thực; mật khẩu được lưu dưới dạng mã băm, không lưu dưới dạng văn bản gốc. Dữ liệu giao dịch có thể được lưu trong phạm vi cần thiết để xử lý thanh toán, kế toán, giải quyết khiếu nại và tuân thủ nghĩa vụ pháp lý.</p>
          <p>Để tổng hợp hiệu quả mua sắm, hệ thống ghi nhận sự kiện lượt xem sản phẩm, thêm giỏ và bắt đầu checkout cùng một mã phiên ngẫu nhiên lưu trong sessionStorage của tab hiện tại. Các sự kiện này không gửi họ tên, số điện thoại hoặc địa chỉ đến API thống kê.</p>
          <p>Khi khách truy cập liên kết có mã giới thiệu, mã affiliate được lưu trong localStorage tối đa 30 ngày và gắn với đơn hàng phát sinh để ghi nhận nguồn giới thiệu, đối soát hoa hồng; mã này không chứa thông tin liên hệ của khách.</p>
        </section>

        <section aria-labelledby="privacy-security">
          <h2 id="privacy-security">2. Biện pháp kỹ thuật và tổ chức bảo vệ</h2>
          <ul>
            <li>Kết nối HTTPS/TLS được sử dụng trên môi trường triển khai hỗ trợ; phiên bản TLS phụ thuộc cấu hình của nền tảng lưu trữ.</li>
            <li>Mật khẩu tài khoản được băm bằng bcrypt thông qua bcryptjs trước khi lưu.</li>
            <li>Audit Logs ghi nhận một số thao tác quản trị quan trọng để hỗ trợ truy vết và kiểm tra.</li>
            <li>Thông tin tra cứu đơn được cung cấp sau khi đối chiếu mã đơn và số điện thoại đặt hàng.</li>
          </ul>
          <p>Chúng tôi áp dụng biện pháp phù hợp với hệ thống hiện có và tiếp tục rà soát khi dịch vụ hoặc yêu cầu pháp luật thay đổi.</p>
        </section>

        <section aria-labelledby="privacy-rights">
          <h2 id="privacy-rights">3. Quyền của chủ thể dữ liệu</h2>
          <p>Khách hàng có thể yêu cầu truy cập hoặc trích xuất, chỉnh sửa, cập nhật hay xóa dữ liệu cá nhân; đồng thời có thể rút lại sự đồng ý hoặc phản đối việc xử lý trong các trường hợp pháp luật cho phép. Mắc Khén Farm sẽ xác minh yêu cầu và phản hồi theo thời hạn luật định.</p>
          <p>Một số thông tin giao dịch có thể phải được lưu giữ để thực hiện hợp đồng, giải quyết tranh chấp hoặc đáp ứng nghĩa vụ pháp lý. Trong trường hợp đó, chúng tôi sẽ giải thích phạm vi dữ liệu chưa thể xóa.</p>
          <p>Gửi yêu cầu đến <a href="mailto:trungchau1210@gmail.com">trungchau1210@gmail.com</a> hoặc gọi <a href="tel:0762793244">0762.793.244</a>. Vui lòng cung cấp thông tin đủ để xác minh quyền đối với dữ liệu; không gửi mật khẩu hoặc mã xác thực qua email.</p>
        </section>

        <section aria-labelledby="privacy-sharing">
          <h2 id="privacy-sharing">4. Chia sẻ và cam kết sử dụng dữ liệu</h2>
          <p>Chúng tôi không bán dữ liệu cá nhân hoặc chia sẻ dữ liệu cho bên thứ ba để họ quảng cáo, tiếp thị hay khai thác thương mại độc lập. Dữ liệu cần thiết chỉ được cung cấp cho đơn vị vận chuyển (3PL), ngân hàng hoặc nhà cung cấp thanh toán để hoàn tất giao dịch; nhà cung cấp kỹ thuật có thể xử lý dữ liệu theo chỉ dẫn của chúng tôi để vận hành dịch vụ. Việc cung cấp khác chỉ thực hiện khi có sự đồng ý phù hợp hoặc theo yêu cầu pháp luật.</p>
        </section>

        <p className="privacy-policy-contact">Câu hỏi về chính sách? <Link href="/tra-cuu">Liên hệ bộ phận hỗ trợ khách hàng</Link>.</p>
      </article>
    </main>
  );
}