# Collected Works — portfolio của Way (waydesigner.com)

## Quy tắc làm việc (bắt buộc)
- Trả lời bằng tiếng Việt, ngắn gọn, thẳng.
- **Hỏi trước khi làm.** Mỗi lần chỉ làm 1 việc nhỏ đã được đồng ý. Không tự refactor, không tự "dọn code", không đọc toàn bộ repo nếu không cần.
- Trước khi sửa: nói rõ sẽ sửa file nào, đoạn nào, vì sao. Sửa xong: nói cách kiểm tra.
- Luôn `git pull` trước khi sửa — builder (/admin) commit thẳng lên repo.
- **Không sửa `data/works.js` bằng tay** trừ khi được yêu cầu: file này do builder quản lý (nội dung các work).

## Hạ tầng
- Host: Cloudflare Pages (project `way-portfolio`), tự deploy khi push lên nhánh `main`. Build command `exit 0`, không có bước build.
- Tên miền: waydesigner.com + www (mua ở Cloudflare). Bản dự phòng: way-portfolio.pages.dev.
- Form liên hệ: Web3Forms (gửi JSON tới api.web3forms.com, key nằm trong main.js) → daodinhvu2311@gmail.com.
- Thư viện: GSAP 3.13 + ScrambleTextPlugin + SplitText từ jsDelivr. Font Switzer Medium/Regular (assets/fonts).

## Cấu trúc
```
index.html            khung HTML (trang chủ, các pop-up Contact / CV, menu mobile)
404.html              trang 404 độc lập (canvas grid split trên chữ 404)
assets/css/style.css  toàn bộ style
assets/js/main.js     toàn bộ logic & animation (một IIFE lớn)
data/works.js         window.WORKS = [...]  — dữ liệu các work (builder ghi)
admin/index.html      builder: đăng nhập bằng GitHub fine-grained token, commit qua GitHub API
assets/works/         ảnh/video các work (tên file có mã thời gian, không đổi)
_headers              cache dài cho assets/works, fonts
```

## Cách site chạy (main.js)
- Card work được render từ `window.WORKS` lúc tải trang; pop-up chi tiết render khi mở (`renderDetail`).
- Loader: ảnh các card hiện dạng tile scramble rồi bay về vị trí card (giới hạn ~4s).
- Hover card (desktop): hiệu ứng "grid split" vẽ trên canvas 12×7 ô.
- Pop-up desktop: panel trượt từ dưới + ảnh cover bay vào slot hero. Mobile (≤800px): trượt từ phải, có nút more/less cố định ở góc phải trên.
- Màu nền tuỳ chọn (nút Color) lưu localStorage `way-bg`.
- Intro: chỉ kiểu Scramble; chỉ 2 work đầu có animation.

## Dữ liệu một work
`id, title, type, services[], summary, cover (bắt buộc là ẢNH), coverPosition?, view (để "" = ẩn nút View work), client, role, year, descriptions[{label,text}], blocks[]`
Block:
- `{"type":"layout","layout":"full|half-45-169|half-45|bento|three-46","swap":bool,"items":[src,...]}` — ô có tỉ lệ cố định, ảnh `object-fit:cover`, gap 20px (mobile 12px, xếp dọc).
- `{"type":"text","label","text"}` — khối số 01, 02… (CSS counter).
- Kiểu cũ `media/frame/row` vẫn render được (tương thích ngược).
Đuôi `.mp4/.webm` → video (muted, loop, autoplay).

## Ảnh 3 cỡ
Builder lưu mỗi ảnh thành `ten-r.webp` (≤1920px), `ten-r-1280.webp`, `ten-r-640.webp`. Site tự tạo `srcset` cho file đuôi `-r.webp`.
**Lưu ý quan trọng:** với srcset, `img.naturalWidth` bị "density-corrected" (không phải số pixel thật). Mọi chỗ vẽ ảnh lên canvas phải dùng `pxOf(img)` / `pxReady(img)` (bản Image không srcset) — đã sửa trong hover grid split và loader. Đây từng là lỗi "ảnh bị zoom".

## Quy cách media (khuyến nghị)
- Ảnh WebP: cỡ 1920px nên 200–400KB (ảnh nhiều grain có thể hơn). 800–900KB là nặng. Builder tự nén lại ảnh mới tải lên ở chất lượng 82%.
- Kích thước xuất từ Figma (khung 1920, gap 20): full 1920×1080; nửa 4:5 950×1188; nửa 16:9 950×534; bento ô nhỏ 950×584; 3 cột 4:6 627×940.
- Video: MP4 H.264, bỏ audio, Web Optimized; ô 4:5 ~930px ngang ~1000–1400 kbps; full 1920×1080 ~2500–4000 kbps. Giới hạn Cloudflare Pages: 25MB/file.

## Lịch sử / đã thử và revert
- "smooth" (hoãn tải video tới khi pop-up mở xong + giới hạn 2 video chạy cùng lúc): Mai thấy lag hơn → đã revert về bản "speed".
- Work Protocol có 7 video → mở bị giật hơn các work khác. Chưa giải quyết; hướng đang cân nhắc: nén nhỏ video (giảm kích thước/bitrate) trước khi sửa code.

## Việc còn mở
- Protocol giật khi mở (xem trên).
- Cloudflare Email Address Obfuscation nên tắt (nếu chưa) — nó đổi email trong trang thành [email protected].
- Gia hạn GitHub token của builder trước 29/01/2027.
