# Collected Works — Way

## Cấu trúc
```
index.html              trang chính (khung HTML)
assets/css/style.css    toàn bộ style
assets/js/main.js       toàn bộ animation và logic
data/works.js           DỮ LIỆU các work (builder sẽ sửa file này)
assets/works/           ảnh / video của các work
assets/fonts/           Switzer Medium + Regular
assets/img/             noise, ảnh chân dung (Contact)
assets/logos/           logo công ty trong CV
assets/cv.pdf           file CV để tải
admin/                  (bước sau) builder để quản lý work
```

## Chạy thử trên máy
Mở Terminal trong thư mục này rồi chạy một trong hai lệnh:
```
python3 -m http.server 8000      # rồi mở http://localhost:8000
npx serve .                      # nếu máy có Node.js
```

## Một work trong data/works.js
```js
{
  "id": "hq-design",                 // dùng cho link #hq-design
  "title": "HQ.Design", "type": "B2B",
  "services": ["Presentation", "Website"],
  "summary": "Đoạn mô tả ngắn trên card",
  "cover": "assets/works/hq-cover.webp",   // BẮT BUỘC là ảnh (card, loading, hover)
  "coverPosition": "50% 38%",               // tuỳ chọn: vùng cắt của ảnh cover
  "view": "https://…",                      // để trống "" = không hiện nút View work
  "client": "…", "role": "…", "year": "2025",
  "descriptions": [{ "label": "Overview", "text": "…" }],
  "blocks": [ … ]                           // các khối layout, xếp từ trên xuống
}
```

### Các loại khối
| type | Dùng cho | Thuộc tính |
|---|---|---|
| `media` | Ảnh/video full ngang | `bg` (đường dẫn), `aspect` ("16/9", "933/572") |
| `frame` | Khung nền màu/ảnh với mockup đặt bên trong | `aspect`, `color` hoặc `bg`, `shade` (0–1), `items` |
| `row` | 2, 3… khung cạnh nhau (mobile tự xếp dọc) | `cells`: danh sách frame |
| `text` | Khối mô tả có số 01, 02… (tự đếm) | `label`, `text` |

`items` trong frame: `{ "src": "...", "x": 50, "y": 50, "w": 70, "aspect": "16/9", "anchor": "tl" }`
– x, y, w tính theo % khung; mặc định căn theo tâm, `"anchor":"tl"` thì căn theo góc trên trái.

Ảnh và video dùng chung một ô `src`/`bg`: đuôi `.mp4`/`.webm` tự thành video (tự chạy, tắt tiếng, lặp lại).

## Quy cách ảnh / video
- Ảnh: WebP hoặc JPG, cạnh dài 1920px là đủ, nên dưới 500KB.
- Video: MP4 (H.264), không tiếng, 1080p, nên dưới 8MB. Cloudflare Pages giới hạn 25MB mỗi file.
- Video nặng hơn 25MB: để trên Cloudflare R2 (có gói miễn phí) rồi dán link https vào `src`.

## Host lên Cloudflare Pages (miễn phí)
Xem hướng dẫn chi tiết trong tin nhắn đi kèm.
