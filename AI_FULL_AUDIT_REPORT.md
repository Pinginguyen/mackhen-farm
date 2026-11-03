# AI Full Audit Report

- **Thời điểm:** 12:34:46 3/11/2026
- **Base URL:** https://mackhen-farm.vercel.app/
- **Tổng số bước:** 14
- **Pass:** 14 · **Fail:** 0 · **Skip:** 0
- **Tỷ lệ thành công:** 100.0% (Pass / số bước đã chạy, không tính Skip)
- **Độ bao phủ thực thi:** 100.0% số bước trong kế hoạch đã chạy
- **Thời gian phản hồi API trung bình:** 421 ms
- **Giao dịch có ghi DB được cho phép:** Có

## Kết quả theo suite

| # | Suite | Kiểm tra | Kết quả | Thời gian | Chi tiết | Ảnh |
|---:|---|---|---|---:|---|---|
| 1 | Storefront | Hero, Marquee, Before/After và 3D Coverflow | PASS | 2817 ms | Hoàn tất | [mở](tests/artifacts/01-pass.png) |
| 2 | Storefront | Tìm kiếm mắc khén và lọc danh mục | PASS | 3440 ms | Hoàn tất | [mở](tests/artifacts/02-pass.png) |
| 3 | Storefront | Điều hướng từ kết quả đến chi tiết sản phẩm | PASS | 1892 ms | Hoàn tất | [mở](tests/artifacts/03-pass.png) |
| 4 | Cart / Checkout | Thêm giỏ, tiến trình Freeship và số lượng | PASS | 5789 ms | Hoàn tất | [mở](tests/artifacts/04-pass.png) |
| 5 | Cart / Checkout | Checkout, đăng nhập test và xác thực FREESHIP server-side | PASS | 3303 ms | Hoàn tất | [mở](tests/artifacts/05-pass.png) |
| 6 | Cart / Checkout | Đặt đơn VietQR từ form giao hàng | PASS | 833 ms | Hoàn tất | [mở](tests/artifacts/06-pass.png) |
| 7 | Cart / Checkout | QR MB Bank, mã đơn, đồng hồ và thao tác in/Lưu PDF | PASS | 178 ms | Hoàn tất | [mở](tests/artifacts/07-pass.png) |
| 8 | Admin | Đăng nhập Admin | PASS | 2160 ms | Hoàn tất | [mở](tests/artifacts/08-pass.png) |
| 9 | Admin | Kiểm tra các cột tồn kho ATP | PASS | 1479 ms | Hoàn tất | [mở](tests/artifacts/09-pass.png) |
| 10 | Admin | Giả lập VietQR và xác nhận đơn PAID | PASS | 1065 ms | Hoàn tất | [mở](tests/artifacts/10-pass.png) |
| 11 | Admin | Phiếu in có Barcode SVG và checksum SHA-256 | PASS | 455 ms | Hoàn tất | [mở](tests/artifacts/11-pass.png) |
| 12 | Traceability / Legal | Tra cứu mã lô và xác nhận 4 công đoạn chuỗi cung ứng | PASS | 572 ms | Hoàn tất | [mở](tests/artifacts/12-pass.png) |
| 13 | Traceability / Legal | Kiểm tra trang chính sách bảo mật Nghị định 13 | PASS | 479 ms | Hoàn tất | [mở](tests/artifacts/13-pass.png) |
| 14 | Traceability / Legal | Chuyển SGD/English và rà trang chính | PASS | 9793 ms | Hoàn tất | [mở](tests/artifacts/14-pass.png) |

## Khuyến nghị kỹ thuật

- Có 8 lỗi JavaScript trên trang; xem log console của tiến trình audit.

## Cấu hình an toàn

- Browser chạy headful (`headless: false`).
- Mật khẩu chỉ đọc từ biến môi trường `AUDIT_CUSTOMER_PASSWORD` và `AUDIT_ADMIN_PASSWORD`; không ghi vào script hoặc báo cáo.
- Suite tạo đơn/giả lập thanh toán chỉ chạy khi đặt `ALLOW_AUDIT_TRANSACTIONS=1`; production còn cần `ALLOW_PRODUCTION_AUDIT=1`.
- Đơn audit được hủy và hoàn tồn ở bước cleanup khi admin login thành công.
