"use strict";
/* =====================================================================
   GAME — Home, điều hướng màn, vòng chơi đoán bóng (+Shiny), Pokédex
   ===================================================================== */

/* ===== HOME ===== */
function renderHome() {
  ensureDailyMissions();
  renderTrainerCard();
  renderMissions();

  adventureMap.innerHTML = "";
  const newlyUnlocked = detectNewUnlocks();

  // Vùng "hiện tại" = vùng mở khóa cao nhất (tiền tuyến thám hiểm)
  let currentKey = null;
  REGIONS.forEach(r => { if (isRegionUnlocked(r)) currentKey = r.key; });

  REGIONS.forEach((r, idx) => {
    const unlocked = isRegionUnlocked(r);
    const caught = countCaughtInRegion(r);
    const total = r.end - r.start + 1;
    const pct = Math.round(caught / total * 100);
    const isCurrent = r.key === currentKey;
    const isNew = newlyUnlocked.some(n => n.key === r.key);

    // Một hàng = cọc mốc (pin) trên đường mòn + ô địa hình
    const row = document.createElement("div");
    row.className = "map-row" + (unlocked ? "" : " locked") + (isCurrent ? " current" : "");
    row.style.setProperty("--rc", r.color);

    const pin = document.createElement("div");
    pin.className = "map-pin";
    pin.innerHTML = `${isCurrent ? '<span class="pin-now">📍</span>' : ""}<span class="pin-dot">${unlocked ? (idx + 1) : "🔒"}</span>`;

    const tile = document.createElement(unlocked ? "button" : "div");
    tile.className = "map-tile " + r.key + (unlocked ? "" : " locked") + (isNew ? " just-unlocked" : "");

    let bottomHTML;
    if (unlocked) {
      bottomHTML = `
        <div class="tile-bottom">
          <div class="tile-prog-label">つかまえた数: ${caught} / ${total}</div>
          <div class="tile-prog-bar"><div class="tile-prog-fill" style="width:${pct}%"></div></div>
        </div>`;
    } else {
      const req = REGIONS.find(x => x.key === r.requires.region);
      const have = countCaughtInRegion(req);
      bottomHTML = `
        <div class="tile-locked-info">
          <span class="lock-ico">🔒</span>
          <span class="lock-text">${req.short}で ${r.requires.count}ひき つかまえると ほかのちほうが ひらくぞ！（いま ${have}/${r.requires.count}）</span>
        </div>`;
    }

    tile.innerHTML = `
      <div class="tile-scene scene-${r.key}"></div>
      <div class="tile-overlay">
        <div class="tile-top">
          <span class="tile-emoji">${unlocked ? r.emoji : "🔒"}</span>
          <span class="tile-name">${r.name}</span>
          ${unlocked ? '<span class="tile-go">▶</span>' : ""}
        </div>
        ${bottomHTML}
      </div>`;

    if (unlocked) tile.addEventListener("click", () => enterRegion(r));

    row.appendChild(pin);
    row.appendChild(tile);
    adventureMap.appendChild(row);
  });

  // 🎉 Ăn mừng nếu vừa mở khóa vùng mới
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
  homeScreen.style.display = name === "home" ? "block" : "none";
  gameScreen.style.display = name === "game" ? "block" : "none";
  quizScreen.style.display = name === "quiz" ? "block" : "none";
}

function goHome() {
  loadToken++;
  clearTimeout(questionTimer);
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  closePokedex();
  hideCatchPopup();
  currentRegion = null;
  renderHome();
  showScreen("home");
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

  elImage.classList.remove("silhouette");
  elImage.classList.add("revealed");
  speakName(currentCorrectAnswer.name);
  buttonElement.classList.add("correct");
  optionButtons.forEach(btn => (btn.disabled = true));

  gameState.score += currentIsShiny ? 30 : 10;
  elScore.textContent = gameState.score;
  if (isNewCatch) gameState.pokedex.push(id);
  if (isNewShiny) gameState.shinyPokedex.push(id);
  saveGame();

  progressMission("catch", 1);
  if (currentIsShiny) progressMission("shiny", 1);

  if (currentIsShiny) {
    elStage.classList.add("celebrate");
    launchSparkles();
    showCatchPopup(currentCorrectAnswer.name, true);
    elStatus.className = "shiny-msg"; elStatus.textContent = "✨ シャイニー ゲットだぜ！ ✨";
    questionTimer = setTimeout(() => { hideCatchPopup(); nextQuestion(); }, 3000);
  } else if (isNewCatch) {
    elStage.classList.add("celebrate");
    launchSparkles();
    showCatchPopup(currentCorrectAnswer.name, false);
    elStatus.className = ""; elStatus.textContent = "ずかんに とうろく！ 📕";
    questionTimer = setTimeout(() => { hideCatchPopup(); nextQuestion(); }, 2800);
  } else {
    elStatus.className = ""; elStatus.textContent = `せいかい！ ${currentCorrectAnswer.name}！`;
    questionTimer = setTimeout(nextQuestion, 1800);
  }
}

/* ===== POKÉDEX (theo vùng đang chơi, đánh dấu Shiny) ===== */
function renderPokedex() {
  const frag = document.createDocumentFragment();
  allPokemon.forEach(p => {
    const caught = gameState.pokedex.includes(p.id);
    const isShiny = gameState.shinyPokedex.includes(p.id);
    const cell = document.createElement("div");
    cell.className = "dex-cell " + (caught ? "caught" : "locked") + (isShiny ? " shiny" : "");
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
    frag.appendChild(cell);
  });
  dexGrid.innerHTML = ""; dexGrid.appendChild(frag); dexGrid.scrollTop = 0;
  const caughtHere = allPokemon.filter(p => gameState.pokedex.includes(p.id)).length;
  dexCount.textContent = `${caughtHere} / ${allPokemon.length}`;
  dexRegionName.textContent = currentRegion ? currentRegion.name : "ポケモンずかん";
}
function openPokedex() { if (!allPokemon.length) return; renderPokedex(); dexOverlay.classList.add("open"); }
function closePokedex() { dexOverlay.classList.remove("open"); }
