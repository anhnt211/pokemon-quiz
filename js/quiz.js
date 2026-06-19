"use strict";
/* =====================================================================
   QUIZ — sinh câu hỏi vô hạn (3 dạng); kho dữ liệu theo VÙNG ĐÃ MỞ
   ===================================================================== */

async function enterQuiz() {
  const myToken = ++loadToken;
  showScreen("quiz");
  clearTimeout(questionTimer);
  quizStatusEl.textContent = "";
  quizQuestionEl.textContent = "クイズの じゅんびちゅう...";
  quizOptionButtons.forEach(b => { b.disabled = true; b.textContent = "？"; b.className = "btn-option"; b.style.display = ""; });
  updateCandyDisplays();

  // Phạm vi quiz = mọi vùng đã mở khóa (151 / 251 / 386 / 493)
  const desiredEnd = maxUnlockedEnd();
  quizRangeEl.textContent = `クイズ：No.001〜No.${pad(desiredEnd)}`;

  // Chỉ nạp thêm phần còn thiếu (tăng dần, không tải lại từ đầu)
  if (quizPoolEnd < desiredEnd) {
    try {
      const data = await fetchPokemonData(quizPoolEnd + 1, desiredEnd, myToken);
      if (myToken !== loadToken || !data) return;
      quizPool.push(...data);
      quizPool.sort((a, b) => a.id - b.id);
      quizPoolEnd = desiredEnd;
    } catch (e) { quizQuestionEl.textContent = "読み込み失敗…"; return; }
  }
  if (myToken !== loadToken) return;
  startQuizRound();
}

function startQuizRound() {
  quizIndex = 0; quizCorrectCount = 0; usedQuizPokemonIds = [];
  generateInfiniteQuiz();
}

function pickQuizPokemon() {
  let pool = quizPool.filter(p => !usedQuizPokemonIds.includes(p.id));
  if (pool.length === 0) { usedQuizPokemonIds = []; pool = quizPool.slice(); }
  return pool[Math.floor(Math.random() * pool.length)];
}
function pickWrongNames(excludeId, n) {
  const out = [];
  const pool = quizPool.filter(p => p.id !== excludeId);
  while (out.length < n && pool.length) {
    const idx = Math.floor(Math.random() * pool.length);
    out.push(pool.splice(idx, 1)[0].name);
  }
  return out;
}

async function generateInfiniteQuiz() {
  if (quizIndex >= QUIZ_ROUND) { showQuizResult(); return; }
  quizProgressEl.textContent = `だい ${quizIndex + 1} / ${QUIZ_ROUND} もん`;
  quizStatusEl.textContent = "";
  quizOptionButtons.forEach(b => { b.disabled = true; b.className = "btn-option"; });

  const type = Math.floor(Math.random() * 3) + 1;   // 1..3
  try {
    if (type === 1) await buildTypeQuiz();
    else if (type === 2) buildIdQuiz();
    else await buildWeightQuiz();
  } catch (e) {
    console.warn("Sinh quiz lỗi, dùng dạng số thứ tự:", e);
    buildIdQuiz();   // fallback không cần mạng
  }
}

/* DẠNG 1: Hỏi về Hệ */
async function buildTypeQuiz() {
  const subj = pickQuizPokemon();
  quizQuestionEl.textContent = "かんがえちゅう... 🤔";
  const detail = await getPokemonDetail(subj.id);
  usedQuizPokemonIds.push(subj.id);
  const correct = TYPE_JP[detail.types[0]] || detail.types[0];
  const others = Object.values(TYPE_JP).filter(t => t !== correct);
  shuffle(others);
  const options = shuffle([correct, ...others.slice(0, 3)]);
  quizQuestionEl.textContent = `${subj.name} の タイプは なんだ？`;
  renderQuizOptions(options.map(t => ({ label: t, value: t })), correct);
}

/* DẠNG 2: Hỏi về Số thứ tự */
function buildIdQuiz() {
  const subj = pickQuizPokemon();
  usedQuizPokemonIds.push(subj.id);
  const options = shuffle([subj.name, ...pickWrongNames(subj.id, 3)]);
  quizQuestionEl.textContent = `ずかんばんごう No.${pad(subj.id)} の ポケモンは だれだ？`;
  renderQuizOptions(options.map(n => ({ label: n, value: n })), subj.name);
}

/* DẠNG 3: So sánh cân nặng */
async function buildWeightQuiz() {
  const a = pickQuizPokemon();
  let b = pickQuizPokemon(); let guard = 0;
  while (b.id === a.id && guard < 10) { b = pickQuizPokemon(); guard++; }
  usedQuizPokemonIds.push(a.id, b.id);
  quizQuestionEl.textContent = "かんがえちゅう... 🤔";
  const [da, db] = await Promise.all([getPokemonDetail(a.id), getPokemonDetail(b.id)]);
  const heavier = da.weight >= db.weight ? a : b;
  quizQuestionEl.textContent = `${a.name} と ${b.name}、どっちが おもい？`;
  renderQuizOptions([{ label: a.name, value: a.name }, { label: b.name, value: b.name }], heavier.name);
}

function renderQuizOptions(options, correctValue) {
  quizOptionButtons.forEach((btn, i) => {
    btn.className = "btn-option";
    if (i < options.length) {
      btn.style.display = ""; btn.disabled = false;
      btn.textContent = options[i].label;
      btn.onclick = () => answerQuiz(options[i].value, btn, correctValue);
    } else {
      btn.style.display = "none"; btn.disabled = true; btn.onclick = null;
    }
  });
}

function answerQuiz(selected, btn, correctValue) {
  quizOptionButtons.forEach(b => (b.disabled = true));
  if (selected === correctValue) {
    btn.classList.add("correct");
    quizCorrectCount++;
    gameState.score += 5;
    gameState.candy += QUIZ_CANDY;
    saveGame();
    updateCandyDisplays();
    speakName(selected);
    quizStatusEl.textContent = `せいかい！ 🍬+${QUIZ_CANDY}`;
    progressMission("quizCorrect", 1);
  } else {
    btn.classList.add("wrong");
    quizOptionButtons.forEach(b => { if (b.style.display !== "none" && b.textContent === correctValue) b.classList.add("correct"); });
    quizStatusEl.textContent = `ざんねん… こたえは「${correctValue}」`;
  }
  quizIndex++;
  questionTimer = setTimeout(generateInfiniteQuiz, 1800);
}

function showQuizResult() {
  const earned = quizCorrectCount * QUIZ_CANDY;
  quizProgressEl.textContent = "けっか";
  quizQuestionEl.innerHTML = `クイズ しゅうりょう！🎉<br>5もんちゅう <span style="color:#ee1515;">${quizCorrectCount}</span> もん せいかい！`;
  quizStatusEl.textContent = `🍬 ${earned}こ ゲット！`;
  usedQuizPokemonIds = [];   // reset cho lượt sau

  quizOptionButtons.forEach((b, i) => {
    b.className = "btn-option"; b.disabled = false; b.style.display = i < 2 ? "" : "none";
  });
  quizOptionButtons[0].textContent = "もう1かい 🔁";
  quizOptionButtons[0].onclick = () => startQuizRound();
  quizOptionButtons[1].textContent = "ホームへ 🏠";
  quizOptionButtons[1].onclick = () => goHome();
}
