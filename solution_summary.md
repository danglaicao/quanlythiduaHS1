
# Giải pháp Phần mềm Quản lý Thi đua THCS (MVP+)

## Cập nhật mới (V2.5)
1. **Độ chính xác Số thập phân (Decimal Precision)**:
   - Sử dụng hàm tiện ích `roundPoints` để chuẩn hóa tất cả các phép toán về 2 chữ số thập phân.
   - Giải quyết triệt để lỗi làm tròn dấu phẩy động (floating-point arithmetic errors).
   - Hiển thị điểm thi đua trong bảng xếp hạng với định dạng `.toFixed(2)` để đảm bảo sự thống nhất và thẩm mỹ.
2. **Cập nhật Giao diện Quản trị**:
   - Trường nhập điểm trong mục "Vi phạm/Thi đua" hỗ trợ `step="0.01"`.
   - Các bảng danh mục hiển thị giá trị điểm chính xác đến 2 chữ số thập phân.
3. **Quản lý Lớp học & Thi đua (Full CRUD)**:
   - Admin có thể thêm, sửa, xóa các lớp học và hạng mục thi đua.
   - Cơ chế cập nhật (Edit) được tích hợp sẵn với bộ nạp dữ liệu cũ vào form.

## A) Luồng nghiệp vụ & Khóa sổ
- **Dây chuyền Khóa sổ**: Logic `isLocked` kiểm tra trạng thái Tuần, Tháng, Năm.
- **Ghi đè Admin**: Bắt buộc nhập lý do khi thao tác trên dữ liệu đã khóa (Override Audit).

## B) ERD & Kiểu dữ liệu
- **User**: `id`, `name`, `username`, `password`, `phone`, `email`, `role`, `isFirstLogin`.
- **ScoreEntry**: Lưu `studentCount` (int), `points` (float). 

## C) Role Matrix
| Chức năng | Admin | GV Trực Tuần | GV |
|-----------|-------|--------------|----|
| Xem Xếp hạng | ✅ | ✅ | ✅ |
| Nhập điểm (Open) | ✅ | ✅ | ❌ |
| Quản lý danh mục/Thành viên (Full CRUD) | ✅ | ❌ | ❌ |
| Khóa/Mở sổ | ✅ | ❌ | ❌ |
