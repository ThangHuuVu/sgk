# SGK

Kho bìa sách giáo khoa Việt Nam, giai đoạn 1980-2026, được biên soạn cho một dự án thị giác và nghiên cứu tư liệu.

Ứng dụng hiển thị các bìa sách trên một khung tranh hữu hạn có thể cuộn theo mọi hướng. Giao diện chính là một lưới lớn, đặt tiêu đề ở trung tâm, kèm công cụ tìm kiếm, phóng to/thu nhỏ và đưa khung nhìn về lại trung tâm.

## Nội dung hiện có

- `metadata.csv`: dữ liệu mô tả từng bìa, gồm tên sách, lớp, môn học, giai đoạn/năm, độ tin cậy ngày tháng, đường dẫn ảnh cục bộ, URL nguồn và ghi chú quyền sử dụng.
- `r2-map.json`: bản đồ từ ảnh gốc sang URL công khai trên Cloudflare R2.
- `r2-variant-map.json`: bản đồ các ảnh WebP tối ưu dùng cho thumbnail và `srcset`.
- `src/lib/covers.js`: file được sinh tự động từ dữ liệu, không chỉnh tay.
- `images/`: ảnh gốc tải về, chỉ dùng cục bộ và không đưa lên Git.
- `generated/r2-images/`: ảnh gốc đã cắt viền trắng để upload lên R2, không đưa lên Git.
- `generated/r2-variants/`: ảnh WebP sinh ra từ ảnh đã cắt viền trắng, không đưa lên Git.

Bộ hiện tại có 823 bìa, bao gồm:

- Một số bìa cũ có mốc năm rõ hơn, như `Học vần` năm 1980 và `Tiếng Việt 1` năm 1990.
- Các sách phổ thông trước 2020 theo chương trình 2002/2006, từ lớp 1 đến lớp 12.
- Các bộ sách theo chương trình GDPT 2018, gồm `Kết nối tri thức với cuộc sống`, `Chân trời sáng tạo`, `Cánh Diều`, `Cùng học để phát triển năng lực`, và `Vì sự bình đẳng và dân chủ trong giáo dục`.
- Các sách chuyên đề học tập và một số mô-đun môn học ở cấp THPT.

## Chạy cục bộ

Cài dependencies:

```bash
npm install
```

Chạy dev server:

```bash
npm run dev
```

Build production:

```bash
npm run build
```

Ứng dụng dùng Svelte + Vite, không dùng SvelteKit.

## Pipeline dữ liệu

Sinh lại dữ liệu app từ `metadata.csv` và các map ảnh:

```bash
npm run prepare:app
```

Sinh ảnh gốc đã cắt viền trắng từ thư mục `images/`:

```bash
npm run images:processed
```

Sinh ảnh WebP tối ưu:

```bash
npm run images:variants
```

Quét các snapshot trong `sources/` để tìm ứng viên bìa mới, chưa đưa vào `metadata.csv`:

```bash
npm run covers:discover
```

Kết quả nằm ở `generated/cover-candidates.json` và `generated/cover-candidates.csv`. Đây là danh sách chờ duyệt, chưa tự động thay đổi kho chính.

Kéo một batch nhỏ ứng viên đã lọc để xem ảnh cục bộ:

```bash
npm run covers:pull
```

Mặc định script chỉ kéo tối đa 40 ảnh có điểm cao vào `generated/candidate-images/` và ghi manifest ở `generated/pulled-cover-candidates.json`.

Upload ảnh gốc lên R2:

```bash
R2_BUCKET=sgk-covers \
R2_PUBLIC_URL="https://assets.sgkarchive.org" \
npm run r2:upload
```

Upload các biến thể WebP lên R2:

```bash
R2_BUCKET=sgk-covers \
R2_PUBLIC_URL="https://assets.sgkarchive.org" \
npm run r2:upload:variants
```

Các script upload có checkpoint qua file map, nên có thể chạy lại nếu bị ngắt giữa chừng.

## Triển khai

Dự án đang hướng tới Cloudflare Pages.

Thiết lập build:

- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: `/`
- Node: `24`

Triển khai thủ công bằng Wrangler:

```bash
npm run cf:deploy
```

Cấu hình Pages nằm trong `wrangler.toml`.

## Ghi chú quyền sử dụng

Các ảnh bìa được thu thập làm tư liệu nghiên cứu và tham khảo thị giác. Quyền sử dụng lại chưa được xác lập rõ ràng cho từng ảnh. Nếu dùng cho triển lãm công khai, in bán, xuất bản hoặc sản phẩm thương mại, cần xác minh quyền với tác giả, nhà xuất bản hoặc đơn vị giữ quyền tương ứng.

## Hướng thu thập tiếp

- Bổ sung thêm sách giai đoạn 1981-2001, đặc biệt các môn `Toán`, `Tập đọc`, `Tiếng Việt`, `Văn`, `Lịch sử`, và `Địa lý`.
- Tìm nguồn chính thức hoặc thư viện cho bộ sách 2002-2019 ở đủ lớp và môn.
- Thay các thumbnail độ phân giải thấp bằng ảnh bìa rõ hơn khi có nguồn đáng tin cậy.
- Chuẩn hóa thêm metadata cho năm phát hành, lần tái bản, nhà xuất bản và bộ sách.
