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

/* Vào màn Photo Studio */
function enterPhoto() {
  showScreen("photo");
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

/* Chụp ảnh: chớp trắng 0.2s + tiếng tách -> khung ảnh hoàn chỉnh */
function capturePhoto() {
  if (!photoPokeId) return;
  playShutter();
  const flash = document.createElement("div");
  flash.className = "photo-flash";
  document.body.appendChild(flash);
  setTimeout(() => flash.remove(), 260);
  setTimeout(() => {
    photoStage.classList.add("captured");
    photoHint.textContent = "とれた！ 📸 すてきな しゃしんだね！";
  }, 120);
}

/* Quay lại chọn Pokémon khác */
function backToPhotoChooser() {
  photoStudio.style.display = "none";
  photoChoose.style.display = "block";
  renderPhotoChooser();
}
