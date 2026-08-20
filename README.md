# ✝️ Catholic Video Studio Pro

Công cụ tạo video phụng vụ Công Giáo tự động dựa trên [Remotion](https://www.remotion.dev/).
Hỗ trợ tạo phụ đề AI (Whisper), chỉnh sửa trực tiếp và xuất video MP4 chuẩn TikTok 1080×1920.

---

## 1. Cài Đặt

Yêu cầu: **Node.js 20+** và **npm**.

```bash
npm install
```

---

## 2. Khởi Động Studio

Mở **hai cửa sổ terminal**:

### Terminal 1 — Remotion Preview (cổng 3000)
```bash
npm run dev
```

### Terminal 2 — Studio API Server (cổng 3001)
```bash
npm run studio-app
```

Sau đó mở trình duyệt tại: **http://localhost:3001**

> ⚠️ Studio chỉ hoạt động ở `localhost`. Không expose cổng 3001 ra internet.

---

## 3. Quy Trình Tạo Video

### Bước 1 — Nhập Nội Dung
- Chọn **Mùa Phụng Vụ** (tự đổi màu & icon).
- Điền **Ngày, Tên Lễ, Loại Bài Đọc, Trích Đoạn, Câu Trích Dẫn**.

### Bước 2 — Tải Lên File Media
- **Ảnh trung tâm**: `.jpg`, `.png`, `.webp` (tối đa 50 MB).
- **Audio bài đọc**: `.mp3`, `.wav` (tối đa 50 MB).
- **Nhạc dạo vào/ra** (tùy chọn): `.mp3`, `.wav`.
- File được lưu tự động vào `public/` với tên an toàn.

### Bước 3 — Tạo Phụ Đề AI
- Nhấn **⚡ 1-Click Sinh Phụ Đề AI**.
- Whisper sẽ tự động cài model lần đầu (vài phút).
- Sau khi xong, danh sách phụ đề xuất hiện bên dưới.

### Bước 4 — Chỉnh Sửa Phụ Đề _(tùy chọn)_
- Sửa **nội dung chữ** trực tiếp trong ô textarea.
- Điều chỉnh **mốc thời gian** (giây) bằng ô số.
- Dùng `*từ*` hoặc `[từ]` để tô vàng phát sáng trên video.
- Nhấn **💾 Lưu Chỉnh Sửa Phụ Đề** để ghi.

### Bước 5 — Xuất Video MP4
- Nhấn **🎬 1-Click Xuất Video MP4**.
- Quá trình render 1080×1920 chạy vài phút.
- File xuất ra tại: **`public/output.mp4`**.

---

## 4. Sao Lưu & Khôi Phục Dự Án

| Nút | Chức năng |
|-----|-----------|
| 📥 Tải Dự Án (.json) | Xuất toàn bộ metadata + phụ đề ra file JSON |
| 📤 Mở Dự Án (.json) | Nạp lại dự án đã lưu (kể cả phụ đề) |

---

## 5. Nơi Lưu Output

| Thư mục / File | Nội dung |
|----------------|----------|
| `public/output.mp4` | Video MP4 xuất ra cuối cùng |
| `public/upload_*.mp3` | File audio đã upload |
| `public/upload_*.jpg` | File ảnh đã upload |
| `public/subs/*.json` | File phụ đề JSON đã tạo |
| `src/data/today.ts` | Dữ liệu hiện tại của video |

---

## 6. Cấu Hình (Biến Môi Trường)

| Biến | Mặc định | Ý nghĩa |
|------|----------|---------|
| `PORT` | `3001` | Cổng API server |
| `UPLOAD_MAX_MB` | `50` | Kích thước tối đa file upload (MB) |
| `CORS_ORIGIN` | `http://localhost:3001` | Cho phép truy cập cross-origin nếu cần |

Ví dụ:
```bash
PORT=3002 UPLOAD_MAX_MB=100 npm run studio-app
```

---

## 7. Bảo Mật (Giả Định Cục Bộ)

- Server **chỉ lắng nghe trên `127.0.0.1`** (localhost), không expose ra mạng.
- Tất cả tên file upload được tạo tự động — tên gốc từ người dùng **không được lưu**.
- Chỉ chấp nhận file đúng loại: ảnh (`jpeg/png/webp`) và media (`mp3/wav/mp4/mkv/mov/webm`).
- Mọi đường dẫn file được kiểm tra để không vượt ra ngoài thư mục `public/`.

---

## 8. Lệnh Phát Triển

```bash
# Chạy lint & kiểm tra TypeScript
npm run lint

# Chạy automated tests
node --test tests/validate.test.mjs

# Tạo phụ đề thủ công (dòng lệnh)
node sub.mjs public/audio.mp3
```
