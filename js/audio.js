"use strict";
/* =====================================================================
   AUDIO — phát âm tên (TTS chọn giọng ja-JP xịn) + tiếng kêu Pokémon (cries)
   ===================================================================== */

/* ===== Phát âm tên tiếng Nhật bằng giọng đẹp nhất của hệ thống ===== */
let jpVoice = null;

function pickJaVoice() {
  if (!("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || !voices.length) return null;
  const ja = voices.filter(v => (v.lang || "").toLowerCase().replace("_", "-").startsWith("ja"));
  if (!ja.length) return null;
  // Ưu tiên giọng tự nhiên: Google (Chrome) / Kyoko, Otoya, Siri (Safari/iOS)
  const prefer = ["google", "kyoko", "o-ren", "otoya", "siri", "hattori", "natural", "premium"];
  for (const key of prefer) {
    const found = ja.find(v => (v.name || "").toLowerCase().includes(key));
    if (found) return found;
  }
  return ja[0];
}

function initVoices() { jpVoice = pickJaVoice(); }

if ("speechSynthesis" in window) {
  initVoices();
  // Danh sách giọng nạp bất đồng bộ -> cập nhật lại khi sẵn sàng
  try { window.speechSynthesis.onvoiceschanged = initVoices; } catch (e) {}
}

/* Đọc tên — gọi ở mọi chế độ (đoán bóng, quiz, battle, boss) */
function speakName(text) {
  if (!("speechSynthesis" in window) || !text) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    if (!jpVoice) jpVoice = pickJaVoice();
    if (jpVoice) u.voice = jpVoice;
    u.lang = "ja-JP";
    u.rate = 1.0;    // tự nhiên, không lề mề
    u.pitch = 1.1;   // tươi vui kiểu anime
    u.volume = 1.0;
    window.speechSynthesis.speak(u);
  } catch (e) { /* bỏ qua êm */ }
}

/* ===== Tiếng kêu nguyên bản của Pokémon (PokéAPI cries) ===== */
const CRY_BASE = "https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest";
let currentCry = null;

/* Phát tiếng kêu khi Pokémon xuất hiện. Tách kênh Audio nên KHÔNG đụng TTS.
   (Lưu ý: file cries là .ogg — Safari/iOS có thể không phát; khi đó tự bỏ qua.) */
function playCry(id, volume) {
  try {
    if (currentCry) { currentCry.pause(); currentCry = null; }
    const a = new Audio(`${CRY_BASE}/${id}.ogg`);
    a.volume = (typeof volume === "number") ? volume : 0.65;
    const p = a.play();
    if (p && typeof p.catch === "function") p.catch(() => {});   // chặn lỗi autoplay/định dạng
    currentCry = a;
  } catch (e) { /* bỏ qua êm */ }
}

/* ===== Tiếng "tách" chụp ảnh (tổng hợp WebAudio — không cần file, chạy offline + iOS) ===== */
let audioCtx = null;
function getAudioCtx() {
  try {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
  } catch (e) {}
  return audioCtx;
}
function playShutter() {
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    [0, 0.085].forEach(off => {           // 2 tiếng tách (màn trập mở-đóng)
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "square";
      o.frequency.setValueAtTime(2000, now + off);
      o.frequency.exponentialRampToValueAtTime(420, now + off + 0.04);
      g.gain.setValueAtTime(0.0001, now + off);
      g.gain.exponentialRampToValueAtTime(0.3, now + off + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, now + off + 0.06);
      o.connect(g); g.connect(ctx.destination);
      o.start(now + off); o.stop(now + off + 0.07);
    });
  } catch (e) { /* bỏ qua êm */ }
}
