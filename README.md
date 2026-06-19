# 🎮 Poké-Quiz — だれだ？このポケモン (Who's That Pokémon?)

Web Game (PWA) đoán bóng Pokémon dành cho trẻ em (lớp 2, Nhật Bản). Hiển thị bóng đen
một Pokémon, bé chọn đúng tên **tiếng Nhật (Katakana)** trong 4 đáp án. Dữ liệu hình ảnh và
tên lấy trực tiếp từ **PokéAPI**.

> Giao diện 100% tiếng Nhật cho bé · Mã nguồn & chú thích tiếng Việt cho người maintain.

---

## ✨ Tính năng

| Nhóm | Mô tả |
|------|------|
| 🗺️ Bản đồ thám hiểm | 4 vùng đất (Kanto → Johto → Hoenn → Sinnoh) dạng đường mòn, có chấm "📍 いまここ", đường gạch nối, hiệu ứng vùng mới **bừng sáng** khi mở khóa |
| 🔒 Mở khóa tiến trình | Bắt đủ **50 con** ở vùng trước để mở vùng sau |
| 🎯 Đoán bóng | Ảnh silhouette (`filter: brightness(0)`) → chọn đúng thì hiện màu mượt mà |
| ✨ Shiny Hunter | 10% mỗi câu ra Shiny (ảnh shiny + viền lấp lánh), lưu riêng `shinyPokedex` |
| 📕 Pokédex | Bộ sưu tập theo vùng; ô chưa bắt là bóng đen + `No.001`, đã bắt hiện ảnh + tên; Shiny có viền vàng + ⭐ |
| 🎖️ Trainer Rank | Danh hiệu theo tổng số bắt được + thanh % hoàn thành Zukan |
| 📜 Nhiệm vụ Giáo sư Oak | 2 nhiệm vụ ngẫu nhiên mỗi ngày, thưởng 🍬 50 kẹo |
| 🧠 Siêu Quiz | Sinh câu hỏi **vô hạn** (Hệ / Số thứ tự / So cân nặng), phạm vi theo vùng đã mở |
| 🔊 Text-to-Speech | Đọc tên Pokémon bằng `ja-JP` qua `speechSynthesis` |
| 💾 Local Storage | Tự lưu/đọc tiến trình; **tự migrate v2 → v3** |
| 📲 PWA Offline | Cài lên màn hình chính iPad/iPhone, cache ảnh đã xem để chơi không cần mạng |

---

## 📁 Cấu trúc thư mục

```
.
├── index.html          # Khung HTML (Home / Game / Quiz) + link css, js, manifest
├── manifest.json       # Khai báo PWA (tên, icon, theme, start_url)
├── sw.js               # Service Worker (chiến lược cache offline)
├── README.md           # Tài liệu này
├── css/
│   └── style.css       # Toàn bộ giao diện & animation
├── js/                 # Mã nguồn tách module (nạp theo thứ tự phụ thuộc)
│   ├── config.js       #  Hằng số, REGIONS, TYPE_JP, MISSION_POOL, biến runtime, shuffle()
│   ├── dom.js          #  Tham chiếu phần tử DOM
│   ├── state.js        #  Local Storage, MIGRATE v2→v3, nhiệm vụ, danh hiệu, mở khóa, TTS
│   ├── api.js          #  Gọi PokéAPI (tên tiếng Nhật + chi tiết hệ/cân nặng)
│   ├── game.js         #  Home/Bản đồ, điều hướng màn, vòng chơi đoán bóng + Shiny, Pokédex
│   ├── quiz.js         #  Siêu Quiz: sinh câu hỏi vô hạn (3 dạng)
│   └── main.js         #  Gắn sự kiện, khởi động, đăng ký Service Worker
└── icons/
    ├── icon-512.png    # Icon PWA 512×512
    ├── icon-192.png    # Icon PWA 192×192
    └── icon-180.png    # apple-touch-icon (iOS)
```

> ⚠️ Các file JS là **classic script** (không phải ES module), dùng chung global scope và
> **phải nạp đúng thứ tự** như trong `index.html`: `config → dom → state → api → game → quiz → main`.

---

## ▶️ Cách chạy

### 1. Chơi nhanh (không có offline)
Mở thẳng `index.html` bằng Safari/Chrome. Game chạy bình thường, **chỉ riêng PWA/offline
không kích hoạt** (Service Worker không chạy trên giao thức `file://`).

### 2. Chạy qua server cục bộ (bật được PWA offline)
```bash
cd <thư-mục-này>
python3 -m http.server 8000
```
Mở `http://localhost:8000` (hoặc `http://<IP-máy>:8000` để truy cập từ iPad cùng mạng Wi-Fi).

### 3. Cài lên màn hình chính iPad/iPhone
1. Mở app bằng **Safari** qua địa chỉ `http(s)://…` (bước 2 hoặc một host tĩnh).
2. Bấm **Chia sẻ → Thêm vào màn hình chính**.
3. Mở app từ icon — chạy toàn màn hình như app thật, ảnh đã xem chơi được offline.

---

## 🚀 Deploy (host tĩnh)

Toàn bộ là file tĩnh nên up thẳng lên bất kỳ static host nào:

- **GitHub Pages**: push thư mục này lên repo → Settings → Pages → chọn branch.
- **Netlify / Vercel / Cloudflare Pages**: kéo-thả thư mục hoặc trỏ tới repo.

Yêu cầu: phục vụ qua **HTTPS** (bắt buộc để Service Worker hoạt động trên thiết bị thật).

---

## 💾 Dữ liệu lưu (Local Storage)

- **Khóa hiện hành**: `pokeQuizSave_v3`
- **Khóa cũ (migrate)**: `pokeQuizSave_v2`

Cấu trúc `gameState`:
```js
{
  score: 0,              // điểm tích lũy
  pokedex: [],           // ID Pokémon thường đã bắt
  shinyPokedex: [],      // ID Pokémon Shiny đã bắt
  candy: 0,              // kẹo 🍬 (thưởng nhiệm vụ + quiz)
  missions: {            // nhiệm vụ trong ngày
    date: "YYYY-M-D",
    tasks: [ { key, icon, label, track, target, progress, done } ]
  },
  seenUnlocked: []       // các vùng đã "thấy mở khóa" (chống ăn mừng nhầm)
}
```

**Migrate v2 → v3** (tự động trong `state.js > loadGame()`): nếu chưa có save v3 mà có save v2,
game giữ nguyên `score` + `pokedex`, thêm các trường mới và ghi sang v3 (vẫn giữ v2 dự phòng).

**Xóa tiến trình làm lại từ đầu**: trong Developer Tools → Console:
```js
localStorage.removeItem('pokeQuizSave_v3'); location.reload();
```

---

## ⚙️ Cấu hình nhanh (`js/config.js`)

| Hằng số | Mặc định | Ý nghĩa |
|---------|----------|---------|
| `SHINY_RATE` | `0.10` | Tỷ lệ ra Shiny mỗi câu |
| `UNLOCK_NEED` | `50` | Số con cần bắt để mở vùng kế |
| `QUIZ_ROUND` | `5` | Số câu mỗi lượt Siêu Quiz |
| `QUIZ_CANDY` | `10` | Kẹo thưởng mỗi câu quiz đúng |
| `MISSION_REWARD` | `50` | Kẹo thưởng mỗi nhiệm vụ |
| `BATCH_SIZE` | `25` | Số Pokémon tải song song mỗi lô |
| `REGIONS` | 4 vùng | Khoảng ID, màu, emoji, điều kiện mở khóa |

---

## 🌐 Nguồn dữ liệu

- **Tên tiếng Nhật**: `GET https://pokeapi.co/api/v2/pokemon-species/{id}` → lọc `names` có
  `language.name` là `ja-Hrkt` (ưu tiên) hoặc `ja`.
- **Chi tiết hệ/cân nặng (quiz)**: `GET https://pokeapi.co/api/v2/pokemon/{id}`.
- **Ảnh** (lazy, dựng từ URL theo ID — không gọi API ảnh):
  - Thường: `…/sprites/pokemon/other/official-artwork/{id}.png`
  - Shiny: `…/sprites/pokemon/other/official-artwork/shiny/{id}.png`

---

## 🛠️ Hướng dẫn mở rộng

- **Thêm vùng đất mới**: thêm một mục vào mảng `REGIONS` trong `config.js` (key, name, short,
  start, end, color, emoji, requires) và bổ sung CSS `.scene-<key>` trong `style.css`.
- **Đổi số câu quiz / tỷ lệ Shiny / điều kiện mở khóa**: sửa hằng số tương ứng trong `config.js`.
- **Thêm dạng câu hỏi quiz**: viết hàm `buildXxxQuiz()` trong `quiz.js`, rồi nối vào nhánh chọn
  ngẫu nhiên trong `generateInfiniteQuiz()`.
- **Cập nhật cache PWA sau khi sửa code**: tăng phiên bản `CACHE` trong `sw.js`
  (ví dụ `poke-quiz-v1` → `poke-quiz-v2`) để buộc làm mới cache.

---

## ⚠️ Lưu ý

- Cần **Internet** lần đầu để tải tên + ảnh từng vùng; sau đó (qua PWA) ảnh đã xem chơi được offline.
- **Text-to-Speech** cần trình duyệt có giọng `ja-JP` (Safari/Chrome trên iOS/iPadOS có sẵn).
- Game dùng PokéAPI và sprite của **PokéAPI** — vui lòng tuân thủ điều khoản sử dụng của họ.
  Pokémon © Nintendo / Game Freak / The Pokémon Company. Dự án phi thương mại, mục đích học tập.
