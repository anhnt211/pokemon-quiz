"use strict";
/* =====================================================================
   QUIZ — sinh câu hỏi vô hạn (4 dạng: Hệ xuôi / Tiến hóa / Hệ ngược / Cân nặng)
   Kho dữ liệu theo VÙNG ĐÃ MỞ.
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
/* Lấy n tên SAI ngẫu nhiên, loại trừ theo ID và theo tên */
function pickWrongNames(excludeIds, n, excludeNames) {
  const exIds = Array.isArray(excludeIds) ? excludeIds : [excludeIds];
  const exNames = excludeNames || [];
  const out = [];
  const pool = quizPool.filter(p => !exIds.includes(p.id) && !exNames.includes(p.name));
  while (out.length < n && pool.length) {
    const nm = pool.splice(Math.floor(Math.random() * pool.length), 1)[0].name;
    if (!out.includes(nm)) out.push(nm);
  }
  return out;
}

async function generateInfiniteQuiz() {
  if (quizIndex >= QUIZ_ROUND) { showQuizResult(); return; }
  quizProgressEl.textContent = `だい ${quizIndex + 1} / ${QUIZ_ROUND} もん`;
  quizStatusEl.textContent = "";
  quizOptionButtons.forEach(b => { b.disabled = true; b.className = "btn-option"; });

  const type = Math.floor(Math.random() * 4) + 1;   // 1..4
  try {
    if (type === 1) await buildTypeQuiz();            // Hệ xuôi
    else if (type === 2) await buildEvolutionQuiz();  // Tiến hóa
    else if (type === 3) await buildReverseTypeQuiz();// Hệ ngược
    else await buildWeightQuiz();                     // So cân nặng
  } catch (e) {
    console.warn("Sinh quiz lỗi, fallback Hệ xuôi:", e);
    try { await buildTypeQuiz(); } catch (_) {}
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

/* ===== Dữ liệu phụ cho Tiến hóa & Hệ ngược (có cache) ===== */
let speciesCache = {};
let chainCache = {};
let typeCache = {};
const BASIC_TYPES = [
  { en: "electric", jp: "でんき" },
  { en: "water",    jp: "みず" },
  { en: "fire",     jp: "ほのお" },
  { en: "grass",    jp: "くさ" }
];

function idFromUrl(url) { const m = String(url).match(/\/(\d+)\/?$/); return m ? parseInt(m[1], 10) : null; }

async function getSpecies(id) {
  if (speciesCache[id]) return speciesCache[id];
  const res = await fetch(`${API_BASE}/pokemon-species/${id}`);
  if (!res.ok) throw new Error("species " + id);
  return (speciesCache[id] = await res.json());
}
async function getEvolutionChain(url) {
  if (chainCache[url]) return chainCache[url];
  const res = await fetch(url);
  if (!res.ok) throw new Error("chain");
  return (chainCache[url] = await res.json());
}
function findChainNode(node, speciesName) {
  if (node.species.name === speciesName) return node;
  for (const child of node.evolves_to) {
    const found = findChainNode(child, speciesName);
    if (found) return found;
  }
  return null;
}
/* Dạng tiến hóa TIẾP THEO; trả null nếu đã là tiến hóa cuối */
async function getNextEvolution(id) {
  const sp = await getSpecies(id);
  if (!sp.evolution_chain || !sp.evolution_chain.url) return null;
  const chain = await getEvolutionChain(sp.evolution_chain.url);
  const node = findChainNode(chain.chain, sp.name);
  if (!node || !node.evolves_to || node.evolves_to.length === 0) return null;
  const next = node.evolves_to[0].species;
  return { id: idFromUrl(next.url), name: next.name };
}
/* Tên tiếng Nhật theo ID (ưu tiên kho quiz, không thì gọi API) */
async function getJapaneseName(id) {
  const inPool = quizPool.find(p => p.id === id);
  if (inPool) return inPool.name;
  const sp = await getSpecies(id);
  const ja = sp.names.find(n => n.language.name === "ja-Hrkt") || sp.names.find(n => n.language.name === "ja");
  return ja ? ja.name : ("No." + pad(id));
}
/* ID các Pokémon thuộc 1 hệ (có cache) */
async function getTypeMembers(enType) {
  if (typeCache[enType]) return typeCache[enType];
  const res = await fetch(`${API_BASE}/type/${enType}`);
  if (!res.ok) throw new Error("type " + enType);
  const d = await res.json();
  const ids = d.pokemon.map(x => idFromUrl(x.pokemon.url)).filter(v => v != null);
  return (typeCache[enType] = ids);
}

/* DẠNG 2 (MỚI): Tiến hóa — "◯◯ が しんか すると だれになる？" (ẩn nếu là tiến hóa cuối) */
async function buildEvolutionQuiz() {
  quizQuestionEl.textContent = "かんがえちゅう... 🤔";
  let subj = null, evo = null;
  for (let attempt = 0; attempt < 8 && !evo; attempt++) {
    const cand = pickQuizPokemon();
    try {
      const e = await getNextEvolution(cand.id);
      if (e && e.id) { subj = cand; evo = e; }
    } catch (_) { /* thử con khác */ }
  }
  if (!subj || !evo) { await buildTypeQuiz(); return; }   // không có tiến hóa -> đổi dạng
  usedQuizPokemonIds.push(subj.id);
  const correctName = await getJapaneseName(evo.id);
  const wrongs = pickWrongNames([subj.id, evo.id], 3, [correctName]);
  const options = shuffle([correctName, ...wrongs]);
  quizQuestionEl.textContent = `${subj.name} が しんか（進化）すると だれになる？`;
  renderQuizOptions(options.map(n => ({ label: n, value: n })), correctName);
}

/* DẠNG 3 (MỚI): Hệ ngược — "◯◯ タイプ の ポケモンは だれだ？" */
async function buildReverseTypeQuiz() {
  quizQuestionEl.textContent = "かんがえちゅう... 🤔";
  const t = BASIC_TYPES[Math.floor(Math.random() * BASIC_TYPES.length)];
  let ids;
  try { ids = await getTypeMembers(t.en); } catch (_) { await buildTypeQuiz(); return; }
  const typeSet = new Set(ids);
  const inPool = quizPool.filter(p => typeSet.has(p.id));
  if (inPool.length === 0) { await buildTypeQuiz(); return; }  // không có con nào hệ này trong vùng
  const correct = inPool[Math.floor(Math.random() * inPool.length)];
  const wrongPool = quizPool.filter(p => !typeSet.has(p.id) && p.id !== correct.id);
  shuffle(wrongPool);
  const wrongs = wrongPool.slice(0, 3).map(p => p.name);
  while (wrongs.length < 3) {   // dự phòng nếu thiếu
    const r = quizPool[Math.floor(Math.random() * quizPool.length)];
    if (r.name !== correct.name && !wrongs.includes(r.name)) wrongs.push(r.name);
  }
  const options = shuffle([correct.name, ...wrongs]);
  quizQuestionEl.textContent = `${t.jp} タイプ の ポケモンは だれだ？`;
  renderQuizOptions(options.map(n => ({ label: n, value: n })), correct.name);
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
