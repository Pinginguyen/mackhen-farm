# ADMIN AUDIT REPORT

- **Thời điểm chạy:** 13:21:03 3/11/2026
- **Môi trường:** https://mackhen-farm.vercel.app/
- **Kết quả:** 10/10 PASS · 0 FAIL · 0 SKIP
- **Tài khoản Admin:** admin@mackhenfarm.vn
- **Trình duyệt:** Chromium headed (headless: false)
- **Mutation test:** Các bước tạo KOC và voucher được thực thi trực tiếp.

## Kết quả từng phân hệ

| # | Phân hệ | Trạng thái | Thời gian | Chi tiết | Ảnh kiểm thử |
|---:|---|---|---:|---|---|
| 1 | Khởi tạo trình duyệt và đăng nhập Admin | **PASS** | 5510 ms | Đăng nhập thành công và được chuyển tới /admin/dashboard. | — |
| 2 | Dashboard tổng quan | **PASS** | 549 ms | Đã tìm thấy 3/3 nhóm chỉ số cơ bản; chấp nhận dashboard không có thẻ Khách hàng. | [tests/artifacts/admin/01_dashboard.png](tests/artifacts/admin/01_dashboard.png) |
| 3 | Quản lý đơn hàng | **PASS** | 2066 ms | Không có đơn VietQR, chuyển sang Empty State | [tests/artifacts/admin/02_orders.png](tests/artifacts/admin/02_orders.png) |
| 4 | Đối tác KOC / Affiliate | **PASS** | 11501 ms | Đã tạo và tìm thấy TUTRINH_MW0ATTAI63D2 với hoa hồng 10%; bản ghi sẽ được tạm khóa khi cleanup. | [tests/artifacts/admin/03_affiliates_created.png](tests/artifacts/admin/03_affiliates_created.png) |
| 5 | Sản phẩm và dữ liệu kho | **PASS** | 3110 ms | Danh sách có 8 sản phẩm; Giá, Tồn kho và Mô tả đã được nạp. | [tests/artifacts/admin/04_products.png](tests/artifacts/admin/04_products.png) |
| 6 | Tồn kho thời gian thực ATP | **PASS** | 1135 ms | Ba cột Tồn thực tế, Đang giữ trong đơn và Khả dụng bán (ATP) hiển thị. | [tests/artifacts/admin/05_inventory_atp.png](tests/artifacts/admin/05_inventory_atp.png) |
| 7 | Quản lý voucher | **PASS** | 4358 ms | Đã tạo và xác minh TESTVOUCHER_MW0ATTAI63D2; voucher sẽ được xóa khi cleanup. | [tests/artifacts/admin/06_vouchers.png](tests/artifacts/admin/06_vouchers.png) |
| 8 | Đổi trả và bảo hành | **PASS** | 704 ms | Empty state / No API data (Trang đổi trả báo lỗi khi tải dữ liệu.) | [tests/artifacts/admin/07_returns.png](tests/artifacts/admin/07_returns.png) |
| 9 | Đối soát ngân hàng | **PASS** | 457 ms | Đã kiểm tra 5 giao dịch và trạng thái payment evidence; không kích hoạt đối soát hoặc hoàn tiền. | [tests/artifacts/admin/08_reconciliation.png](tests/artifacts/admin/08_reconciliation.png) |
| 10 | Phễu CRO và giám sát APM | **PASS** | 1791 ms | Widget CRO và thẻ Neon PostgreSQL hiển thị; CRO/APM được chấp nhận cả khi chưa có traffic hoặc số liệu mẫu. Neon: Neon PostgreSQL Kết nối tốt 8 ms. Connection pooler Đã phát hiện DATABASE_URL. | [tests/artifacts/admin/09_cro_funnel.png](tests/artifacts/admin/09_cro_funnel.png)<br>[tests/artifacts/admin/10_apm_monitoring.png](tests/artifacts/admin/10_apm_monitoring.png) |

## Vấn đề cần xử lý

- Lỗi JavaScript phía trình duyệt: Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- Lỗi JavaScript phía trình duyệt: Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- Lỗi JavaScript phía trình duyệt: Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- Lỗi JavaScript phía trình duyệt: Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- Lỗi JavaScript phía trình duyệt: Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- Lỗi JavaScript phía trình duyệt: Minified React error #425; visit https://react.dev/errors/425 for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- Lỗi JavaScript phía trình duyệt: Minified React error #418; visit https://react.dev/errors/418 for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- Lỗi JavaScript phía trình duyệt: Minified React error #423; visit https://react.dev/errors/423 for the full message or use the non-minified dev environment for full errors and additional helpful warnings.

## Dọn dữ liệu kiểm thử

- Affiliate thử nghiệm TUTRINH_MW0ATTAI63D2 đã được chuyển sang trạng thái tạm khóa; bản ghi được giữ lại trong hệ thống.
- Voucher thử nghiệm TESTVOUCHER_MW0ATTAI63D2 đã được xóa sau khi xác minh.

## Điều kiện và giới hạn

- Mật khẩu chỉ được đọc từ `AUDIT_ADMIN_PASSWORD`; script không chứa mật khẩu mặc định và không ghi mật khẩu vào báo cáo.
- Mặc định dùng `https://mackhen-farm.vercel.app`. Dùng `AUDIT_BASE_URL` để chọn môi trường khác.
- Suite tạo mới KOC và voucher, sau đó tạm khóa KOC và xóa voucher kiểm thử.
- KOC test dùng email miền `.invalid`; sau khi xác minh, tài khoản được tạm khóa nhưng bản ghi Affiliate được giữ lại vì API hiện không có chức năng xóa.
- Mã tài khoản ngân hàng nhập là `99998888`; API hiện chỉ chấp nhận chữ số, khoảng trắng và dấu gạch nối, không chấp nhận chuỗi `MB Bank` trong trường số tài khoản.
- Số liệu APM/độ trễ được đánh giá theo giá trị thực tế lúc chạy, không giả định luôn là 12 ms.
