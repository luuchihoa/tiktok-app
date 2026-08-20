# [ANTIGRAVITY TASK]

## Mục tiêu

Hoàn tất nghiệm thu Catholic Video Studio: khắc phục lỗi định dạng còn lại và thực hiện manual QA cho studio sau đợt hardening/reliability upgrade.

## Phạm vi được sửa

- `src/Root.tsx` — chỉ sửa whitespace/dòng trống cuối tệp.
- Chỉ khi manual QA phát hiện lỗi: `server.mjs`, `validation.mjs`, `public/studio.html`, hoặc `src/WebDashboard.tsx`.
- `tests/validate.test.mjs` — chỉ cập nhật nếu phải bổ sung regression test cho lỗi thực tế.

## Yêu cầu

- Giữ nguyên mọi chức năng hiện có ngoài phạm vi.
- Không thêm dữ liệu bí mật/khóa vào mã nguồn.
- Không đổi cấu hình triển khai, dependency, hoặc giao diện nếu không có lỗi được xác nhận.
- Không sửa/xóa các file và asset do người dùng đang có trong worktree.
- Không commit hoặc push.

## Tiêu chí hoàn thành

1. `git diff --check` không in lỗi whitespace.
2. `npm run lint` và `npm test` đều exit 0.
3. Chạy `npm run studio-app`, mở `http://localhost:3001`, và xác nhận:
   - Trang studio tải được; không có lỗi console mức error.
   - Chỉnh trường văn bản tự lưu sau debounce.
   - Subtitle có chuỗi `<img src=x onerror=alert(1)>` hiển thị nguyên văn, không thực thi.
   - Upload tệp sai loại nhận lỗi; upload hợp lệ vẫn hoạt động.
   - Nút tạo phụ đề/render không tạo hai job song song.
4. Báo lại tệp đã sửa, kết quả các lệnh, và kết quả từng mục manual QA. Nếu không thể chạy mục nào, nêu rõ nguyên nhân thay vì đánh dấu pass.

## Xác minh bắt buộc

```bash
git diff --check
npm run lint
npm test
npm run studio-app
```

# [/ANTIGRAVITY TASK]
