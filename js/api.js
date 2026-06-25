"use strict";
/* =====================================================================
   API — tải dữ liệu từ PokéAPI
   ===================================================================== */

/* Chỉ lấy tên tiếng Nhật; ảnh dựng từ URL quy luật (lazy) */
async function fetchOnePokemonName(id) {
  const res = await fetch(`${API_BASE}/pokemon-species/${id}`);
  if (!res.ok) throw new Error(`tên #${id} lỗi`);
  const data = await res.json();
  const ja = data.names.find(n => n.language.name === "ja-Hrkt") ||
             data.names.find(n => n.language.name === "ja");
  return { id, name: ja ? ja.name : ("No." + pad(id)), image: artworkUrl(id) };
}

/* Tải theo lô + song song trong lô; hủy giữa chừng nếu đổi màn (loadToken) */
async function fetchPokemonData(startId, endId, myToken) {
  const ids = [];
  for (let i = startId; i <= endId; i++) ids.push(i);
  const results = [];
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    if (myToken !== loadToken) return null;
    const chunk = ids.slice(i, i + BATCH_SIZE);
    results.push(...await Promise.all(chunk.map(id => fetchOnePokemonName(id))));
    elStatus.textContent = `データ読み込み中... ${results.length} / ${ids.length}`;
  }
  results.sort((a, b) => a.id - b.id);
  return results;
}

/* Chi tiết (hệ + cân nặng) cho quiz, có cache để khỏi gọi lại */
async function getPokemonDetail(id) {
  if (detailCache[id]) return detailCache[id];
  const res = await fetch(`${API_BASE}/pokemon/${id}`);
  if (!res.ok) throw new Error(`detail #${id} lỗi`);
  const d = await res.json();
  const detail = { id, weight: d.weight, types: d.types.map(t => t.type.name) };
  detailCache[id] = detail;
  return detail;
}

/* ===== Loài (species) + tên tiếng Nhật — DÙNG CHUNG cho battle/photo/puzzle ===== */
let speciesCache = {};
async function getSpecies(id) {
  if (speciesCache[id]) return speciesCache[id];
  const res = await fetch(`${API_BASE}/pokemon-species/${id}`);
  if (!res.ok) throw new Error("species " + id);
  return (speciesCache[id] = await res.json());
}
async function getJapaneseName(id) {
  const sp = await getSpecies(id);
  const ja = sp.names.find(n => n.language.name === "ja-Hrkt") || sp.names.find(n => n.language.name === "ja");
  return ja ? ja.name : ("No." + pad(id));
}

/* =====================================================================
   CHUỖI TIẾN HÓA (evolution chain) — cho 🐾 そだてる & hệ số sức mạnh Battle
   Lấy: /pokemon-species/{id} -> evolution_chain.url -> duyệt chuỗi.
   Trả về mảng các "đời" theo nhánh chính: [{ id, stage, nextId }]
   (stage bắt đầu từ 1 = dạng cơ bản). Với 1->2->3 sẽ là stage 1,2,3.
   ===================================================================== */
let evoChainCache = {};   // cache theo URL evolution_chain

function speciesIdFromUrl(url) {
  const m = (url || "").match(/\/pokemon-species\/(\d+)\/?$/);
  return m ? parseInt(m[1], 10) : null;
}

async function getEvolutionChain(id) {
  const sp = await getSpecies(id);
  const url = sp.evolution_chain && sp.evolution_chain.url;
  if (!url) return null;
  if (evoChainCache[url]) return evoChainCache[url];

  const res = await fetch(url);
  if (!res.ok) throw new Error("evo " + id);
  const data = await res.json();

  // Duyệt theo NHÁNH ĐẦU TIÊN (phù hợp các chuỗi tuyến tính 1->2->3).
  const list = [];
  let node = data.chain;
  let stage = 1;
  while (node) {
    const sid = speciesIdFromUrl(node.species && node.species.url);
    const next = (node.evolves_to && node.evolves_to.length) ? node.evolves_to[0] : null;
    const nextId = next ? speciesIdFromUrl(next.species && next.species.url) : null;
    if (sid) list.push({ id: sid, stage, nextId });
    node = next;
    stage++;
  }
  evoChainCache[url] = list;
  return list;
}

/* Đời tiến hóa KẾ TIẾP của 1 Pokémon (theo nhánh chính). null nếu là dạng cuối. */
async function getNextEvolution(id) {
  const list = await getEvolutionChain(id);
  if (!list) return null;
  const me = list.find(x => x.id === id);
  if (!me || !me.nextId) return null;
  return { id: me.nextId };
}

/* Cấp tiến hóa của 1 Pokémon: { stage, total, isFinal }
   stage 1 = cơ bản, 2, 3...; isFinal = true nếu không còn tiến hóa nữa. */
async function getEvolutionStage(id) {
  let list = null;
  try { list = await getEvolutionChain(id); } catch (e) { list = null; }
  if (!list || !list.length) return { stage: 1, total: 1, isFinal: true };
  const me = list.find(x => x.id === id);
  const stage = me ? me.stage : 1;
  const isFinal = !me || !me.nextId;
  return { stage, total: list.length, isFinal };
}
