'use client';

import Link from 'next/link';
import { useLocaleCurrency } from '@/lib/i18n-context';

export default function PrivacyPolicyContent() {
  const { currency } = useLocaleCurrency();
  const isEN = currency === 'SGD';

  return (
    <>
      <p className="eyebrow">{isEN ? 'MẮC KHÉN FARM · LEGAL & PRIVACY' : 'MẮC KHÉN FARM · PHÁP LÝ & QUYỀN RIÊNG TƯ'}</p>
      <h1>{isEN ? 'PERSONAL DATA PROTECTION & INFORMATION SECURITY POLICY' : 'CHÍNH SÁCH BẢO VỆ DỮ LIỆU CÁ NHÂN & AN NINH THÔNG TIN'}</h1>
      <p className="privacy-policy-updated">{isEN ? 'Updated on 03/11/2026' : 'Cập nhật ngày 03/11/2026'}</p>

      <section aria-labelledby="privacy-legal-basis">
        <h2 id="privacy-legal-basis">{isEN ? 'Legal Basis & Scope' : 'Căn cứ và phạm vi'}</h2>
        <p>{isEN
          ? 'This Policy is prepared and applied in accordance with Vietnam’s Law on Electronic Transactions No. 20/2023/QH15, Law on Cybersecurity No. 24/2018/QH14, Decree No. 13/2023/ND-CP on Personal Data Protection, and other applicable laws, including the Law on Personal Data Protection No. 91/2025/QH15 where applicable. Decree No. 13/2023/ND-CP applies to the extent it remains in force and is consistent with current law.'
          : 'Chính sách này được xây dựng và áp dụng phù hợp với Luật Giao dịch điện tử số 20/2023/QH15, Luật An ninh mạng số 24/2018/QH14, Nghị định số 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân và các quy định hiện hành có liên quan, bao gồm Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15 trong phạm vi áp dụng. Nghị định số 13/2023/NĐ-CP được áp dụng trong phạm vi còn hiệu lực và phù hợp với pháp luật hiện hành.'}</p>
        <p>{isEN
          ? 'This Policy explains how Mắc Khén Farm processes personal data when customers place or look up orders, or contact customer support. The specific processing depends on the features used and any statutory retention obligations.'
          : 'Chính sách giải thích cách Mắc Khén Farm xử lý dữ liệu khi khách đặt hàng, tra cứu đơn hoặc liên hệ hỗ trợ. Việc xử lý cụ thể phụ thuộc vào chức năng khách hàng sử dụng và nghĩa vụ lưu trữ theo pháp luật.'}</p>
      </section>

      <section aria-labelledby="privacy-purpose">
        <h2 id="privacy-purpose">{isEN ? '1. Purposes of Data Collection and Usage' : '1. Mục đích thu thập và sử dụng dữ liệu'}</h2>
        <p>{isEN
          ? 'To receive, process and deliver orders, we use the recipient’s name, telephone number and delivery address to confirm the order, coordinate delivery and reconcile fulfillment with the third-party logistics provider (3PL). This information is used only as necessary for these purposes and for order-related after-sales support.'
          : 'Để tiếp nhận và giao đơn hàng, chúng tôi sử dụng họ tên người nhận, số điện thoại và địa chỉ giao hàng nhằm xác nhận đơn, liên hệ giao nhận và đối soát với đơn vị vận chuyển (3PL). Dữ liệu chỉ được dùng cho các mục đích cần thiết này và hỗ trợ sau bán hàng liên quan đến đơn.'}</p>
        <p>{isEN
          ? 'If a customer registers an account, the system uses an email address and password for authentication. Passwords are stored as bcrypt hashes and never as plaintext. Transaction records may be retained as necessary to process payments, maintain accounting records, handle complaints and meet legal obligations.'
          : 'Nếu khách đăng ký tài khoản, hệ thống cần email và mật khẩu để xác thực; mật khẩu được lưu dưới dạng mã băm bcrypt, không lưu dưới dạng văn bản gốc. Dữ liệu giao dịch có thể được lưu trong phạm vi cần thiết để xử lý thanh toán, kế toán, giải quyết khiếu nại và tuân thủ nghĩa vụ pháp lý.'}</p>
        <p>{isEN
          ? 'To understand shopping activity, the system records product-view, add-to-cart and checkout-start events together with a randomly generated session identifier stored in the current browser tab’s sessionStorage. These events do not send the customer’s name, telephone number or address to the analytics API.'
          : 'Để tổng hợp hiệu quả mua sắm, hệ thống ghi nhận sự kiện lượt xem sản phẩm, thêm giỏ và bắt đầu checkout cùng một mã phiên ngẫu nhiên lưu trong sessionStorage của tab hiện tại. Các sự kiện này không gửi họ tên, số điện thoại hoặc địa chỉ đến API thống kê.'}</p>
        <p>{isEN
          ? 'When a customer visits through a KOC or other affiliate referral link, the affiliate code is stored in localStorage for up to 30 days and associated with any resulting order to attribute the referral and reconcile commission. The code does not contain the customer’s contact information.'
          : 'Khi khách truy cập qua liên kết giới thiệu của KOC hoặc đối tác affiliate, mã affiliate được lưu trong localStorage tối đa 30 ngày và gắn với đơn hàng phát sinh để ghi nhận nguồn giới thiệu, đối soát hoa hồng; mã này không chứa thông tin liên hệ của khách.'}</p>
      </section>

      <section aria-labelledby="privacy-security">
        <h2 id="privacy-security">{isEN ? '2. Technical and Organizational Security Measures' : '2. Biện pháp kỹ thuật và tổ chức bảo vệ'}</h2>
        <ul>
          <li>{isEN
            ? 'HTTPS/TLS is used to encrypt data in transit in supported deployment environments. TLS 1.3 is used where supported and negotiated by the hosting platform.'
            : 'HTTPS/TLS được sử dụng để mã hóa dữ liệu truyền tải trong môi trường triển khai hỗ trợ. TLS 1.3 được sử dụng khi nền tảng lưu trữ hỗ trợ và thương lượng phiên bản này.'}</li>
          <li>{isEN
            ? 'Account passwords are hashed with bcrypt using bcryptjs before storage.'
            : 'Mật khẩu tài khoản được băm bằng bcrypt thông qua bcryptjs trước khi lưu.'}</li>
          <li>{isEN
            ? 'Administrative access is restricted by role-based access control (RBAC) to authorized administrator accounts, applying the principle of least privilege.'
            : 'Quyền truy cập quản trị được giới hạn bằng kiểm soát truy cập dựa trên vai trò (RBAC) cho tài khoản quản trị được cấp quyền, theo nguyên tắc đặc quyền tối thiểu.'}</li>
          <li>{isEN
            ? 'Audit Logs record certain important administrative actions to support traceability and review.'
            : 'Audit Logs ghi nhận một số thao tác quản trị quan trọng để hỗ trợ truy vết và kiểm tra.'}</li>
          <li>{isEN
            ? 'Order lookup information is provided only after the order code and ordering telephone number have been checked.'
            : 'Thông tin tra cứu đơn được cung cấp sau khi đối chiếu mã đơn và số điện thoại đặt hàng.'}</li>
        </ul>
        <p>{isEN
          ? 'We apply measures appropriate to the systems currently in use and review them as services or legal requirements change.'
          : 'Chúng tôi áp dụng biện pháp phù hợp với hệ thống hiện có và tiếp tục rà soát khi dịch vụ hoặc yêu cầu pháp luật thay đổi.'}</p>
      </section>

      <section aria-labelledby="privacy-rights">
        <h2 id="privacy-rights">{isEN ? '3. Data Subject Rights' : '3. Quyền của chủ thể dữ liệu'}</h2>
        <p>{isEN
          ? 'Subject to applicable law, customers may request access to or a copy of their personal data, its correction, updating or deletion, and may withdraw consent or object to processing where permitted by law. Mắc Khén Farm will verify each request and respond within the time limits prescribed by law.'
          : 'Khách hàng có thể yêu cầu truy cập hoặc trích xuất, chỉnh sửa, cập nhật hay xóa dữ liệu cá nhân; đồng thời có thể rút lại sự đồng ý hoặc phản đối việc xử lý trong các trường hợp pháp luật cho phép. Mắc Khén Farm sẽ xác minh yêu cầu và phản hồi theo thời hạn luật định.'}</p>
        <p>{isEN
          ? 'Certain transaction records may need to be retained to perform a contract, resolve disputes or meet legal obligations. Where retention is required, we will explain which data cannot yet be deleted and why.'
          : 'Một số thông tin giao dịch có thể phải được lưu giữ để thực hiện hợp đồng, giải quyết tranh chấp hoặc đáp ứng nghĩa vụ pháp lý. Trong trường hợp đó, chúng tôi sẽ giải thích phạm vi dữ liệu chưa thể xóa.'}</p>
        <p>{isEN ? 'Submit a request to ' : 'Gửi yêu cầu đến '}<a href="mailto:trungchau1210@gmail.com">trungchau1210@gmail.com</a>{isEN ? ' or call ' : ' hoặc gọi '}<a href="tel:0762793244">0762.793.244</a>. {isEN
          ? 'Please provide sufficient information to verify your rights in relation to the data. Do not send passwords or verification codes by email.'
          : 'Vui lòng cung cấp thông tin đủ để xác minh quyền đối với dữ liệu; không gửi mật khẩu hoặc mã xác thực qua email.'}</p>
      </section>

      <section aria-labelledby="privacy-sharing">
        <h2 id="privacy-sharing">{isEN ? '4. Confidentiality and Non-disclosure Commitment' : '4. Cam kết bảo mật và không tiết lộ dữ liệu'}</h2>
        <p>{isEN
          ? 'We do not sell personal data or disclose it to third parties for their independent advertising, marketing or commercial exploitation. Data necessary to complete a transaction may be shared with the 3PL, banks or payment providers involved. Technical service providers may process data on our instructions to operate the service. Any other disclosure will be made only with an appropriate legal basis, including the customer’s consent where required, or where required by law.'
          : 'Chúng tôi không bán dữ liệu cá nhân hoặc chia sẻ dữ liệu cho bên thứ ba để họ quảng cáo, tiếp thị hay khai thác thương mại độc lập. Dữ liệu cần thiết chỉ được cung cấp cho đơn vị vận chuyển (3PL), ngân hàng hoặc nhà cung cấp thanh toán để hoàn tất giao dịch; nhà cung cấp kỹ thuật có thể xử lý dữ liệu theo chỉ dẫn của chúng tôi để vận hành dịch vụ. Việc cung cấp khác chỉ thực hiện khi có căn cứ pháp lý phù hợp, bao gồm sự đồng ý của khách hàng khi pháp luật yêu cầu, hoặc theo yêu cầu pháp luật.'}</p>
      </section>

      <p className="privacy-policy-contact">{isEN ? 'Questions about this Policy? ' : 'Câu hỏi về chính sách? '}<Link href="/tra-cuu">{isEN ? 'Contact customer support' : 'Liên hệ bộ phận hỗ trợ khách hàng'}</Link>.</p>
    </>
  );
}