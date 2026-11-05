/* Play around — mỗi item: title, src (ảnh đuôi -r.webp; site dùng bản -r-640 cho quả cầu, -r-1280 cho pop-up),
   note (tuỳ chọn, hiện trong pop-up).
   Tuỳ chọn: ar = ép tỉ lệ (vd 1, 1.78, 0.8; ảnh bị cắt kiểu cover), pos:[x,y] = vùng giữ lại khi cắt (0..1).
   Mặc định không có ar → theo đúng tỉ lệ ảnh gốc. Hiện đang là 4 ảnh placeholder lặp lại. */
window.PLAY = [
  {title:"Shot 01",src:"assets/play/ph1-r.webp"},
  {title:"Shot 02",src:"assets/play/ph2-r.webp"},
  {title:"Shot 03",src:"assets/play/ph3-r.webp"},
  {title:"Shot 04",src:"assets/play/ph4-r.webp"},
  {title:"Shot 05",src:"assets/play/ph3-r.webp",ar:1.78,pos:[0.5,0.5]},
  {title:"Shot 06",src:"assets/play/ph1-r.webp",ar:1.0,pos:[0.5,0.15]},
  {title:"Shot 07",src:"assets/play/ph4-r.webp",ar:1.0,pos:[0.5,0.45]},
  {title:"Shot 08",src:"assets/play/ph2-r.webp",ar:1.5,pos:[0.5,0.62]},
  {title:"Shot 09",src:"assets/play/ph3-r.webp",ar:0.56,pos:[0.6,0.5]},
  {title:"Shot 10",src:"assets/play/ph1-r.webp",ar:1.33,pos:[0.5,0.85]},
  {title:"Shot 11",src:"assets/play/ph4-r.webp",ar:1.78,pos:[0.5,0.4]},
  {title:"Shot 12",src:"assets/play/ph2-r.webp",ar:1.0,pos:[0.45,0.5]},
  {title:"Shot 13",src:"assets/play/ph3-r.webp",ar:1.0,pos:[0.5,0.28]},
  {title:"Shot 14",src:"assets/play/ph1-r.webp",ar:0.6,pos:[0.3,0.5]},
  {title:"Shot 15",src:"assets/play/ph4-r.webp",ar:1.33,pos:[0.5,0.55]},
  {title:"Shot 16",src:"assets/play/ph2-r.webp",ar:0.8,pos:[0.7,0.6]},
  {title:"Shot 17",src:"assets/play/ph3-r.webp",ar:1.5,pos:[0.5,0.8]},
  {title:"Shot 18",src:"assets/play/ph1-r.webp",ar:1.78,pos:[0.5,0.3]},
  {title:"Shot 19",src:"assets/play/ph4-r.webp",ar:0.66,pos:[0.5,0.5]},
  {title:"Shot 20",src:"assets/play/ph2-r.webp",ar:1.2,pos:[0.5,0.3]}
];
