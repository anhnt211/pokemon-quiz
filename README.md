# 🎮 Poké-Quiz — だれだ？このポケモン (Who's That Pokémon?)

Web Game (PWA) đoán bóng Pokémon dành cho trẻ em (lớp 2, Nhật Bản). Bé đoán tên **tiếng Nhật
(Katakana)** của Pokémon từ bóng đen, thám hiểm các vùng đất, làm quiz, đấu thường và **hạ Boss
huyền thoại** để mở vùng mới. Dữ liệu hình ảnh, tên, chỉ số, hệ và tiến hóa lấy trực tiếp từ **PokéAPI**.

> Giao diện 100% tiếng Nhật cho bé · Mã nguồn & chú thích tiếng Việt cho người maintain.

---

## ✨ Tính năng

| Nhóm | Mô tả |
|------|------|
| 🏠 Màn chính | Ảnh nền nhân vật + thẻ **Trainer Rank** + 3 nút: スーパークイズ / ポケモンGET / ポケモンバトル |
| 🗺️ ポケモンGET | **Bản đồ nền** với 4 地方 đánh dấu bằng **mốc bấm được**, đường mòn nét đứt, chấm 「📍 いまここ」 |
| 🎯 Đoán bóng | Silhouette (`filter:brightness(0)`) → chọn đúng thì hiện màu mượt |
| ✨ Shiny Hunter | 10% mỗi câu ra Shiny (ảnh shiny + viền lấp lánh), lưu riêng `shinyPokedex` |
| 📕 Pokédex | Bộ sưu tập theo vùng; chưa bắt = bóng đen; Shiny có viền vàng + ⭐ |
| 🎖️ Trainer Rank | Danh hiệu theo tổng số bắt được + thanh % hoàn thành Zukan |
| 📜 Nhiệm vụ Oak | 2 nhiệm vụ ngẫu nhiên/ngày, thưởng 🍬 50 (chạy ngầm, thưởng + popup) |
| 🧠 Siêu Quiz | Câu hỏi **vô hạn** 4 dạng: **Hệ xuôi / Tiến hóa / Hệ ngược / So cân nặng**; phạm vi theo vùng đã mở |
| ⚔️ ポケモンバトル | Đấu turn-based: chọn quân, đối thủ ngẫu nhiên, so stats + khắc hệ, animation; thắng +100 🍬 |
| 📷 フォトスタジオ | Chọn Pokémon đã bắt + **10 nền CSS** (草原/火山/海岸/電気街/森/雪山/洞窟/ドラゴン谷/霊殿/宇宙); nút máy ảnh → chớp trắng + tiếng tách → khung ảnh polaroid |
| 👑 Boss Battle | 4 Boss huyền thoại; hạ Boss để **mở khóa vùng kế**; sàn đấu tối + rung + boss khổng lồ; thắng +500 🍬 |
| 🔊 Text-to-Speech | Đọc tên Pokémon bằng `ja-JP` qua `speechSynthesis` |
| 💾 Local Storage | Tự lưu/đọc tiến trình; **migrate v2 → v3** + giữ tiến trình khi đổi cơ chế khóa |
| 📲 PWA Offline | Cài lên màn hình chính iPad/iPhone; cache app shell + ảnh đã xem |

---

## 👑 Boss & Cơ chế khóa tiến trình

- Mỗi vùng có 1 **Boss huyền thoại** (HP gốc **×1.5**):

  | Vùng | Boss | PokéAPI ID |
  |------|------|-----------|
  | カントー (Kanto) | ミュウツー (Mewtwo) | 150 |
  | ジョウト (Johto) | ルギア (Lugia) | 249 |
  | ホウエン (Hoenn) | レックウザ (Rayquaza) | 384 |
  | シンオウ (Sinnoh) | アルセウス (Arceus) | 493 |

- Khi bé thu thập đủ **80%** số Pokémon của vùng → icon **👑** xuất hiện trên mốc vùng đó.
- **Vùng kế KHÔNG còn tự mở bằng số lượng.** Chỉ khi **hạ Boss** vùng hiện tại, vùng kế mới
  **sáng bừng** và cho bấm vào. Trạng thái lưu ở `bossDefeated[regionKey] = true`.
- **Thắng Boss**: pháo hoa + 「すごすぎる！◯◯ を たおしたぞ！」 + **+500 🍬** + mở vùng kế.
- **Thua Boss**: 「おしい！まけてしまった… ポケモンを しんか させて リベンジしよう！」 — giữ khóa,
  bé quay lại Quiz/Đoán bóng cày kẹo & nâng cấp quân rồi đấu lại.

---

## 📁 Cấu trúc thư mục

```
.
├── index.html          # Khung HTML (Home / GET / Game / Quiz / Battle) + link css, js, manifest
├── manifest.json       # Khai báo PWA
├── sw.js               # Service Worker (app shell network-first, ảnh cache-first)
├── README.md           # Tài liệu này
├── .nojekyll           # File rỗng — tắt xử lý Jekyll trên GitHub Pages (phục vụ đúng mọi file)
├── css/
│   └── style.css       # Toàn bộ giao diện & animation (gồm bản đồ, sàn đấu, boss)
├── js/                 # Mã nguồn tách module (nạp theo thứ tự phụ thuộc)
│   ├── config.js       #  Hằng số, REGIONS + Boss, TYPE_JP, MISSION_POOL, biến runtime, shuffle()
│   ├── dom.js          #  Tham chiếu phần tử DOM
│   ├── state.js        #  Local Storage, migrate, nhiệm vụ, danh hiệu, mở khóa/boss
│   ├── audio.js        #  speakName (chọn giọng ja-JP xịn) + playCry (tiếng kêu Pokémon)
│   ├── api.js          #  Gọi PokéAPI (tên tiếng Nhật + chi tiết hệ/cân nặng)
│   ├── effects.js      #  Hoạt cảnh anime: ném Pokéball, VFX hệ, cutscene Z-Move
│   ├── game.js         #  Home, điều hướng màn, bản đồ markers, vòng đoán bóng + Shiny, Pokédex
│   ├── quiz.js         #  Siêu Quiz: sinh câu hỏi vô hạn (4 dạng) + dữ liệu tiến hóa/hệ
│   ├── battle.js       #  ポケモンバトル + Boss + Z-Move + Dynamax (turn-based, khắc hệ, VFX)
│   ├── photo.js        #  フォトスタジオ: chọn Pokémon + 10 nền CSS, chụp ảnh
│   └── main.js         #  Gắn sự kiện, khởi động, đăng ký Service Worker
├── img/
│   ├── main-bg.jpg     # Ảnh nền màn chính (nhân vật + Poké Ball)
│   └── map-bg.jpg      # Ảnh nền bản đồ thám hiểm
└── icons/
    ├── icon-512.png    # Icon PWA 512×512
    ├── icon-192.png    # Icon PWA 192×192
    └── icon-180.png    # apple-touch-icon (iOS)
```

> ⚠️ Các file JS là **classic script** (không phải ES module), dùng chung global scope và **phải nạp
> đúng thứ tự** như trong `index.html`:
> `config → dom → state → audio → api → effects → game → quiz → battle → photo → main`.

### 🎬 Hiệu ứng & âm thanh anime
- **Catch Ball**: đoán đúng → Pokéball bay parabol, hút Pokémon, lắc 3 lần, nổ lấp lánh rồi hiện ảnh màu.
- **VFX tuyệt chiêu toàn màn** theo hệ: でんき (tia sét SVG), ほのお (hạt lửa), みず (sóng + bong bóng).
- **Z-Move** (Boss, HP bé < 50%): nút lấp lánh → cutscene 2s (phóng to + hào quang neon + rung) → siêu sát thương.
- **Dynamax** (Battle thường, 5%): đối thủ phóng to 1.3×, hào quang đỏ tía, HP & Attack ×2, thắng +300 🍬.
- **Tiếng kêu Pokémon** (cries) khi xuất hiện + **TTS giọng ja-JP** (Kyoko/Otoya/Google) đọc tên — 2 kênh riêng, không đụng nhau.
  (Cries là `.ogg` — Safari/iOS có thể không phát; khi đó tự bỏ qua êm, TTS vẫn đọc tên bình thường.)

---

## ▶️ Cách chạy

### 1. Chơi nhanh (không có offline)
Mở thẳng `index.html` bằng Safari/Chrome. Game chạy bình thường, chỉ riêng PWA/offline không
kích hoạt (Service Worker không chạy trên `file://`).

### 2. Chạy qua server cục bộ (bật được PWA offline)
```bash
cd <thư-mục-này>
python3 -m http.server 8000
```
Mở `http://localhost:8000` (hoặc `http://<IP-máy>:8000` để truy cập từ iPad cùng mạng Wi-Fi).

### 3. Cài lên màn hình chính iPad/iPhone
1. Mở app bằng **Safari** qua địa chỉ `http(s)://…`.
2. Bấm **Chia sẻ → Thêm vào màn hình chính**.
3. Mở app từ icon — chạy toàn màn hình, ảnh đã xem chơi được offline.

---

## 🚀 Deploy lên GitHub Pages (tóm tắt)

1. Tạo repo public, **upload toàn bộ nội dung** thư mục này (sao cho `index.html` ở **gốc repo**),
   gồm cả `css/ js/ img/ icons/` và file ẩn `.nojekyll`.
2. **Settings → Pages →** Source = Deploy from a branch, Branch = `main` / `(root)` → Save.
3. Sau ~1 phút có link `https://<tên>.github.io/<repo>/`. Mở bằng Safari iPad → Thêm vào màn hình chính.

(GitHub Pages chạy HTTPS nên Service Worker / PWA hoạt động.)

---

## 💾 Dữ liệu lưu (Local Storage)

- **Khóa hiện hành**: `pokeQuizSave_v3` · **Khóa cũ (migrate)**: `pokeQuizSave_v2`

```js
{
  score: 0,
  pokedex: [],            // ID Pokémon thường đã bắt
  shinyPokedex: [],       // ID Pokémon Shiny đã bắt
  candy: 0,               // kẹo 🍬 (nhiệm vụ + quiz + thắng đấu/boss)
  missions: { date, tasks: [...] },
  seenUnlocked: [],       // vùng đã "thấy mở khóa" (chống ăn mừng nhầm)
  bossDefeated: {}        // { kanto:true, johto:true, ... } — boss đã hạ
}
```

**Tương thích ngược**: khi load, nếu bé từng mở vùng kế theo luật cũ (≥50 con vùng trước), game tự
đánh dấu boss vùng đó đã hạ → **không bị tụt tiến trình** khi chuyển sang cơ chế khóa-bằng-boss.

**Xóa làm lại từ đầu** (Console): `localStorage.removeItem('pokeQuizSave_v3'); location.reload();`

---

## ⚙️ Cấu hình nhanh (`js/config.js`)

| Hằng số | Mặc định | Ý nghĩa |
|---------|----------|---------|
| `SHINY_RATE` | `0.10` | Tỷ lệ ra Shiny mỗi câu |
| `BOSS_THRESHOLD` | `0.80` | % thu thập để Boss 👑 xuất hiện |
| `BOSS_HP_MULT` | `1.5` | Hệ số nhân HP của Boss |
| `QUIZ_ROUND` | `5` | Số câu mỗi lượt Siêu Quiz |
| `QUIZ_CANDY` | `10` | Kẹo mỗi câu quiz đúng |
| `MISSION_REWARD` | `50` | Kẹo mỗi nhiệm vụ |
| `BATCH_SIZE` | `25` | Số Pokémon tải song song mỗi lô |
| `REGIONS` | 4 vùng | ID, màu, emoji, `requires`, `boss` |

---

## 🌐 Nguồn dữ liệu (PokéAPI)

- Tên tiếng Nhật: `/pokemon-species/{id}` → lọc `names` ngôn ngữ `ja-Hrkt` (ưu tiên) / `ja`.
- Chỉ số / hệ / cân nặng: `/pokemon/{id}` (`stats`, `types`, `weight`).
- Tiến hóa: `/pokemon-species/{id}` → `evolution_chain.url` → duyệt chuỗi tiến hóa.
- Pokémon theo hệ: `/type/{name}`.
- Ảnh (lazy, dựng từ URL theo ID): `…/official-artwork/{id}.png` và `…/official-artwork/shiny/{id}.png`.

---

## 🛠️ Mở rộng & bảo trì

- **Thêm vùng**: thêm mục vào `REGIONS` (key, name, short, start, end, color, emoji, requires, **boss**)
  trong `config.js`, thêm toạ độ vào `MAP_POS` (`game.js`) và CSS nếu cần.
- **Đổi Boss / độ khó**: sửa `boss.id` trong `REGIONS`, `BOSS_HP_MULT`, `BOSS_THRESHOLD`.
- **Thêm dạng quiz**: viết `buildXxxQuiz()` trong `quiz.js`, nối vào `generateInfiniteQuiz()`.
- **Cập nhật PWA sau khi sửa code**: tăng phiên bản `CACHE` trong `sw.js` (vd `poke-quiz-v7` → `v8`).
  App shell dùng **network-first** nên khi online thiết bị tự lấy bản mới; offline mới dùng cache.

---

## ⚠️ Lưu ý

- Cần **Internet** lần đầu để tải tên/ảnh/chỉ số; sau đó (qua PWA) ảnh đã xem chơi được offline.
  Quiz Tiến hóa/Hệ ngược và Battle/Boss cần mạng để lấy dữ liệu PokéAPI.
- **Text-to-Speech** cần trình duyệt có giọng `ja-JP` (Safari/Chrome iOS có sẵn).
- Layout dùng bố cục khối cuộn tự nhiên + `min-height` dự phòng cho `aspect-ratio` → hiển thị tốt,
  không khuất nội dung trên iPad/iPhone (kể cả Safari cũ).
- Dự án phi thương mại, mục đích học tập. Pokémon © Nintendo / Game Freak / The Pokémon Company;
  dữ liệu & sprite từ **PokéAPI** — vui lòng tuân thủ điều khoản của họ.
