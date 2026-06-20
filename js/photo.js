"use strict";
/* =====================================================================
   PHOTO STUDIO — フォトスタジオ: chọn Pokémon đã bắt + 10 nền CSS, chụp ảnh
   ===================================================================== */

/* 10 ảnh phong cảnh thật (đặt trong ./backgrounds/). c1/c2 = gradient dự phòng nếu thiếu ảnh. */
const studioBackgrounds = [
  { id: 'grass',   name: 'カントーの草原', url: './backgrounds/bg_grass.png',   c1: '#bfe88a', c2: '#5a9e34' },
  { id: 'volcano', name: 'ほのおの火山',   url: './backgrounds/bg_volcano.png', c1: '#ff8a50', c2: '#7a1500' },
  { id: 'beach',   name: 'みずの海岸',     url: './backgrounds/bg_beach.png',   c1: '#7fd7ff', c2: '#f3c14e' },
  { id: 'city',    name: 'でんきの街',     url: './backgrounds/bg_city.png',    c1: '#3a1d6e', c2: '#120630' },
  { id: 'forest',  name: 'しんぴの森',     url: './backgrounds/bg_forest.png',  c1: '#1b5e20', c2: '#03160a' },
  { id: 'snow',    name: 'ふぶきの雪山',   url: './backgrounds/bg_snow.png',    c1: '#cfe0ea', c2: '#8499a8' },
  { id: 'cave',    name: 'いわの洞窟',     url: './backgrounds/bg_cave.png',    c1: '#5a4a6e', c2: '#1c1426' },
  { id: 'valley',  name: 'ドラゴン谷',     url: './backgrounds/bg_valley.png',  c1: '#3a4756', c2: '#171426' },
  { id: 'temple',  name: 'ほうおうの霊殿', url: './backgrounds/bg_temple.png',  c1: '#f4663c', c2: '#5b2a6e' },
  { id: 'space',   name: '宇宙スペース',   url: './backgrounds/bg_space.png',   c1: '#1a0b3d', c2: '#000000' }
];

/* Cache Image để vẽ lên canvas khi lưu Album (ảnh nội bộ -> không vướng CORS) */
const bgImgCache = {};
function preloadBgImages() {
  studioBackgrounds.forEach(bg => {
    if (bgImgCache[bg.id]) return;
    const img = new Image();
    img.src = bg.url;
    bgImgCache[bg.id] = img;
  });
}
/* Nền hiển thị = ảnh thật (trên) + gradient dự phòng (dưới) -> thiếu ảnh vẫn đẹp */
function bgCss(bg) {
  return `url("${bg.url}"), linear-gradient(180deg, ${bg.c1} 0%, ${bg.c2} 100%)`;
}

let photoPokeId = null, photoBg = 0, photoIsShiny = false;

const ALBUM_KEY = "pokeQuizAlbum";
const ALBUM_MAX = 18;   // giới hạn để không đầy Local Storage

/* Vào màn Photo Studio */
function enterPhoto() {
  preloadBgImages();
  showScreen("photo");
  photoAlbum.style.display = "none";
  photoMainHeader.style.display = "";
  photoStudio.style.display = "none";
  photoChoose.style.display = "block";
  renderPhotoChooser();
}

/* Bước 1: chọn Pokémon đã bắt */
function renderPhotoChooser() {
  photoChooseGrid.innerHTML = "";
  const caught = gameState.pokedex.slice().sort((a, b) => a - b);
  if (caught.length === 0) {
    photoChooseGrid.innerHTML = '<p class="choose-empty">まだ ポケモンを つかまえていないよ！<br>「ポケモンGET」で つかまえてから きてね。</p>';
    return;
  }
  caught.forEach(id => {
    const isShiny = gameState.shinyPokedex.includes(id);
    const btn = document.createElement("button");
    btn.className = "choose-cell" + (isShiny ? " shiny" : "");
    btn.innerHTML = `
      ${isShiny ? '<span class="cc-star">✨</span>' : ""}
      <img src="${isShiny ? shinyArtworkUrl(id) : artworkUrl(id)}" loading="lazy" decoding="async" alt="">
      <span class="cc-id">No.${pad(id)}</span>`;
    btn.addEventListener("click", () => selectPhotoPokemon(id, isShiny));
    photoChooseGrid.appendChild(btn);
  });
}

/* Bước 2: vào studio với Pokémon đã chọn */
async function selectPhotoPokemon(id, isShiny) {
  photoPokeId = id; photoIsShiny = isShiny; photoBg = 0;
  photoChoose.style.display = "none";
  photoStudio.style.display = "block";
  photoStage.classList.remove("captured");
  photoHint.textContent = "カメラボタンを タップ！";
  photoPoke.crossOrigin = "anonymous";   // để vẽ được lên canvas (cần CORS)
  photoPoke.src = isShiny ? shinyArtworkUrl(id) : artworkUrl(id);
  renderBgPicker();
  setPhotoBg(0);
  photoCaption.textContent = "…";
  try {
    const nm = await getJapaneseName(id);
    photoCaption.textContent = nm + (isShiny ? " ✨" : "");
  } catch (e) { photoCaption.textContent = "No." + pad(id); }
}

/* Đổi nền: gán trực tiếp ảnh cho khung Studio chính (#photo-stage) */
function setPhotoBg(i) {
  photoBg = i;
  const bg = studioBackgrounds[i];
  photoStage.className = "photo-stage";              // bỏ trạng thái 'captured' khi đổi nền
  photoStage.style.backgroundImage = bgCss(bg);
  photoHint.textContent = "カメラボタンを タップ！";
  if (bgPicker) bgPicker.querySelectorAll(".bg-opt").forEach(el => el.classList.toggle("sel", +el.dataset.i === i));
}

/* Lưới 10 nền (thumbnail đổi luôn sang ảnh tương ứng) */
function renderBgPicker() {
  bgPicker.innerHTML = "";
  studioBackgrounds.forEach((bg, i) => {
    const opt = document.createElement("button");
    opt.className = "bg-opt" + (i === photoBg ? " sel" : "");
    opt.dataset.i = i;
    opt.style.backgroundImage = bgCss(bg);
    opt.style.backgroundSize = "cover";
    opt.style.backgroundPosition = "center";
    opt.innerHTML = `<span class="bg-label">${bg.name}</span>`;
    opt.addEventListener("click", () => setPhotoBg(i));
    bgPicker.appendChild(opt);
  });
}

/* Chụp ảnh: chớp trắng + tiếng tách -> vẽ canvas -> lưu vào Album */
function capturePhoto() {
  if (!photoPokeId) return;
  playShutter();
  const flash = document.createElement("div");
  flash.className = "photo-flash";
  document.body.appendChild(flash);
  setTimeout(() => flash.remove(), 260);

  setTimeout(() => {
    photoStage.classList.add("captured");
    const dataUrl = renderPhotoToCanvas();
    if (dataUrl) {
      const album = loadAlbum();
      album.push(dataUrl);
      while (album.length > ALBUM_MAX) album.shift();   // FIFO: tự bỏ ảnh cũ nhất
      saveAlbum(album);
      photoHint.textContent = `📸 アルバムに ほぞん！（${album.length}まい）`;
    } else {
      photoHint.textContent = "📸 とれた！（ほぞんは できなかったよ）";
    }
  }, 130);
}

/* Quay lại chọn Pokémon khác */
function backToPhotoChooser() {
  photoStudio.style.display = "none";
  photoChoose.style.display = "block";
  renderPhotoChooser();
}

/* =====================================================================
   ALBUM — lưu/đọc, vẽ canvas, lưới, xóa, lightbox
   ===================================================================== */
function loadAlbum() {
  try { const r = localStorage.getItem(ALBUM_KEY); const a = r ? JSON.parse(r) : []; return Array.isArray(a) ? a : []; }
  catch (e) { return []; }
}
function saveAlbum(arr) {
  try { localStorage.setItem(ALBUM_KEY, JSON.stringify(arr)); }
  catch (e) { try { arr.shift(); localStorage.setItem(ALBUM_KEY, JSON.stringify(arr)); } catch (e2) {} }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* Vẽ Pokémon + nền (tĩnh) + tên lên canvas -> trả về DataURL JPEG nén */
function renderPhotoToCanvas() {
  const W = 400, H = 400;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d");

  drawStudioBackground(ctx, studioBackgrounds[photoBg], W, H);

  if (photoPoke.complete && photoPoke.naturalWidth > 0) {
    const ratio = photoPoke.naturalHeight / photoPoke.naturalWidth;
    const pw = W * 0.66, ph = pw * ratio;
    const px = (W - pw) / 2, py = H * 0.9 - ph;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.45)"; ctx.shadowBlur = 14; ctx.shadowOffsetY = 8;
    ctx.drawImage(photoPoke, px, py, pw, ph);
    ctx.restore();
  }

  const name = (photoCaption.textContent || "").trim();
  if (name) {
    ctx.font = "bold 22px 'Hiragino Kaku Gothic ProN','Yu Gothic',sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const tw = ctx.measureText(name).width;
    const pillW = tw + 32, pillH = 34, pillX = (W - pillW) / 2, pillY = H - 52;
    ctx.fillStyle = "rgba(0,0,0,0.5)"; roundRect(ctx, pillX, pillY, pillW, pillH, 17); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.fillText(name, W / 2, pillY + pillH / 2 + 1);
  }

  ctx.strokeStyle = "#fff"; ctx.lineWidth = 14; ctx.strokeRect(7, 7, W - 14, H - 14);

  try { return c.toDataURL("image/jpeg", 0.72); }
  catch (e) { console.warn("Không xuất được ảnh (CORS):", e); return null; }
}

/* Vẽ ảnh nền (cover) lên canvas; thiếu ảnh -> gradient dự phòng */
function drawImageCover(ctx, img, dx, dy, dw, dh) {
  const ir = img.naturalWidth / img.naturalHeight, dr = dw / dh;
  let sw, sh, sx, sy;
  if (ir > dr) { sh = img.naturalHeight; sw = sh * dr; sx = (img.naturalWidth - sw) / 2; sy = 0; }
  else { sw = img.naturalWidth; sh = sw / dr; sx = 0; sy = (img.naturalHeight - sh) / 2; }
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}
function drawStudioBackground(ctx, bg, W, H) {
  const img = bg && bgImgCache[bg.id];
  if (img && img.complete && img.naturalWidth > 0) {
    try { drawImageCover(ctx, img, 0, 0, W, H); return; } catch (e) { /* tainted/lỗi -> fallback */ }
  }
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, (bg && bg.c1) || "#cfe0ea");
  g.addColorStop(1, (bg && bg.c2) || "#8499a8");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

/* ---- Màn Album ---- */
function openAlbum() {
  photoMainHeader.style.display = "none";
  photoChoose.style.display = "none";
  photoStudio.style.display = "none";
  photoAlbum.style.display = "block";
  renderAlbumGrid();
}
function closeAlbum() {
  photoAlbum.style.display = "none";
  photoMainHeader.style.display = "";
  if (photoPokeId) { photoStudio.style.display = "block"; }
  else { photoChoose.style.display = "block"; renderPhotoChooser(); }
}
function renderAlbumGrid() {
  const album = loadAlbum();
  albumGrid.innerHTML = "";
  albumEmpty.style.display = album.length ? "none" : "block";
  album.forEach((url, idx) => {
    const cell = document.createElement("div");
    cell.className = "album-cell";
    const img = document.createElement("img");
    img.src = url; img.alt = "しゃしん " + (idx + 1); img.loading = "lazy";
    img.addEventListener("click", () => openLightbox(url));
    const del = document.createElement("button");
    del.className = "album-del"; del.textContent = "🗑️"; del.setAttribute("aria-label", "削除");
    del.addEventListener("click", (e) => { e.stopPropagation(); deletePhoto(idx); });
    cell.appendChild(img); cell.appendChild(del);
    albumGrid.appendChild(cell);
  });
}
function deletePhoto(idx) {
  if (!window.confirm("このしゃしんを 消す（けす）？")) return;
  const album = loadAlbum();
  album.splice(idx, 1);
  saveAlbum(album);
  renderAlbumGrid();
}
function openLightbox(url) { lightboxImg.src = url; lightbox.classList.add("open"); }
function closeLightbox() { lightbox.classList.remove("open"); lightboxImg.src = ""; }
