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
    u.volume = 0.9;  // mềm tai, không giật mình
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
    a.volume = (typeof volume === "number") ? volume : DEFAULT_SFX_VOLUME * 0.7;   // nhẹ, không giật mình
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
    const V = DEFAULT_SFX_VOLUME * 0.6;
    [0, 0.085].forEach(off => {           // 2 tiếng tách (màn trập mở-đóng)
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "square";
      o.frequency.setValueAtTime(2000, now + off);
      o.frequency.exponentialRampToValueAtTime(420, now + off + 0.04);
      g.gain.setValueAtTime(0.0001, now + off);
      g.gain.exponentialRampToValueAtTime(V, now + off + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, now + off + 0.06);
      o.connect(g); g.connect(ctx.destination);
      o.start(now + off); o.stop(now + off + 0.07);
    });
  } catch (e) { /* bỏ qua êm */ }
}

/* =====================================================================
   SFX ĐÒN ĐÁNH (tổng hợp WebAudio — phát tức thì, âm lượng cố định)
   electric / fire / water + hit (hệ thường)
   ===================================================================== */
function _noiseBurst(ctx, dur, vol, filterType, freq) {
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource(); src.buffer = buf;
  const g = ctx.createGain();
  const now = ctx.currentTime;
  g.gain.setValueAtTime(vol, now);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  let node = src;
  if (filterType) { const f = ctx.createBiquadFilter(); f.type = filterType; f.frequency.value = freq; src.connect(f); node = f; }
  node.connect(g); g.connect(ctx.destination);
  src.start(now); src.stop(now + dur);
}
function _blip(ctx, f0, f1, dur, type, vol) {
  const o = ctx.createOscillator(); const g = ctx.createGain();
  const now = ctx.currentTime;
  o.type = type;
  o.frequency.setValueAtTime(f0, now);
  o.frequency.exponentialRampToValueAtTime(Math.max(40, f1), now + dur);
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(vol, now + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  o.connect(g); g.connect(ctx.destination);
  o.start(now); o.stop(now + dur + 0.02);
}
/* Phát SFX theo hệ — gọi NGAY lúc VFX nhấp nháy để đồng bộ */
function playSfx(type) {
  try {
    const ctx = getAudioCtx(); if (!ctx) return;
    const V = DEFAULT_SFX_VOLUME;
    if (type === "electric") {            // tia sét xẹt
      _blip(ctx, 1300, 220, 0.16, "sawtooth", V * 0.7);
      _noiseBurst(ctx, 0.12, V * 0.5, "highpass", 2200);
    } else if (type === "fire") {         // lửa bùng
      _noiseBurst(ctx, 0.4, V * 0.6, "lowpass", 900);
      _blip(ctx, 170, 60, 0.35, "square", V * 0.4);
    } else if (type === "water") {        // sóng/giọt nước
      _blip(ctx, 820, 280, 0.18, "sine", V * 0.6);
      _noiseBurst(ctx, 0.14, V * 0.35, "bandpass", 1200);
    } else {                              // va chạm vật lý (hệ thường)
      _blip(ctx, 240, 90, 0.12, "square", V * 0.7);
      _noiseBurst(ctx, 0.08, V * 0.4, "lowpass", 1500);
    }
  } catch (e) { /* bỏ qua êm */ }
}

/* =====================================================================
   BGM SÀN ĐẤU (chiptune loop tổng hợp — lặp, âm lượng nền nhỏ)
   bgmStart('battle'|'boss')  /  bgmStop()
   ===================================================================== */
const BATTLE_SEQ = [
  { f:220,   d:0.16, t:0.16, type:"triangle", g:0.6 },
  { f:330,   d:0.12, t:0.16, type:"square",   g:0.35 },
  { f:440,   d:0.12, t:0.16, type:"square",   g:0.35 },
  { f:330,   d:0.12, t:0.16, type:"square",   g:0.35 },
  { f:262,   d:0.16, t:0.16, type:"triangle", g:0.6 },
  { f:392,   d:0.12, t:0.16, type:"square",   g:0.35 },
  { f:523,   d:0.12, t:0.16, type:"square",   g:0.35 },
  { f:392,   d:0.12, t:0.16, type:"square",   g:0.35 }
];
const BOSS_SEQ = [
  { f:110,    d:0.14, t:0.14, type:"sawtooth", g:0.5 },
  { f:146.83, d:0.10, t:0.14, type:"square",   g:0.3 },
  { f:174.61, d:0.10, t:0.14, type:"square",   g:0.3 },
  { f:110,    d:0.14, t:0.14, type:"sawtooth", g:0.5 },
  { f:130.81, d:0.14, t:0.14, type:"sawtooth", g:0.5 },
  { f:196,    d:0.10, t:0.14, type:"square",   g:0.3 },
  { f:233.08, d:0.10, t:0.14, type:"square",   g:0.3 },
  { f:130.81, d:0.14, t:0.14, type:"sawtooth", g:0.5 }
];

let bgmTimer = null, bgmGain = null, bgmSeq = null, bgmStep = 0, bgmNextTime = 0;

function _bgmNote(ctx, n, time) {
  const o = ctx.createOscillator(); const g = ctx.createGain();
  o.type = n.type; o.frequency.value = n.f;
  g.gain.setValueAtTime(0.0001, time);
  g.gain.exponentialRampToValueAtTime(n.g, time + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, time + n.d);
  o.connect(g); g.connect(bgmGain);
  o.start(time); o.stop(time + n.d + 0.03);
}
function _bgmScheduler() {
  const ctx = getAudioCtx(); if (!ctx || !bgmGain) return;
  while (bgmNextTime < ctx.currentTime + 0.12) {
    _bgmNote(ctx, bgmSeq[bgmStep % bgmSeq.length], bgmNextTime);
    bgmNextTime += bgmSeq[bgmStep % bgmSeq.length].t;
    bgmStep++;
  }
}
function bgmStart(kind) {
  bgmStop();
  const ctx = getAudioCtx(); if (!ctx) return;
  bgmGain = ctx.createGain();
  bgmGain.gain.value = DEFAULT_BGM_VOLUME;
  bgmGain.connect(ctx.destination);
  bgmSeq = (kind === "boss") ? BOSS_SEQ : BATTLE_SEQ;
  bgmStep = 0;
  bgmNextTime = ctx.currentTime + 0.06;
  bgmTimer = setInterval(_bgmScheduler, 30);
}
/* Dừng BGM ngay + reset — gọi khi もどる / kết thúc trận */
function bgmStop() {
  if (bgmTimer) { clearInterval(bgmTimer); bgmTimer = null; }
  if (bgmGain) { try { bgmGain.disconnect(); } catch (e) {} bgmGain = null; }
  bgmSeq = null; bgmStep = 0;
}
