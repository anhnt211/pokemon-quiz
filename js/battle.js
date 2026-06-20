"use strict";
/* =====================================================================
   BATTLE — ポケモンバトル: chọn quân, đấu turn-based, khắc hệ, animation
   ===================================================================== */

/* Khắc hệ cơ bản (atk -> các hệ bị khắc) */
const SUPER_EFF = { water: ["fire"], fire: ["grass"], grass: ["water"], electric: ["water"] };
/* Tên chiêu theo hệ (cho vui) */
const MOVE_JP = { electric: "10まんボルト", fire: "ひのこ", water: "みずでっぽう", grass: "はっぱカッター" };
/* Màu chớp theo hệ */
const FLASH_COLOR = { electric: "#ffe600", fire: "#ff5722", water: "#29b6f6", grass: "#66bb6a" };

let myFighter = null, foeFighter = null;
let battleTimer = null, battleToken = 0;
let battleOrder = [], battleTurnIndex = 0, battleOver = false;
let bossMode = false, bossRegion = null;   // chế độ đấu Boss
let foeDynamax = false, zUsed = false;      // Dynamax đối thủ / đã dùng Z-Move chưa

/* ===== Lấy "đấu sĩ" (stats + types + tên + ảnh) ===== */
async function getFighter(id) {
  const res = await fetch(`${API_BASE}/pokemon/${id}`);
  if (!res.ok) throw new Error("fighter " + id);
  const d = await res.json();
  const stat = n => { const s = d.stats.find(x => x.stat.name === n); return s ? s.base_stat : 50; };
  const name = await getJapaneseName(id);          // dùng lại helper ở quiz.js
  const maxHp = Math.round(stat("hp") * 2 + 20);   // nhân đôi + đệm để đấu được nhiều lượt
  return {
    id, name, image: artworkUrl(id),
    types: d.types.map(t => t.type.name),
    maxHp, hp: maxHp,
    atk: stat("attack"), def: stat("defense"), spd: stat("speed")
  };
}

/* ===== Vào màn Battle thường ===== */
function enterBattle() {
  stopBattle();
  bossMode = false; bossRegion = null;
  arenaEl.classList.remove("boss");
  foeSide.classList.remove("boss", "dyna");
  zmoveBtn.style.display = "none";
  showScreen("battle");
  battleResult.classList.remove("show");
  battleArena.style.display = "none";
  battleChoose.style.display = "block";
  renderChooser();
  bgmStart("battle");      // nhạc nền trận đấu
}

/* ===== Vào màn đấu BOSS ===== */
function enterBossBattle(region) {
  stopBattle();
  bossMode = true; bossRegion = region;
  arenaEl.classList.add("boss");        // nền tối + rung
  foeSide.classList.remove("dyna");
  foeSide.classList.add("boss");        // boss phóng to
  zmoveBtn.style.display = "none";
  showScreen("battle");
  battleResult.classList.remove("show");
  battleArena.style.display = "none";
  battleChoose.style.display = "block";
  renderChooser();
  bgmStart("boss");        // nhạc nền Boss (kịch tính hơn)
}

function stopBattle() {
  battleToken++;
  clearTimeout(battleTimer);
  battleOver = true;
  bgmStop();              // dừng nhạc nền trận đấu ngay
}

/* ===== Bước 1: chọn quân từ pokedex (đã bắt) ===== */
function renderChooser() {
  chooseGrid.innerHTML = "";
  const caught = gameState.pokedex.slice().sort((a, b) => a - b);
  if (caught.length === 0) {
    chooseGrid.innerHTML = '<p class="choose-empty">まだ ポケモンを つかまえていないよ！<br>「ポケモンGET」で つかまえてから きてね。</p>';
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
    btn.addEventListener("click", () => chooseMyPokemon(id));
    chooseGrid.appendChild(btn);
  });
}

/* Bốc đối thủ: ưu tiên 1 con khác trong pokedex, không thì ngẫu nhiên trong vùng đã mở */
function pickOpponent(myId) {
  const others = gameState.pokedex.filter(id => id !== myId);
  if (others.length > 0) return others[Math.floor(Math.random() * others.length)];
  const max = maxUnlockedEnd();
  let r;
  do { r = 1 + Math.floor(Math.random() * max); } while (r === myId && max > 1);
  return r;
}

/* ===== Bước 2: chuẩn bị sàn đấu ===== */
async function chooseMyPokemon(id) {
  const myToken = ++battleToken;
  battleOver = false;
  zUsed = false; zmoveBtn.style.display = "none";
  foeDynamax = false; foeSide.classList.remove("dyna");
  battleChoose.style.display = "none";
  battleArena.style.display = "block";
  battleResult.classList.remove("show");
  battleStartBtn.style.display = "";
  battleStartBtn.disabled = true;
  logClear();
  log("じゅんびちゅう...");

  const oppId = bossMode ? bossRegion.boss.id : pickOpponent(id);
  try {
    const [mine, foe] = await Promise.all([getFighter(id), getFighter(oppId)]);
    if (myToken !== battleToken) return;
    if (bossMode) {                          // Boss: HP gốc ×1.5
      foe.maxHp = Math.round(foe.maxHp * BOSS_HP_MULT);
      foe.hp = foe.maxHp;
    } else if (Math.random() < 0.05) {       // 5% Dynamax (chỉ battle thường): HP & Attack ×2
      foeDynamax = true;
      foe.maxHp = foe.maxHp * 2; foe.hp = foe.maxHp;
      foe.atk = foe.atk * 2;
      foeSide.classList.add("dyna");
    }
    myFighter = mine; foeFighter = foe;
    renderFighters();
    logClear();
    if (bossMode) log(`でた〜！ でんせつの ${foe.name}！`);
    else if (foeDynamax) log(`おや…！？ ${foe.name} が ダイマックスした！`);
    else log(`${foe.name} が あらわれた！`);
    log(`いけ！ ${mine.name}！`);
    playCry(oppId);                          // tiếng kêu đối thủ khi xuất hiện
    battleStartBtn.disabled = false;
  } catch (e) {
    console.error(e);
    log("読み込み失敗… もどってね");
  }
}

function renderFighters() {
  myImg.src = myFighter.image;  myImg.alt = myFighter.name;  myName.textContent = myFighter.name;
  foeImg.src = foeFighter.image; foeImg.alt = foeFighter.name; foeName.textContent = foeFighter.name;
  mySide.classList.remove("fainted", "attack-up", "hit");
  foeSide.classList.remove("fainted", "attack-down", "hit");
  updateHp();
}
function setHp(el, f) {
  const pct = Math.max(0, Math.round(f.hp / f.maxHp * 100));
  el.style.width = pct + "%";
  el.className = "hp-fill" + (pct <= 25 ? " low" : (pct <= 50 ? " mid" : ""));
}
function updateHp() { setHp(myHp, myFighter); setHp(foeHp, foeFighter); maybeShowZMove(); }

/* Hiện nút Z-Move khi đấu Boss và HP của bé < 50% (1 lần/trận) */
function maybeShowZMove() {
  if (bossMode && !zUsed && !battleOver && myFighter && myFighter.hp > 0 &&
      (myFighter.hp / myFighter.maxHp) < 0.5) {
    zmoveBtn.style.display = "";
  }
}

/* ===== Bắt đầu đấu (turn-based) ===== */
function startBattle() {
  if (!myFighter || !foeFighter || battleOver) return;
  battleStartBtn.disabled = true;
  battleStartBtn.style.display = "none";
  // Con nhanh hơn đánh trước
  battleOrder = (myFighter.spd >= foeFighter.spd)
    ? [["mine", "foe"], ["foe", "mine"]]
    : [["foe", "mine"], ["mine", "foe"]];
  battleTurnIndex = 0;
  const token = battleToken;
  battleTimer = setTimeout(() => battleStep(token), 600);
}

function battleStep(token) {
  if (token !== battleToken || battleOver) return;
  const [atkSide, defSide] = battleOrder[battleTurnIndex % 2];
  performAttack(atkSide, defSide);
  battleTurnIndex++;
  if (myFighter.hp <= 0 || foeFighter.hp <= 0) {
    battleTimer = setTimeout(() => finishBattle(token), 1300);
    return;
  }
  battleTimer = setTimeout(() => battleStep(token), 1500);   // 1.5s mỗi lượt
}

function performAttack(atkSide, defSide) {
  const atk = atkSide === "mine" ? myFighter : foeFighter;
  const def = defSide === "mine" ? myFighter : foeFighter;
  const atkEl = atkSide === "mine" ? mySide : foeSide;
  const defEl = defSide === "mine" ? mySide : foeSide;

  // Hệ + chiêu
  const atkType = atk.types.find(t => SUPER_EFF[t]) || atk.types[0];
  const move = MOVE_JP[atkType] || "たいあたり";

  // Sát thương
  let dmg = Math.max(1, atk.atk - def.def);
  const superEff = atk.types.some(t => (SUPER_EFF[t] || []).some(x => def.types.includes(x)));
  if (superEff) dmg = Math.round(dmg * 2);

  // Animation: người công lao lên
  atkEl.classList.add(atkSide === "mine" ? "attack-up" : "attack-down");
  setTimeout(() => atkEl.classList.remove("attack-up", "attack-down"), 420);

  log(`${atk.name} の ${move}！`);

  // Khi đòn "chạm": trừ máu + rung + chớp hệ + VFX toàn màn theo hệ
  setTimeout(() => {
    def.hp = Math.max(0, def.hp - dmg);
    updateHp();
    defEl.classList.add("hit");
    flashType(atkType);
    playSkillVFX(atkType);                 // VFX toàn màn (điện/lửa/nước)
    playSfx(atkType);                      // SFX đồng bộ NGAY lúc nhấp nháy
    setTimeout(() => defEl.classList.remove("hit"), 460);
    if (superEff) log("こうかは ばつぐんだ！");
    if (def.hp <= 0) defEl.classList.add("fainted");
  }, 360);
}

function flashType(type) {
  const c = FLASH_COLOR[type];
  if (!c) return;
  typeFlash.style.background = c;
  typeFlash.classList.remove("on");
  void typeFlash.offsetWidth;   // ép reflow để chạy lại animation
  typeFlash.classList.add("on");
}

function log(msg) {
  const line = document.createElement("div");
  line.className = "log-line";
  line.textContent = msg;
  battleLog.appendChild(line);
  battleLog.scrollTop = battleLog.scrollHeight;
}
function logClear() { battleLog.innerHTML = ""; }
function logBig(msg) {
  const line = document.createElement("div");
  line.className = "log-line big";
  line.textContent = msg;
  battleLog.appendChild(line);
  battleLog.scrollTop = battleLog.scrollHeight;
}

/* ===== Z-MOVE (chỉ Boss): cutscene 2s -> siêu sát thương ===== */
function activateZMove() {
  if (!bossMode || zUsed || battleOver || !myFighter || !foeFighter) return;
  zUsed = true;
  zmoveBtn.style.display = "none";
  clearTimeout(battleTimer);                 // tạm dừng auto-battle
  const token = battleToken;

  playZCutscene(myFighter.image);            // cutscene 2 giây
  setTimeout(() => {
    if (token !== battleToken || battleOver) return;
    const dmg = Math.round(foeFighter.maxHp * 0.5);   // siêu sát thương
    foeFighter.hp = Math.max(0, foeFighter.hp - dmg);
    updateHp();
    foeSide.classList.add("hit");
    flashType("electric"); playSkillVFX("electric"); playSfx("electric");
    setTimeout(() => foeSide.classList.remove("hit"), 460);
    logBig("究極のZワザが 炸裂した！");
    if (foeFighter.hp <= 0) {
      foeSide.classList.add("fainted");
      battleTimer = setTimeout(() => finishBattle(token), 1300);
    } else {
      battleTimer = setTimeout(() => battleStep(token), 1500);   // tiếp tục đấu
    }
  }, 2000);
}

/* ===== Kết thúc ===== */
function finishBattle(token) {
  if (token !== battleToken) return;
  battleOver = true;
  bgmStop();              // trận đấu kết thúc -> tắt nhạc nền, trả lại yên tĩnh
  const win = myFighter.hp > 0;

  if (bossMode) { finishBossBattle(win); return; }

  // Battle thường (Dynamax thắng -> thưởng lớn 300)
  const winner = win ? myFighter : foeFighter;
  log(`${winner.name} の かち！`);
  let reward;
  if (win) {
    const gain = foeDynamax ? 300 : 100;
    gameState.candy += gain; saveGame(); updateCandyDisplays();
    reward = `<span class="result-reward">🍬 +${gain}${foeDynamax ? "（ダイマックス げきは！）" : ""}</span>`;
  } else {
    reward = `<span class="result-reward">またチャレンジしてね！</span>`;
  }
  resultText.innerHTML = `${win ? "🎉" : "😢"} ${winner.name} の かち！${reward}`;
  setResultButtons("normal");
  battleResult.classList.add("show");
}

/* ===== Kết thúc đấu BOSS ===== */
function finishBossBattle(win) {
  const boss = foeFighter;
  if (win) {
    gameState.bossDefeated[bossRegion.key] = true;   // mở khóa vùng kế
    gameState.candy += 500;
    saveGame(); updateCandyDisplays();
    log(`${boss.name} を たおした！`);
    resultText.innerHTML = `🎆 すごすぎる！<br>${boss.name} を たおしたぞ！<span class="result-reward">🍬 +500</span>`;
    setResultButtons("bossWin");
    launchBattleFireworks();
  } else {
    log(`${myFighter.name} は たおれた…`);
    resultText.innerHTML = `😢 おしい！まけてしまった…<span class="result-sub">ポケモンを しんか させて リベンジしよう！</span>`;
    setResultButtons("bossLose");
  }
  battleResult.classList.add("show");
}

/* Gán nút kết quả theo ngữ cảnh */
function setResultButtons(mode) {
  if (mode === "bossWin") {
    battleAgainBtn.style.display = "none";
    battleHomeBtn.textContent = "🗺️ マップへ";
    battleHomeBtn.onclick = () => { stopBattle(); goGetMap(); };   // ra bản đồ xem vùng mới sáng
  } else if (mode === "bossLose") {
    battleAgainBtn.style.display = "";
    battleAgainBtn.textContent = "⚔️ リベンジ";
    battleAgainBtn.onclick = () => enterBossBattle(bossRegion);
    battleHomeBtn.textContent = "🏠 ホームへ";
    battleHomeBtn.onclick = () => { stopBattle(); goHome(); };
  } else { // normal
    battleAgainBtn.style.display = "";
    battleAgainBtn.textContent = "⚔️ もういちど";
    battleAgainBtn.onclick = () => enterBattle();
    battleHomeBtn.textContent = "🏠 ホームへ";
    battleHomeBtn.onclick = () => { stopBattle(); goHome(); };
  }
}

/* Pháo hoa khi hạ Boss */
function launchBattleFireworks() {
  const emojis = ["🎆", "✨", "🎉", "⭐", "💥", "🌟"];
  for (let i = 0; i < 24; i++) {
    const s = document.createElement("span");
    s.className = "sparkle";
    s.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    const angle = (Math.PI * 2 * i) / 24 + Math.random() * 0.4;
    const dist = 120 + Math.random() * 120;
    s.style.setProperty("--tx", `${Math.cos(angle) * dist}px`);
    s.style.setProperty("--ty", `${Math.sin(angle) * dist}px`);
    s.style.animationDelay = `${Math.random() * 0.3}s`;
    battleResult.appendChild(s);
    setTimeout(() => s.remove(), 1400);
  }
}
