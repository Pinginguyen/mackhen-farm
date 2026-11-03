# ADMIN AUDIT REPORT

Chưa có kết quả chạy thực tế. File này sẽ được cập nhật tự động khi chạy `npm run test:admin`.

Suite cần `AUDIT_ADMIN_PASSWORD`; mặc định chạy trên `http://localhost:3000`. Hai bước tạo dữ liệu KOC/voucher chỉ chạy khi bật `ADMIN_AUDIT_ALLOW_MUTATIONS=1`. Khi chạy trên host khác localhost, cần bật thêm `ADMIN_AUDIT_ALLOW_PRODUCTION_MUTATIONS=1`.

Ảnh kiểm thử sẽ được lưu tại `tests/artifacts/admin/`. Báo cáo sau khi chạy sẽ ghi trạng thái, thời gian, thông tin lỗi và liên kết ảnh cho từng phân hệ.