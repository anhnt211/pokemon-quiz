"use strict";
/* =====================================================================
   EFFECTS — hoạt cảnh anime: ném Pokéball, VFX tuyệt chiêu, cutscene Z-Move
   Tối ưu 60fps: chỉ animate transform / opacity (GPU), dọn DOM sau khi xong.
   ===================================================================== */

/* ===== 1) HOẠT CẢNH NÉM POKÉBALL THU PHỤC =====
   onReveal() được gọi khi ảnh màu hiện ra (để game đọc tên + popup + hẹn câu sau). */
function playCatchAnimation(pokemon, isShiny, onReveal) {
  const stage = elStage;

  // Tạo quả Pokéball
  const ball = document.createElement("div");
  ball.className = "pokeball throw";
  stage.appendChild(ball);

  const T_THROW = 640, T_DROP = 360, T_WOBBLE = 1260; // 3 lắc × 420ms

  // (a) Ngay trước khi bóng chạm: Pokémon co lại thành luồng sáng đỏ
  setTimeout(() => { elImage.classList.add("absorbing"); }, T_THROW - 140);

  // (b) Bóng chạm -> ẩn Pokémon, bóng rơi xuống đất
  setTimeout(() => {
    elImage.style.visibility = "hidden";
    ball.classList.remove("throw");
    ball.classList.add("drop");
  }, T_THROW);

  // (c) Lắc lư 3 lần
  setTimeout(() => {
    ball.classList.remove("drop");
    ball.classList.add("wobble");
  }, T_THROW + T_DROP);

  // (d) Nổ lấp lánh -> hiện ảnh màu
  setTimeout(() => {
    ball.classList.remove("wobble");
    ball.classList.add("burst");
    if (typeof launchSparkles === "function") launchSparkles();

    elImage.classList.remove("absorbing", "silhouette");
    elImage.style.visibility = "";
    elImage.classList.add("popout");
    setTimeout(() => elImage.classList.remove("popout"), 600);

    setTimeout(() => ball.remove(), 360);
    if (typeof onReveal === "function") onReveal();
  }, T_THROW + T_DROP + T_WOBBLE);
}

/* ===== 2) VFX TUYỆT CHIÊU TOÀN MÀN HÌNH (theo Hệ) ===== */
function playSkillVFX(type) {
  if (type !== "electric" && type !== "fire" && type !== "water") return;
  const host = battleScreen || document.body;
  const layer = document.createElement("div");
  layer.className = "vfx-layer vfx-" + type;

  if (type === "electric") {
    layer.innerHTML = `
      <svg class="vfx-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <polyline points="18,0 26,32 14,38 30,70 20,76 34,100"/>
        <polyline points="52,0 60,28 48,34 62,66 50,72 64,100"/>
        <polyline points="82,0 76,30 88,36 74,68 84,74 72,100"/>
      </svg>`;
  } else if (type === "fire") {
    let p = "";
    for (let i = 0; i < 18; i++) {
      p += `<span class="fire-p" style="left:${Math.round(Math.random() * 100)}%; animation-delay:${(Math.random() * 0.35).toFixed(2)}s;"></span>`;
    }
    layer.innerHTML = p;
  } else { // water
    let b = '<div class="water-wave"></div>';
    for (let i = 0; i < 14; i++) {
      const d = 8 + Math.round(Math.random() * 16);
      b += `<span class="bubble" style="left:${Math.round(Math.random() * 100)}%; width:${d}px; height:${d}px; animation-delay:${(Math.random() * 0.4).toFixed(2)}s;"></span>`;
    }
    layer.innerHTML = b;
  }

  host.appendChild(layer);
  setTimeout(() => layer.remove(), 950);
}

/* ===== 3) CUTSCENE Z-MOVE (2 giây) ===== */
function playZCutscene(imageUrl) {
  const host = battleScreen || document.body;
  const cut = document.createElement("div");
  cut.className = "zmove-cutscene";
  cut.innerHTML = `
    <div class="z-aura"></div>
    <img class="z-poke" src="${imageUrl}" alt="">
    <div class="z-title">Zワザ！</div>`;
  host.appendChild(cut);
  host.classList.add("z-shake");
  setTimeout(() => {
    cut.remove();
    host.classList.remove("z-shake");
  }, 2000);
}
