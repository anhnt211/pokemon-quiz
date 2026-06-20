"use strict";
/* =====================================================================
   POKÉMON PUZZLE — ポケモン パズル: xếp hình 4x4, tap 2 mảnh để ĐỔI CHỖ
   ===================================================================== */
const PUZZLE_N = 4;                                   // lưới 4x4 = 16 mảnh
const PUZZLE_GRAD = "linear-gradient(135deg,#ffe29a,#a0e9ff,#bd93ff,#ffa9d6)";

let puzzleId = null, puzzleOrder = [], puzzleSel = -1, puzzleSolved = false;

/* Vào màn puzzle */
function enterPuzzle() {
  if (typeof leaveActive === "function") leaveActive();
  showScreen("puzzle");
  newPuzzle();
}

/* Chọn Pokémon: ưu tiên con đã bắt; không có thì ngẫu nhiên trong vùng đã mở */
function pickPuzzlePokemon() {
  const caught = gameState.pokedex;
  if (caught.length) return caught[Math.floor(Math.random() * caught.length)];
  return 1 + Math.floor(Math.random() * maxUnlockedEnd());
}

/* Ván mới */
function newPuzzle() {
  puzzleSolved = false; puzzleSel = -1;
  puzzleId = pickPuzzlePokemon();
  puzzleGrid.classList.remove("solved");
  puzzleResult.classList.remove("show");
  puzzleStatus.textContent = "ピースを 2つ タップして いれかえてね！";

  const total = PUZZLE_N * PUZZLE_N;
  do { puzzleOrder = shuffle(Array.from({ length: total }, (_, i) => i)); } while (isPuzzleSolved());

  // Ảnh mẫu (おてほん) = ảnh hoàn chỉnh trên nền gradient
  const art = artworkUrl(puzzleId);
  puzzleRef.style.backgroundImage = `url("${art}"), ${PUZZLE_GRAD}`;
  puzzleRef.style.backgroundSize = "contain, cover";
  puzzleRef.style.backgroundRepeat = "no-repeat, no-repeat";
  puzzleRef.style.backgroundPosition = "center, center";

  renderPuzzle();
}

/* Vị trí nền cho mảnh số p (cắt ảnh + gradient theo lưới 4x4) */
function pieceBgPosition(p) {
  const col = p % PUZZLE_N, row = Math.floor(p / PUZZLE_N);
  const px = (col / (PUZZLE_N - 1)) * 100;
  const py = (row / (PUZZLE_N - 1)) * 100;
  return `${px}% ${py}%`;
}

function renderPuzzle() {
  const art = artworkUrl(puzzleId);
  const sz = `${PUZZLE_N * 100}% ${PUZZLE_N * 100}%`;
  puzzleGrid.innerHTML = "";
  puzzleOrder.forEach((piece, cell) => {
    const t = document.createElement("button");
    t.className = "puzzle-piece"
      + (piece === cell ? " correct" : "")     // đúng vị trí -> viền xanh
      + (cell === puzzleSel ? " sel" : "");     // đang chọn
    const pos = pieceBgPosition(piece);
    t.style.backgroundImage = `url("${art}"), ${PUZZLE_GRAD}`;
    t.style.backgroundSize = `${sz}, ${sz}`;
    t.style.backgroundPosition = `${pos}, ${pos}`;
    t.addEventListener("click", () => tapPiece(cell));
    puzzleGrid.appendChild(t);
  });
}

/* Tap: chọn mảnh A rồi mảnh B -> tự đổi chỗ */
function tapPiece(cell) {
  if (puzzleSolved) return;
  if (puzzleSel === -1) { puzzleSel = cell; renderPuzzle(); return; }
  if (puzzleSel === cell) { puzzleSel = -1; renderPuzzle(); return; }  // bấm lại -> bỏ chọn
  const a = puzzleSel, b = cell;
  const tmp = puzzleOrder[a]; puzzleOrder[a] = puzzleOrder[b]; puzzleOrder[b] = tmp;
  puzzleSel = -1;
  renderPuzzle();
  if (isPuzzleSolved()) winPuzzle();
}

function isPuzzleSolved() { return puzzleOrder.every((p, i) => p === i); }

/* Hoàn thành */
function winPuzzle() {
  puzzleSolved = true;
  puzzleSel = -1;
  renderPuzzle();
  puzzleGrid.classList.add("solved");
  puzzleStatus.textContent = "✨ かんせい！ ✨";

  playCry(puzzleId);                       // tiếng kêu chuẩn của Pokémon

  gameState.candy += 150;                  // thưởng 150 kẹo
  const newCatch = !gameState.pokedex.includes(puzzleId);
  if (newCatch) gameState.pokedex.push(puzzleId);   // tự thu phục nếu chưa có
  saveGame();
  updateCandyDisplays();
  progressMission("puzzle", 1);                      // nhiệm vụ パズル
  if (newCatch) progressMission("catch", 1);         // tính như 1 lần thu phục

  getJapaneseName(puzzleId).then(nm => {
    speakName(nm);
    puzzleResultText.innerHTML =
      `🧩 パズル かんせい！<span class="big">${nm}</span>`
      + (newCatch ? '<span class="result-sub">ずかんに とうろく！ 📕</span>' : '')
      + `<span class="result-reward">🍬 +150</span>`;
    puzzleResult.classList.add("show");
  }).catch(() => {
    puzzleResultText.innerHTML = `🧩 パズル かんせい！<span class="result-reward">🍬 +150</span>`;
    puzzleResult.classList.add("show");
  });
}
