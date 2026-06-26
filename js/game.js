"use strict";
/* =====================================================================
   GAME — Home, điều hướng màn, vòng chơi đoán bóng (+Shiny), Pokédex
   ===================================================================== */

/* ===== MÀN MAIN (chỉ Trainer Card + 2 nút) ===== */
function renderHome() {
  ensureDailyMissions();   // nhiệm vụ vẫn chạy ngầm (thưởng kẹo + popup Oak)
  renderTrainerCard();
  renderMissions();        // no-op vì đã bỏ khung nhiệm vụ khỏi main
  renderBuddyHome();       // 🐾 khung Bạn Đồng Hành trên màn chính
}

/* 🎶 Khung + hiệu ứng cho con CHO ĂN CUỐI CÙNG (nhảy múa) trên màn chính.
   Bấm vào khung -> vào màn そだてる (gắn sự kiện ở main.js). */
function renderBuddyHome() {
  if (typeof buddyHome === "undefined" || !buddyHome) return;
  // Con vừa được cho ăn gần nhất (lastFedID) — phải đang sở hữu
  let id = (gameState && typeof gameState.lastFedID !== "undefined") ? gameState.lastFedID : null;
  if (id && !gameState.pokedex.includes(id)) id = null;

  // Chưa cho con nào ăn -> khung mờ + lời nhắc
  if (!id) {
    buddyHome.className = "buddy-home empty";
    buddyHome.innerHTML =
      '<span class="bh-label">🎶 ごきげん♪</span>' +
      '<div class="bh-frame"><span class="bh-empty">♪</span></div>' +
      '<span class="bh-name">そだてるで おやつを あげてね！</span>';
    return;
  }

  const isShiny = gameState.shinyPokedex.includes(id);
  buddyHome.className = "buddy-home" + (isShiny ? " shiny" : "");
  buddyHome.innerHTML =
    '<span class="bh-label">🎶 ごきげん♪</span>' +
    '<div class="bh-frame">' +
      (isShiny ? '<span class="bh-shiny">✨</span>' : '') +
      '<img class="bh-img" src="' + (isShiny ? shinyArtworkUrl(id) : artworkUrl(id)) + '" alt="" decoding="async">' +
    '</div>' +
    '<span class="bh-name" id="bh-name">…</span>';

  // Tên tiếng Nhật (async) rồi cập nhật vào khung
  const nameEl = buddyHome.querySelector("#bh-name");
  getJapaneseName(id)
    .then(nm => { if (nameEl) nameEl.textContent = nm + (isShiny ? " ✨" : ""); })
    .catch(() => { if (nameEl) nameEl.textContent = "No." + pad(id); });
}

/* Toạ độ (% theo bản đồ nền) của 4 地方 — xếp theo hành trình chéo */
const MAP_POS = [
  { x: 24, y: 78 },   // kanto  (đồng cỏ, dưới-trái)
  { x: 46, y: 56 },   // johto  (rừng, giữa)
  { x: 70, y: 67 },   // hoenn  (biển + núi lửa, phải)
  { x: 76, y: 26 }    // sinnoh (núi tuyết, trên)
];

/* ===== MÀN ポケモンGET — các 地方 đánh dấu bằng mốc trên nền bản đồ ===== */
function renderGetMap() {
  ensureDailyMissions();
  const newlyUnlocked = detectNewUnlocks();

  let currentKey = null;
  REGIONS.forEach(r => { if (isRegionUnlocked(r)) currentKey = r.key; });

  // Đường mòn nét đứt nối các mốc (SVG overlay)
  const pts = MAP_POS.map(p => `${p.x},${p.y}`).join(" ");
  let html = `
    <svg class="map-path" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <polyline points="${pts}" fill="none" stroke="#fff" stroke-width="1.1"
                stroke-dasharray="3 2.5" stroke-linecap="round" opacity="0.85"/>
    </svg>`;

  REGIONS.forEach((r, idx) => {
    const unlocked = isRegionUnlocked(r);
    const caught = countCaughtInRegion(r);
    const total = r.end - r.start + 1;
    const pct = Math.round(caught / total * 100);
    const isCurrent = r.key === currentKey;
    const isNew = newlyUnlocked.some(n => n.key === r.key);
    const bossAvail = isBossAvailable(r);
    const bossDone = isBossDefeated(r);
    const pos = MAP_POS[idx];

    const cls = "map-marker" + (unlocked ? "" : " locked") + (isCurrent ? " current" : "") + (isNew ? " just-unlocked" : "");

    let inner = isCurrent ? '<span class="mk-now">📍 いまここ</span>' : "";

    if (unlocked) {
      inner += `
        <button class="mk-tap" type="button">
          <span class="mk-pin">${r.emoji}</span>
          <span class="mk-name">${r.name}</span>
          <span class="mk-prog">${caught}/${total}${bossDone ? " 👑✓" : ""}</span>
          <span class="mk-bar"><span class="mk-fill" style="width:${pct}%"></span></span>
        </button>`;
      if (bossAvail) inner += `<button class="mk-boss" type="button" title="ボスバトル">👑</button>`;
    } else {
      const req = REGIONS.find(x => x.key === r.requires.region);
      inner += `
        <div class="mk-tap">
          <span class="mk-pin">🔒</span>
          <span class="mk-name">${r.name}</span>
          <span class="mk-prog">${req.short}の ボスを たおすと ひらく</span>
        </div>`;
    }

    html += `<div class="${cls}" data-key="${r.key}" style="--rc:${r.color}; left:${pos.x}%; top:${pos.y}%;">${inner}</div>`;
  });

  mapBoard.innerHTML = html;

  // Gắn sự kiện: vùng đã mở -> chạm vào chơi; nút 👑 -> đấu Boss
  REGIONS.forEach(r => {
    if (!isRegionUnlocked(r)) return;
    const marker = mapBoard.querySelector(`.map-marker[data-key="${r.key}"]`);
    if (!marker) return;
    const tap = marker.querySelector(".mk-tap");
    if (tap) tap.addEventListener("click", () => enterRegion(r));
    const boss = marker.querySelector(".mk-boss");
    if (boss) boss.addEventListener("click", (e) => { e.stopPropagation(); enterBossBattle(r); });
  });

  if (newlyUnlocked.length) showUnlockPopup(newlyUnlocked[0]);
}

/* Popup chúc mừng mở khóa vùng mới */
function showUnlockPopup(region) {
  unlockPopup.innerHTML =
    `<div class="ubub">🎉 あたらしい ちほうが ひらいた！<span class="big">${region.name}へ いこう！</span></div>`;
  unlockPopup.classList.add("show");
  clearTimeout(unlockTimer);
  unlockTimer = setTimeout(() => unlockPopup.classList.remove("show"), 3600);
}

function showScreen(name) {
  homeScreen.style.display   = name === "home"   ? "block" : "none";
  getmapScreen.style.display = name === "getmap" ? "block" : "none";
  gameScreen.style.display   = name === "game"   ? "block" : "none";
  puzzleScreen.style.display = name === "puzzle" ? "block" : "none";
  battleScreen.style.display = name === "battle" ? "block" : "none";
  photoScreen.style.display  = name === "photo"  ? "block" : "none";
  if (typeof petScreen !== "undefined" && petScreen) petScreen.style.display = name === "pet" ? "block" : "none";
}

/* Dọn dẹp khi rời màn chơi/quiz */
function leaveActive() {
  loadToken++;
  clearTimeout(questionTimer);
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  if (typeof bgmStop === "function") bgmStop();   // tắt nhạc nền nếu đang phát
  closePokedex();
  hideCatchPopup();
}

/* Về màn MAIN */
function goHome() {
  leaveActive();
  currentRegion = null;
  renderHome();
  showScreen("home");
}

/* Về màn ポケモンGET (bản đồ) — cũng dùng khi thoát khỏi 1 vùng */
function goGetMap() {
  leaveActive();
  currentRegion = null;
  renderGetMap();
  showScreen("getmap");
}

/* ===== VÀO VÙNG & CHƠI ===== */
async function enterRegion(region) {
  const myToken = ++loadToken;
  currentRegion = region;
  showScreen("game");
  regionNameEl.textContent = region.name;
  elScore.textContent = gameState.score;
  clearTimeout(questionTimer);
  elStage.classList.remove("celebrate", "shiny-frame");
  elSparkle.innerHTML = "";
  elImage.classList.add("silhouette"); elImage.classList.remove("revealed"); elImage.removeAttribute("src");
  optionButtons.forEach(b => { b.disabled = true; b.textContent = "？"; b.classList.remove("correct", "wrong"); });
  elStatus.className = ""; elStatus.textContent = `${region.name} よみこみちゅう...`;
  try {
    const data = await fetchPokemonData(region.start, region.end, myToken);
    if (myToken !== loadToken || data === null) return;
    allPokemon = data;
    console.log(`✅ ${region.name}: ${allPokemon.length} con`);
    nextQuestion();
  } catch (e) { console.error(e); elStatus.textContent = "読み込み失敗…"; }
}

function nextQuestion() {
  clearTimeout(questionTimer);
  elStage.classList.remove("celebrate", "shiny-frame");
  elSparkle.innerHTML = "";
  elImage.classList.add("silhouette");
  elImage.classList.remove("revealed");
  optionButtons.forEach(btn => { btn.classList.remove("correct", "wrong"); btn.disabled = false; });

  currentCorrectAnswer = allPokemon[Math.floor(Math.random() * allPokemon.length)];
  currentIsShiny = Math.random() < SHINY_RATE;
  elImage.src = currentIsShiny ? shinyArtworkUrl(currentCorrectAnswer.id) : currentCorrectAnswer.image;
  elImage.alt = "このポケモンだ〜れだ？";

  const wrongOptions = [];
  while (wrongOptions.length < 3) {
    const c = allPokemon[Math.floor(Math.random() * allPokemon.length)];
    if (c.id !== currentCorrectAnswer.id && !wrongOptions.some(p => p.id === c.id)) wrongOptions.push(c);
  }
  const choices = shuffle([currentCorrectAnswer, ...wrongOptions]);
  optionButtons.forEach((btn, i) => {
    btn.textContent = choices[i].name;
    btn.onclick = () => checkAnswer(choices[i].name, btn);
  });

  if (currentIsShiny) {
    elStage.classList.add("shiny-frame");
    elStatus.className = "shiny-msg";
    elStatus.textContent = "あっ！ キラキラ光る シャイニーポケモン が あらわれた！";
  } else {
    elStatus.className = "";
    elStatus.textContent = "だれだ？このポケモン！";
  }
}

function launchSparkles() {
  const emojis = ["✨", "⭐", "🎉", "💫", "🌟"];
  for (let i = 0; i < 14; i++) {
    const s = document.createElement("span");
    s.className = "sparkle";
    s.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    const angle = (Math.PI * 2 * i) / 14 + Math.random() * 0.4;
    const dist = 90 + Math.random() * 60;
    s.style.setProperty("--tx", `${Math.cos(angle) * dist}px`);
    s.style.setProperty("--ty", `${Math.sin(angle) * dist}px`);
    s.style.animationDelay = `${Math.random() * 0.15}s`;
    elSparkle.appendChild(s);
  }
}
function showCatchPopup(name, shiny) {
  catchBubble.className = "bubble" + (shiny ? " shiny" : "");
  catchPopupText.innerHTML = shiny ? `✨ シャイニー ${name} ✨<br>を つかまえたぞ！` : `${name} を つかまえたぞ！`;
  catchPopup.classList.add("show");
}
function hideCatchPopup() { catchPopup.classList.remove("show"); }

function checkAnswer(selectedName, buttonElement) {
  if (selectedName !== currentCorrectAnswer.name) {
    buttonElement.classList.add("wrong");
    buttonElement.disabled = true;
    elStatus.className = ""; elStatus.textContent = "ざんねん… もう一度えらんでね！";
    return;
  }

  const id = currentCorrectAnswer.id;
  const isNewCatch = !gameState.pokedex.includes(id);
  const isNewShiny = currentIsShiny && !gameState.shinyPokedex.includes(id);

  buttonElement.classList.add("correct");
  optionButtons.forEach(btn => (btn.disabled = true));
  clearTimeout(questionTimer);

  gameState.score += currentIsShiny ? 30 : 10;
  elScore.textContent = gameState.score;
  if (isNewCatch) gameState.pokedex.push(id);
  if (isNewShiny) gameState.shinyPokedex.push(id);
  saveGame();
  progressMission("catch", 1);
  if (currentIsShiny) progressMission("shiny", 1);

  elStatus.className = ""; elStatus.textContent = "ゲットだ〜！ 🎶";

  // ĐỌC TÊN NGAY trong thao tác chạm (iOS Safari chỉ cho TTS chạy trong cử chỉ người dùng)
  const caughtName = currentCorrectAnswer.name;
  speakName(caughtName);

  // 🎬 Hoạt cảnh ném Pokéball: lắc 3 lần -> nổ -> hiện ảnh màu + tiếng kêu
  const animToken = loadToken;
  playCatchAnimation(currentCorrectAnswer, currentIsShiny, () => {
    if (animToken !== loadToken) return;   // bé đã rời màn -> bỏ qua
    elStage.classList.add("celebrate");
    elImage.classList.add("revealed");
    playCry(id);                              // tiếng kêu Pokémon khi hiện ra (kênh riêng, ~55%)
    showCatchPopup(currentCorrectAnswer.name, currentIsShiny);
    elStatus.className = currentIsShiny ? "shiny-msg" : "";
    elStatus.textContent = currentIsShiny ? "✨ シャイニー ゲットだぜ！ ✨" : "ずかんに とうろく！ 📕";
    questionTimer = setTimeout(() => { hideCatchPopup(); nextQuestion(); }, currentIsShiny ? 1800 : 1500);
  });
}

/* ===== POKÉDEX (theo vùng đang chơi, đánh dấu Shiny + chọn 相棒) ===== */
function renderPokedex() {
  const frag = document.createDocumentFragment();
  allPokemon.forEach(p => {
    const caught = gameState.pokedex.includes(p.id);
    const isShiny = gameState.shinyPokedex.includes(p.id);
    const isBuddy = caught && gameState.currentBuddyID === p.id;
    const cell = document.createElement("div");
    cell.className = "dex-cell " + (caught ? "caught" : "locked") + (isShiny ? " shiny" : "") + (isBuddy ? " buddy" : "");
    if (caught) {
      if (isShiny) { const star = document.createElement("div"); star.className = "shiny-star"; star.textContent = "✨"; cell.appendChild(star); }
      const img = document.createElement("img");
      img.src = isShiny ? shinyArtworkUrl(p.id) : p.image;
      img.alt = p.name; img.loading = "lazy"; img.decoding = "async";
      cell.appendChild(img);
    } else {
      const ph = document.createElement("div"); ph.className = "placeholder"; ph.textContent = "？"; cell.appendChild(ph);
    }
    const idEl = document.createElement("div"); idEl.className = "dex-id"; idEl.textContent = "No." + pad(p.id);
    const nameEl = document.createElement("div"); nameEl.className = "dex-name"; nameEl.textContent = caught ? p.name : "？？？？？";
    cell.appendChild(idEl); cell.appendChild(nameEl);

    // 🐾 Nút "相棒にする" — chỉ cho Pokémon ĐÃ SỞ HỮU
    if (caught) {
      const buddyBtn = document.createElement("button");
      buddyBtn.type = "button";
      buddyBtn.className = "dex-buddy-btn" + (isBuddy ? " active" : "");
      buddyBtn.textContent = isBuddy ? "🐾 相棒" : "相棒にする";
      buddyBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        setBuddy(p.id);     // lưu currentBuddyID vào LocalStorage (chỉ 1 con)
        renderPokedex();    // vẽ lại để cập nhật huy hiệu 相棒
      });
      cell.appendChild(buddyBtn);
    }

    frag.appendChild(cell);
  });
  dexGrid.innerHTML = ""; dexGrid.appendChild(frag); dexGrid.scrollTop = 0;
  const caughtHere = allPokemon.filter(p => gameState.pokedex.includes(p.id)).length;
  dexCount.textContent = `${caughtHere} / ${allPokemon.length}`;
  dexRegionName.textContent = currentRegion ? currentRegion.name : "ポケモンずかん";
}
function openPokedex() { if (!allPokemon.length) return; renderPokedex(); dexOverlay.classList.add("open"); }
function closePokedex() { dexOverlay.classList.remove("open"); }
