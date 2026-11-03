# ADMIN AUDIT REPORT

- **Thời điểm chạy:** 13:08:10 3/11/2026
- **Môi trường:** https://mackhen-farm.vercel.app/
- **Kết quả:** 5/10 PASS · 3 FAIL · 2 SKIP
- **Tài khoản Admin:** admin@mackhenfarm.vn
- **Trình duyệt:** Chromium headed (headless: false)
- **Mutation test:** Tắt; các bước tạo dữ liệu sẽ SKIP

## Kết quả từng phân hệ

| # | Phân hệ | Trạng thái | Thời gian | Chi tiết | Ảnh kiểm thử |
|---:|---|---|---:|---|---|
| 1 | Khởi tạo trình duyệt và đăng nhập Admin | **PASS** | 3855 ms | Đăng nhập thành công và được chuyển tới /admin/dashboard. | — |
| 2 | Dashboard tổng quan | **PASS** | 477 ms | Đã tìm thấy 3/3 nhóm chỉ số cơ bản; chấp nhận dashboard không có thẻ Khách hàng. | [tests/artifacts/admin/01_dashboard.png](tests/artifacts/admin/01_dashboard.png) |
| 3 | Quản lý đơn hàng | **FAIL** | 516 ms | Không có đơn VietQR đang chờ để kiểm tra nút Giả lập Quét VietQR. | [tests/artifacts/admin/02_orders.png](tests/artifacts/admin/02_orders.png) |
| 4 | Đối tác KOC / Affiliate | **SKIP** | 227 ms | Tạo KOC ghi dữ liệu bền vững và gửi email đặt mật khẩu; bật ADMIN_AUDIT_ALLOW_MUTATIONS=1 để chạy bước này. | [tests/artifacts/admin/03_affiliates_created.png](tests/artifacts/admin/03_affiliates_created.png) |
| 5 | Sản phẩm và dữ liệu kho | **PASS** | 2794 ms | Danh sách có 8 sản phẩm; Giá, Tồn kho và Mô tả đã được nạp. | [tests/artifacts/admin/04_products.png](tests/artifacts/admin/04_products.png) |
| 6 | Tồn kho thời gian thực ATP | **PASS** | 1355 ms | Ba cột Tồn thực tế, Đang giữ trong đơn và Khả dụng bán (ATP) hiển thị. | [tests/artifacts/admin/05_inventory_atp.png](tests/artifacts/admin/05_inventory_atp.png) |
| 7 | Quản lý voucher | **SKIP** | 1548 ms | Tạo voucher ghi dữ liệu vào database; bật ADMIN_AUDIT_ALLOW_MUTATIONS=1 để chạy bước này. | [tests/artifacts/admin/06_vouchers.png](tests/artifacts/admin/06_vouchers.png) |
| 8 | Đổi trả và bảo hành | **FAIL** | 2163 ms | Trang đổi trả báo lỗi khi tải dữ liệu; không xem lỗi API là Empty State. | [tests/artifacts/admin/07_returns.png](tests/artifacts/admin/07_returns.png) |
| 9 | Đối soát ngân hàng | **PASS** | 697 ms | Đã kiểm tra 5 giao dịch và trạng thái payment evidence; không kích hoạt đối soát hoặc hoàn tiền. | [tests/artifacts/admin/08_reconciliation.png](tests/artifacts/admin/08_reconciliation.png) |
| 10 | Phễu CRO và giám sát APM | **FAIL** | 1198 ms | Không tìm thấy widget Neon PostgreSQL. | [tests/artifacts/admin/09_cro_funnel.png](tests/artifacts/admin/09_cro_funnel.png)<br>[tests/artifacts/admin/10_apm_monitoring.png](tests/artifacts/admin/10_apm_monitoring.png) |

## Vấn đề cần xử lý

- Bước 03 (Quản lý đơn hàng): FAIL — Không có đơn VietQR đang chờ để kiểm tra nút Giả lập Quét VietQR.
- Bước 04 (Đối tác KOC / Affiliate): SKIP — Tạo KOC ghi dữ liệu bền vững và gửi email đặt mật khẩu; bật ADMIN_AUDIT_ALLOW_MUTATIONS=1 để chạy bước này.
- Bước 07 (Quản lý voucher): SKIP — Tạo voucher ghi dữ liệu vào database; bật ADMIN_AUDIT_ALLOW_MUTATIONS=1 để chạy bước này.
- Bước 08 (Đổi trả và bảo hành): FAIL — Trang đổi trả báo lỗi khi tải dữ liệu; không xem lỗi API là Empty State.
- Bước 10 (Phễu CRO và giám sát APM): FAIL — Không tìm thấy widget Neon PostgreSQL.
- Lỗi JavaScript phía trình duyệt: Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- Lỗi JavaScript phía trình duyệt: Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- Lỗi JavaScript phía trình duyệt: Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- Lỗi JavaScript phía trình duyệt: Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- Lỗi JavaScript phía trình duyệt: Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- Lỗi JavaScript phía trình duyệt: Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- Lỗi JavaScript phía trình duyệt: Minified React error #418; visit https://react.dev/errors/418 for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- Lỗi JavaScript phía trình duyệt: Minified React error #423; visit https://react.dev/errors/423 for the full message or use the non-minified dev environment for full errors and additional helpful warnings.

## Dọn dữ liệu kiểm thử

- Không tạo dữ liệu cần dọn trong lần chạy này.

## Điều kiện và giới hạn

- Mật khẩu chỉ được đọc từ `AUDIT_ADMIN_PASSWORD`; script không chứa mật khẩu mặc định và không ghi mật khẩu vào báo cáo.
- Mặc định dùng `http://localhost:3000`. Dùng `ADMIN_AUDIT_BASE_URL` để chọn môi trường khác.
- Tạo KOC/voucher cần `ADMIN_AUDIT_ALLOW_MUTATIONS=1`; với host không phải localhost cần thêm `ADMIN_AUDIT_ALLOW_PRODUCTION_MUTATIONS=1`.
- KOC test dùng email miền `.invalid`; sau khi xác minh, tài khoản được tạm khóa nhưng bản ghi Affiliate được giữ lại vì API hiện không có chức năng xóa.
- Mã tài khoản ngân hàng nhập là `99998888`; API hiện chỉ chấp nhận chữ số, khoảng trắng và dấu gạch nối, không chấp nhận chuỗi `MB Bank` trong trường số tài khoản.
- Số liệu APM/độ trễ được đánh giá theo giá trị thực tế lúc chạy, không giả định luôn là 12 ms.
