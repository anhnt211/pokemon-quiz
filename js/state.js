"use strict";
/* =====================================================================
   STATE — lưu/đọc tiến trình, MIGRATE v2->v3, nhiệm vụ, danh hiệu, TTS
   ===================================================================== */

function saveGame() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState)); }
  catch (e) { console.warn("Không lưu được:", e); }
}

/* Chuẩn hóa: bổ sung trường mới nếu thiếu (an toàn ngược) */
function normalizeState() {
  gameState.score        = gameState.score || 0;
  gameState.pokedex      = Array.isArray(gameState.pokedex) ? gameState.pokedex : [];
  gameState.shinyPokedex = Array.isArray(gameState.shinyPokedex) ? gameState.shinyPokedex : [];
  gameState.candy        = gameState.candy || 0;
  gameState.missions     = gameState.missions || null;
  if (!gameState.bossDefeated || typeof gameState.bossDefeated !== "object") gameState.bossDefeated = {};

  // MIGRATE: bé nào trước đây đã mở vùng kế theo luật cũ (>=50 con ở vùng yêu cầu)
  // -> đánh dấu boss vùng đó đã hạ, để KHÔNG bị tụt tiến trình khi đổi sang khóa-bằng-boss.
  REGIONS.forEach(r => {
    if (r.requires) {
      const req = REGIONS.find(x => x.key === r.requires.region);
      if (req && gameState.bossDefeated[req.key] !== true && countCaughtInRegion(req) >= UNLOCK_NEED) {
        gameState.bossDefeated[req.key] = true;
      }
    }
  });

  // Vùng đã "thấy mở khóa": khởi tạo = các vùng đang mở (tránh ăn mừng nhầm).
  if (!Array.isArray(gameState.seenUnlocked)) {
    gameState.seenUnlocked = REGIONS.filter(r => isRegionUnlocked(r)).map(r => r.key);
  }
}

/* Phát hiện vùng VỪA mở khóa (chưa từng thấy) -> trả danh sách để ăn mừng */
function detectNewUnlocks() {
  if (!Array.isArray(gameState.seenUnlocked)) gameState.seenUnlocked = [];
  const newly = [];
  let changed = false;
  REGIONS.forEach(r => {
    if (isRegionUnlocked(r) && !gameState.seenUnlocked.includes(r.key)) {
      gameState.seenUnlocked.push(r.key);
      changed = true;
      if (r.requires) newly.push(r);   // chỉ ăn mừng vùng có điều kiện (bỏ qua Kanto mặc định)
    }
  });
  if (changed) saveGame();
  return newly;
}

/**
 * Tải tiến trình. Nếu chưa có save v3 mà có save v2 cũ -> TỰ ĐỘNG MIGRATE:
 * giữ nguyên score + pokedex (Pokémon đã bắt), thêm các trường mới của v3.
 */
function loadGame() {
  const rawV3 = localStorage.getItem(STORAGE_KEY);

  if (rawV3) {
    try {
      const p = JSON.parse(rawV3);
      if (p && typeof p === "object") gameState = p;
    } catch (e) { console.warn("Save v3 hỏng:", e); }
  } else {
    // ---- MIGRATE v2 -> v3 ----
    const rawV2 = localStorage.getItem(STORAGE_KEY_OLD);
    if (rawV2) {
      try {
        const old = JSON.parse(rawV2);
        gameState = {
          score:        (old && typeof old.score === "number") ? old.score : 0,
          pokedex:      (old && Array.isArray(old.pokedex)) ? old.pokedex : [],
          shinyPokedex: [],     // v2 chưa có shiny
          candy:        0,      // v2 chưa có kẹo
          missions:     null    // sẽ sinh nhiệm vụ mới trong ngày
        };
        normalizeState();
        saveGame();             // ghi sang khóa v3 (giữ v2 làm bản dự phòng)
        console.log("🔄 Đã chuyển tiến trình v2 → v3:", gameState);
      } catch (e) { console.warn("Migrate v2 lỗi:", e); }
    }
  }
  normalizeState();
}

/* ===== Đếm / mở khóa vùng ===== */
function countCaughtInRegion(region) {
  return gameState.pokedex.filter(id => id >= region.start && id <= region.end).length;
}
/* Vùng mở khóa khi BOSS của vùng yêu cầu đã bị hạ (Kanto luôn mở) */
function isRegionUnlocked(region) {
  if (!region.requires) return true;
  return gameState.bossDefeated[region.requires.region] === true;
}

/* Số con cần thu thập để Boss 👑 xuất hiện (80% tổng vùng) */
function bossThresholdCount(region) {
  return Math.ceil((region.end - region.start + 1) * BOSS_THRESHOLD);
}
/* Boss đã hạ chưa */
function isBossDefeated(region) {
  return gameState.bossDefeated[region.key] === true;
}
/* Boss đã sẵn sàng thách đấu: vùng đã mở, đủ 80%, chưa hạ */
function isBossAvailable(region) {
  return isRegionUnlocked(region) && !isBossDefeated(region) &&
         countCaughtInRegion(region) >= bossThresholdCount(region);
}
/* ID lớn nhất trong các vùng đã mở -> phạm vi cho quiz (151/251/386/493) */
function maxUnlockedEnd() {
  let end = 0;
  REGIONS.forEach(r => { if (isRegionUnlocked(r)) end = Math.max(end, r.end); });
  return end || 151;
}

/* ===== NHIỆM VỤ HẰNG NGÀY ===== */
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
function ensureDailyMissions() {
  const today = todayStr();
  if (!gameState.missions || gameState.missions.date !== today) {
    const pool = MISSION_POOL.slice();
    shuffle(pool);
    const tasks = pool.slice(0, 2).map(m => ({
      key:m.key, icon:m.icon, label:m.label, track:m.track, target:m.target, progress:0, done:false
    }));
    gameState.missions = { date: today, tasks };
    saveGame();
  }
}
function progressMission(track, amount) {
  if (!gameState.missions) return;
  let rewarded = 0;
  gameState.missions.tasks.forEach(t => {
    if (t.track === track && !t.done) {
      t.progress = Math.min(t.target, t.progress + amount);
      if (t.progress >= t.target) { t.done = true; gameState.candy += MISSION_REWARD; rewarded++; }
    }
  });
  if (rewarded > 0) showOakReward(rewarded);
  saveGame();
  updateCandyDisplays();
  renderMissions();
}
function renderMissions() {
  if (!missionList || !gameState.missions) return;   // khung nhiệm vụ đã ẩn khỏi main
  missionList.innerHTML = "";
  gameState.missions.tasks.forEach(t => {
    const item = document.createElement("div");
    item.className = "mission-item" + (t.done ? " done" : "");
    item.innerHTML = `
      <span class="mission-icon">${t.icon}</span>
      <span class="mission-body">
        <span class="mission-label">${t.label}</span>
        <span class="mission-prog">${t.progress} / ${t.target}　${t.done ? "クリア！🍬+50" : ""}</span>
      </span>
      <span class="mission-check">${t.done ? "✅" : "⬜"}</span>`;
    missionList.appendChild(item);
  });
}
function showOakReward(count) {
  oakPopup.innerHTML = `よくやった！ オーキド博士から ごほうびだ！<br><span class="candy">🍬 +${MISSION_REWARD * count}</span>`;
  oakPopup.classList.add("show");
  clearTimeout(oakTimer);
  oakTimer = setTimeout(() => oakPopup.classList.remove("show"), 2800);
}

/* ===== DANH HIỆU TRAINER + THẺ ===== */
function getTrainerRank(total) {
  if (total <= 20)  return "ルーキートレーナー";
  if (total <= 50)  return "ノーマルトレーナー";
  if (total <= 150) return "ジムリーダー";
  if (total <= 300) return "四天王";
  return "ポケモンマスター";
}
function updateCandyDisplays() {
  const c = gameState.candy || 0;
  homeCandy.textContent = c;
  quizCandy.textContent = c;
}
function renderTrainerCard() {
  const total = gameState.pokedex.length + gameState.shinyPokedex.length;
  trainerRankEl.textContent = getTrainerRank(total);
  homeScore.textContent = gameState.score;
  statCaught.textContent = gameState.pokedex.length;
  statShiny.textContent = gameState.shinyPokedex.length;
  const pct = Math.min(100, Math.round(gameState.pokedex.length / TOTAL_POKEMON * 100));
  progressPct.textContent = pct + "%";
  progressFill.style.width = pct + "%";
  updateCandyDisplays();
}

/* (speakName đã chuyển sang js/audio.js với việc chọn giọng ja-JP chất lượng cao) */
