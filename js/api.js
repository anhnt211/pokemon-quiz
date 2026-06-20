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
