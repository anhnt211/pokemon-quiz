"use strict";
/* =====================================================================
   POKÉMON SODATE — 🐾 そだてる: nuôi BẠN ĐỒNG HÀNH (相棒)
   - "おやつをあげる": -1 kẹo tổng, +1 tiến trình, nhảy lên + tiếng kêu
   - Đầy 100/100 -> bật nút "進化": chớp sáng -> đổi ID theo PokéAPI,
     cập nhật Pokédex + Bạn Đồng Hành, reset bộ đếm về 0.
   - Dạng cuối cùng -> hiển thị "Max Level".
   ===================================================================== */
let petId = null, petIsShiny = false, petName = "", petNextEvo = null, petStageInfo = null;

/* Vào màn nuôi: ưu tiên nuôi thẳng Bạn Đồng Hành (相棒) */
function enterPet() {
  if (typeof leaveActive === "function") leaveActive();
  showScreen("pet");
  petResult.classList.remove("show");
  // LUÔN vào DANH SÁCH để người chơi tự chọn con muốn cho ăn (không tự động chọn)
  petView.style.display = "none";
  petChoose.style.display = "block";
  renderPetChooser();
}

/* (Tùy chọn) Đổi con khác để nuôi — con được chọn cũng trở thành 相棒 */
function renderPetChooser() {
  petChooseGrid.innerHTML = "";
  const caught = gameState.pokedex.slice().sort((a, b) => a - b);
  if (caught.length === 0) {
    petChooseGrid.innerHTML = '<p class="choose-empty">まだ ポケモンを つかまえていないよ！<br>「ポケモンGET」で つかまえてから きてね。</p>';
    return;
  }
  caught.forEach(id => {
    const isShiny = gameState.shinyPokedex.includes(id);
    const g = gameState.growth[id] || 0;
    const isLast = gameState.lastFedID === id;   // con cho ăn gần nhất
    const btn = document.createElement("button");
    btn.className = "choose-cell" + (isShiny ? " shiny" : "") + (isLast ? " buddy" : "");
    btn.innerHTML = `
      ${isLast ? '<span class="cc-buddy">🎶</span>' : ""}
      ${isShiny ? '<span class="cc-star">✨</span>' : ""}
      <img src="${isShiny ? shinyArtworkUrl(id) : artworkUrl(id)}" loading="lazy" decoding="async" alt="">
      <span class="cc-id">${g} / ${GROW_MAX} 🍬</span>`;
    btn.addEventListener("click", () => {
      petChoose.style.display = "none";
      petView.style.display = "block";
      selectPetPokemon(id, isShiny);
    });
    petChooseGrid.appendChild(btn);
  });
}

/* Vào màn nuôi 1 con (đặt luôn làm Bạn Đồng Hành) */
async function selectPetPokemon(id, isShiny) {
  petId = id; petIsShiny = isShiny;
  petChoose.style.display = "none";
  petView.style.display = "block";
  petResult.classList.remove("show");
  petImg.classList.remove("evolving", "jump");
  petImg.src = isShiny ? shinyArtworkUrl(id) : artworkUrl(id);
  petNameEl.textContent = "…";
  petNextEvo = null; petStageInfo = null;
  renderPetView();   // vẽ ngay với dữ liệu kẹo (chưa cần mạng)

  try { petName = await getJapaneseName(id); } catch (e) { petName = "No." + pad(id); }
  petNameEl.textContent = petName + (isShiny ? " ✨" : "");
  try { petNextEvo = await getNextEvolution(id); } catch (e) { petNextEvo = null; }
  try { petStageInfo = await getEvolutionStage(id); } catch (e) { petStageInfo = null; }
  renderPetView();
}

/* Cập nhật thanh tiến trình + nút cho ăn / 進化 */
function renderPetView() {
  const g = gameState.growth[petId] || 0;
  const pct = Math.min(100, Math.round(g / GROW_MAX * 100));
  petGrowFill.style.width = pct + "%";
  petCandyEl.textContent = gameState.candy || 0;

  // Chỉ coi là "dạng cuối" khi đã biết chắc cấp tiến hóa (tránh hiện Max Level lúc đang tải)
  const isFinal = petStageInfo ? petStageInfo.isFinal : false;
  const ready = g >= GROW_MAX;

  petFeedBtn.textContent = `🍬 おやつを あげる（${FEED_COST}）`;

  if (isFinal) {
    // Dạng cuối: không tiến hóa nữa -> "Max Level"
    petGrowPct.textContent = "Max Level";
    petGrowFill.style.width = "100%";
    petFeedBtn.style.display = "none";
    petEvolveBtn.style.display = "none";
    petHintEl.textContent = "Max Level！ これいじょう しんかできないよ ✨ りっぱだね！";
    return;
  }

  // Còn tiến hóa được -> hiển thị "進化まで: g/100 🍬"
  petGrowPct.textContent = `進化まで: ${g} / ${GROW_MAX} 🍬`;

  if (ready) {
    // Đầy thanh -> kích hoạt nút 進化, ẩn nút cho ăn
    petFeedBtn.style.display = "none";
    petEvolveBtn.style.display = "";
    petEvolveBtn.disabled = false;
    petHintEl.textContent = "せいちょう MAX！「進化」ボタンを おしてね！";
  } else {
    petEvolveBtn.style.display = "none";
    petFeedBtn.style.display = "";
    if ((gameState.candy || 0) < FEED_COST) {
      petFeedBtn.disabled = true;
      petHintEl.textContent = "キャンディが たりないよ… バトルや パズルで あつめてね！";
    } else {
      petFeedBtn.disabled = false;
      petHintEl.textContent = "おやつを あげて しんかを めざそう！";
    }
  }
}

/* "おやつをあげる": -1 kẹo tổng, +1 tiến trình, nhảy lên + tiếng kêu */
function feedPet() {
  const g = gameState.growth[petId] || 0;
  if (g >= GROW_MAX || (gameState.candy || 0) < FEED_COST) return;

  gameState.candy -= FEED_COST;
  gameState.growth[petId] = Math.min(GROW_MAX, g + GROW_PER_FEED);
  gameState.lastFedID = petId;          // con vừa cho ăn -> hiển thị NHẢY MÚA ở màn chính
  saveGame();
  updateCandyDisplays();

  // Hiệu ứng nhảy lên (Jump) + tiếng kêu (Cry)
  petImg.classList.remove("jump"); void petImg.offsetWidth; petImg.classList.add("jump");
  playCry(petId);

  renderPetView();
}

/* "進化": chớp sáng -> đổi ID sang cấp tiến hóa kế, cập nhật Pokédex + 相棒, reset kẹo */
async function evolvePet() {
  if (!petNextEvo || !petNextEvo.id) return;
  if ((gameState.growth[petId] || 0) < GROW_MAX) return;   // chỉ tiến hóa khi đầy thanh

  const evo = petNextEvo;
  let evolvedName;
  try { evolvedName = await getJapaneseName(evo.id); } catch (e) { evolvedName = "No." + pad(evo.id); }

  // Cập nhật dữ liệu: thêm vào Pokédex, reset bộ đếm kẹo về 0, Bạn Đồng Hành tiến hóa theo
  if (!gameState.pokedex.includes(evo.id)) gameState.pokedex.push(evo.id);
  gameState.growth[petId] = 0;        // reset bộ đếm kẹo của con cũ
  gameState.growth[evo.id] = 0;       // con mới bắt đầu từ 0
  gameState.lastFedID = evo.id;       // con (đã tiến hóa) là con cho ăn cuối -> nhảy múa ở màn chính
  if (gameState.currentBuddyID === petId) gameState.currentBuddyID = evo.id;   // 相棒 chiến đấu tiến hóa theo (nếu trùng)
  saveGame();
  updateCandyDisplays();

  // Hoạt cảnh chớp sáng (Flash) + tiếng kêu của con mới
  playCry(evo.id);
  petImg.classList.remove("evolving"); void petImg.offsetWidth; petImg.classList.add("evolving");

  petResultText.innerHTML =
    `🎉 ${petName} は<span class="big">${evolvedName}</span>に しんかした！`
    + `<span class="result-sub">ずかんに とうろく！ 📕</span>`;
  petResult.classList.add("show");

  setTimeout(() => {
    speakName(evolvedName);
    petId = evo.id; petIsShiny = false; petName = evolvedName;
    petImg.classList.remove("evolving");
    petImg.src = artworkUrl(petId);
    petNameEl.textContent = evolvedName;
    Promise.all([getNextEvolution(petId), getEvolutionStage(petId)])
      .then(([n, s]) => { petNextEvo = n; petStageInfo = s; renderPetView(); })
      .catch(() => { petNextEvo = null; petStageInfo = null; renderPetView(); });
  }, 1000);
}

/* Đóng bảng tiến hóa -> nuôi tiếp dạng mới */
function petContinue() {
  petResult.classList.remove("show");
  renderPetView();
}

/* Quay lại lưới chọn con khác */
function backToPetChooser() {
  petResult.classList.remove("show");
  petView.style.display = "none";
  petChoose.style.display = "block";
  renderPetChooser();
}
