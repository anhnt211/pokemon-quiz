"use strict";
/* =====================================================================
   PHOTO STUDIO — フォトスタジオ: chọn Pokémon đã bắt + 10 nền CSS, chụp ảnh
   ===================================================================== */

const PHOTO_BGS = [
  { n: 1,  label: "カントーの草原" },
  { n: 2,  label: "ほのおの火山" },
  { n: 3,  label: "みずの海岸" },
  { n: 4,  label: "でんきの街" },
  { n: 5,  label: "しんぴの森" },
  { n: 6,  label: "ふぶきの雪山" },
  { n: 7,  label: "いわの洞窟" },
  { n: 8,  label: "ドラゴン谷" },
  { n: 9,  label: "ほうおうの霊殿" },
  { n: 10, label: "宇宙スペース" }
];

let photoPokeId = null, photoBg = 1, photoIsShiny = false;

const ALBUM_KEY = "pokeQuizAlbum";
const ALBUM_MAX = 18;   // giới hạn để không đầy Local Storage

/* Vào màn Photo Studio */
function enterPhoto() {
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
  photoPokeId = id; photoIsShiny = isShiny; photoBg = 1;
  photoChoose.style.display = "none";
  photoStudio.style.display = "block";
  photoStage.classList.remove("captured");
  photoHint.textContent = "カメラボタンを タップ！";
  photoPoke.crossOrigin = "anonymous";   // để vẽ được lên canvas (cần CORS)
  photoPoke.src = isShiny ? shinyArtworkUrl(id) : artworkUrl(id);
  setPhotoBg(1);
  renderBgPicker();
  photoCaption.textContent = "…";
  try {
    const nm = await getJapaneseName(id);
    photoCaption.textContent = nm + (isShiny ? " ✨" : "");
  } catch (e) { photoCaption.textContent = "No." + pad(id); }
}

/* Đổi nền */
function setPhotoBg(n) {
  photoBg = n;
  photoStage.className = "photo-stage photo-bg-" + n;   // bỏ trạng thái 'captured' khi đổi nền
  photoHint.textContent = "カメラボタンを タップ！";
  if (bgPicker) bgPicker.querySelectorAll(".bg-opt").forEach(el => el.classList.toggle("sel", +el.dataset.n === n));
}

/* Lưới 10 nền để chọn */
function renderBgPicker() {
  bgPicker.innerHTML = "";
  PHOTO_BGS.forEach(b => {
    const opt = document.createElement("button");
    opt.className = "bg-opt photo-bg-" + b.n + (b.n === photoBg ? " sel" : "");
    opt.dataset.n = b.n;
    opt.innerHTML = `<span class="bg-label">${b.label}</span>`;
    opt.addEventListener("click", () => setPhotoBg(b.n));
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

  drawPhotoBackground(ctx, photoBg, W, H);

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

/* Vẽ lại 10 bối cảnh (bản tĩnh) trên canvas */
function drawPhotoBackground(ctx, n, W, H) {
  const lin = (stops) => { const g = ctx.createLinearGradient(0, 0, 0, H); stops.forEach(s => g.addColorStop(s[0], s[1])); return g; };
  const fill = () => ctx.fillRect(0, 0, W, H);
  const ell = (cx, cy, rx, ry, color) => { ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); };
  const dot = (x, y, r, color) => { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };

  switch (n) {
    case 1:
      ctx.fillStyle = lin([[0, '#9fd8ff'], [0.38, '#e8f7ff'], [0.52, '#cdeebf'], [0.7, '#9fd36a'], [1, '#6cae3e']]); fill();
      dot(W * 0.78, H * 0.2, W * 0.075, '#fff7c0');
      ell(W * 0.5, H * 1.25, W * 0.78, H * 0.42, '#4f8f2c');
      ell(W * 0.18, H * 1.16, W * 0.62, H * 0.36, '#7cc04a');
      ell(W * 0.84, H * 1.2, W * 0.6, H * 0.34, '#5fa337');
      break;
    case 2:
      ctx.fillStyle = lin([[0, '#1a0606'], [0.35, '#7a1500'], [0.62, '#c62828'], [1, '#ff7043']]); fill();
      { const g = ctx.createRadialGradient(W * 0.5, H, 0, W * 0.5, H, W * 0.6); g.addColorStop(0, 'rgba(255,213,79,0.8)'); g.addColorStop(1, 'rgba(255,213,79,0)'); ctx.fillStyle = g; fill(); }
      break;
    case 3:
      { const g1 = ctx.createLinearGradient(0, 0, 0, H * 0.3); g1.addColorStop(0, '#7fd7ff'); g1.addColorStop(1, '#aef0ff'); ctx.fillStyle = g1; ctx.fillRect(0, 0, W, H * 0.3); }
      { const g2 = ctx.createLinearGradient(0, H * 0.3, 0, H * 0.56); g2.addColorStop(0, '#16c2e8'); g2.addColorStop(1, '#0288d1'); ctx.fillStyle = g2; ctx.fillRect(0, H * 0.3, W, H * 0.26); }
      { const g3 = ctx.createLinearGradient(0, H * 0.56, 0, H); g3.addColorStop(0, '#ffe082'); g3.addColorStop(1, '#f3c14e'); ctx.fillStyle = g3; ctx.fillRect(0, H * 0.56, W, H * 0.44); }
      ell(W * 0.28, H * 0.13, W * 0.13, H * 0.05, 'rgba(255,255,255,0.9)');
      ell(W * 0.62, H * 0.1, W * 0.1, H * 0.04, 'rgba(255,255,255,0.85)');
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(0, H * 0.55, W, 3);
      break;
    case 4:
      ctx.fillStyle = lin([[0, '#1a0b3a'], [0.45, '#2a1060'], [1, '#120630']]); fill();
      { const g = ctx.createRadialGradient(W * 0.5, H * 0.28, 0, W * 0.5, H * 0.28, W * 0.5); g.addColorStop(0, 'rgba(150,70,230,0.5)'); g.addColorStop(1, 'rgba(150,70,230,0)'); ctx.fillStyle = g; fill(); }
      ctx.fillStyle = '#0c0526';
      [0.42, 0.18, 0.46, 0.1, 0.5, 0.22, 0.48, 0.14, 0.44].forEach((h, i) => { const bw = W / 9; ctx.fillRect(i * bw, H - H * h, bw - 3, H * h); });
      break;
    case 5:
      ctx.fillStyle = lin([[0, '#0e3b1e'], [0.55, '#072a14'], [1, '#03160a']]); fill();
      ctx.strokeStyle = 'rgba(200,255,180,0.12)'; ctx.lineWidth = 14;
      for (let i = -2; i < 8; i++) { ctx.beginPath(); ctx.moveTo(i * 60, -20); ctx.lineTo(i * 60 + 160, H + 20); ctx.stroke(); }
      ['#d4ff5a', '#b2ff59', '#eaff8a', '#c6ff00'].forEach((c, i) => dot(W * (0.2 + i * 0.2), H * (0.4 + (i % 2) * 0.18), 3, c));
      break;
    case 6:
      ctx.fillStyle = lin([[0, '#9fb2c0'], [0.4, '#cfe0ea'], [0.7, '#eef5fa'], [1, '#dfe9f0']]); fill();
      ctx.fillStyle = '#8499a8';
      ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(0, H * 0.7); ctx.lineTo(W * 0.2, H * 0.42); ctx.lineTo(W * 0.4, H * 0.62); ctx.lineTo(W * 0.55, H * 0.36); ctx.lineTo(W * 0.72, H * 0.58); ctx.lineTo(W, H * 0.5); ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
      for (let i = 0; i < 8; i++) dot(W * (0.1 + i * 0.11), H * (0.15 + (i % 3) * 0.12), 2.5, '#fff');
      break;
    case 7:
      { const g = ctx.createRadialGradient(W * 0.5, H * 0.45, 0, W * 0.5, H * 0.45, W * 0.6); g.addColorStop(0, '#5a4a6e'); g.addColorStop(0.6, '#36283f'); g.addColorStop(1, '#1c1426'); ctx.fillStyle = g; fill(); }
      { const v = ctx.createRadialGradient(W * 0.5, H * 0.5, W * 0.3, W * 0.5, H * 0.5, W * 0.72); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.65)'); ctx.fillStyle = v; fill(); }
      [['#e196ff', 0.22, 0.4], ['#b4c8ff', 0.7, 0.3], ['#ffaae6', 0.55, 0.62], ['#c8a0ff', 0.85, 0.55]].forEach(p => { ctx.fillStyle = p[0]; ctx.beginPath(); ctx.ellipse(W * p[1], H * p[2], 4, 9, 0, 0, Math.PI * 2); ctx.fill(); });
      break;
    case 8:
      ctx.fillStyle = lin([[0, '#3a4756'], [0.55, '#2a2540'], [1, '#171426']]); fill();
      ell(W * 0.4, H * 0.5, W * 0.5, H * 0.12, 'rgba(200,200,230,0.16)');
      ell(W * 0.65, H * 0.62, W * 0.45, H * 0.1, 'rgba(212,212,236,0.13)');
      break;
    case 9:
      ctx.fillStyle = lin([[0, '#5b2a6e'], [0.35, '#b23a6a'], [0.65, '#f4663c'], [1, '#ffc14d']]); fill();
      { const g = ctx.createRadialGradient(W * 0.5, H * 0.8, 0, W * 0.5, H * 0.8, W * 0.4); g.addColorStop(0, 'rgba(255,220,120,0.7)'); g.addColorStop(1, 'rgba(255,220,120,0)'); ctx.fillStyle = g; fill(); }
      ctx.fillStyle = 'rgba(38,12,28,0.6)';
      { const tx = W * 0.3, tw = W * 0.4, topY = H * 0.3; ctx.fillRect(tx - 6, topY, tw + 12, 12); ctx.fillRect(tx, topY + 22, tw, 9); ctx.fillRect(tx + tw * 0.12, topY, 12, H * 0.5); ctx.fillRect(tx + tw * 0.78, topY, 12, H * 0.5); }
      break;
    case 10:
      ctx.fillStyle = '#000'; fill();
      { const g = ctx.createRadialGradient(W * 0.5, H * 0.44, 0, W * 0.5, H * 0.44, W * 0.55); g.addColorStop(0, 'rgba(120,80,220,0.5)'); g.addColorStop(0.5, 'rgba(40,20,90,0.3)'); g.addColorStop(1, '#05020f'); ctx.fillStyle = g; fill(); }
      for (let i = 0; i < 42; i++) dot((i * 97) % W, (i * 61) % H, (i % 4 ? 1 : 1.6), (i % 5) ? '#fff' : '#b3e5fc');
      break;
    default:
      ctx.fillStyle = '#888'; fill();
  }
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
