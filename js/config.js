"use strict";
/* =====================================================================
   CONFIG — hằng số, dữ liệu tĩnh, biến runtime dùng chung
   ===================================================================== */

const API_BASE        = "https://pokeapi.co/api/v2";
const STORAGE_KEY     = "pokeQuizSave_v3";   // save hiện hành
const STORAGE_KEY_OLD = "pokeQuizSave_v2";   // save cũ (để migrate)
const BATCH_SIZE      = 25;
const UNLOCK_NEED     = 50;
const SHINY_RATE      = 0.10;
const TOTAL_POKEMON   = 493;
const QUIZ_ROUND      = 5;
const QUIZ_CANDY      = 10;   // kẹo mỗi câu quiz đúng
const MISSION_REWARD  = 50;   // kẹo mỗi nhiệm vụ hoàn thành

/* ===== 🐾 そだてる (nuôi Bạn Đồng Hành) ===== */
const GROW_MAX       = 100;   // tiến trình 🍬 cần để 進化 (tiến hóa) — 10 lần cho ăn
const FEED_COST      = 10;    // mỗi lần "おやつをあげる": trừ 10 kẹo TỔNG của người chơi
const GROW_PER_FEED  = 10;    // ... và +10 vào tiến trình của con Pokémon này (kẹo kiếm theo bội số 10)

/* ===== ÂM LƯỢNG CHUẨN (an toàn cho trẻ nhỏ) ===== */
const DEFAULT_BGM_VOLUME = 0.3;   // nhạc nền: nhỏ nhẹ
const DEFAULT_SFX_VOLUME = 0.5;   // hiệu ứng: vừa nghe

const artworkUrl      = (id) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
const shinyArtworkUrl = (id) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/${id}.png`;
const pad = (n) => String(n).padStart(3, "0");

/* Ngưỡng thu thập (%) để icon Boss 👑 xuất hiện trên bản đồ */
const BOSS_THRESHOLD = 0.80;
/* HP gốc của Boss nhân thêm để tăng độ khó */
const BOSS_HP_MULT = 1.5;

/* Vùng đất + Boss huyền thoại. Vùng kế mở khóa khi HẠ BOSS của vùng yêu cầu. */
const REGIONS = [
  { key:"kanto",  name:"カントー地方", short:"カントー", start:1,   end:151, color:"#4caf50", emoji:"🍃", requires:null,               boss:{ id:150, name:"ミュウツー" } },
  { key:"johto",  name:"ジョウト地方", short:"ジョウト", start:152, end:251, color:"#f4a300", emoji:"🔔", requires:{ region:"kanto"  }, boss:{ id:249, name:"ルギア" } },
  { key:"hoenn",  name:"ホウエン地方", short:"ホウエン", start:252, end:386, color:"#2196f3", emoji:"🌊", requires:{ region:"johto"  }, boss:{ id:384, name:"レックウザ" } },
  { key:"sinnoh", name:"シンオウ地方", short:"シンオウ", start:387, end:493, color:"#7e57c2", emoji:"❄️", requires:{ region:"hoenn"  }, boss:{ id:493, name:"アルセウス" } }
];

/* Map hệ EN -> JP (đơn giản cho bé) */
const TYPE_JP = {
  normal:"ノーマル", fire:"ほのお", water:"みず", electric:"でんき", grass:"くさ",
  ice:"こおり", fighting:"かくとう", poison:"どく", ground:"じめん", flying:"ひこう",
  psychic:"エスパー", bug:"むし", rock:"いわ", ghost:"ゴースト", dragon:"ドラゴン",
  dark:"あく", steel:"はがね", fairy:"フェアリー"
};

/* Kho nhiệm vụ hằng ngày */
const MISSION_POOL = [
  { key:"catch5", icon:"⚡", label:"ポケモン を 5ひき つかまえよう！",        track:"catch", target:5 },
  { key:"catch3", icon:"🎯", label:"ポケモン を 3びき つかまえよう！",        track:"catch", target:3 },
  { key:"shiny1", icon:"✨", label:"シャイニーポケモン に 1かい であおう！",   track:"shiny", target:1 },
  { key:"puzzle2", icon:"🧩", label:"パズルを 2かい かんせいさせよう！",        track:"puzzle", target:2 },
  { key:"puzzle1", icon:"🧩", label:"パズルを 1かい かんせいさせよう！",        track:"puzzle", target:1 },
  { key:"catch8", icon:"🔥", label:"ポケモン を 8ひき つかまえよう！",        track:"catch", target:8 }
];

/* ===== Biến runtime dùng chung giữa các module ===== */
/* growth: { [id]: số kẹo đã cho con đó ăn }  ·  currentBuddyID: ID Bạn Đồng Hành hiện tại */
let gameState = { score:0, pokedex:[], shinyPokedex:[], candy:0, missions:null, bossDefeated:{}, growth:{}, currentBuddyID:null, lastFedID:null };
let questionTimer = null;
let oakTimer = null;
let unlockTimer = null;     // hẹn giờ ẩn popup "mở khóa vùng mới"
let loadToken = 0;          // chống lỗi bất đồng bộ khi đổi màn

// Màn chơi đoán bóng
let allPokemon = [];
let currentRegion = null;
let currentCorrectAnswer = null;
let currentIsShiny = false;

// Cache chi tiết Pokémon (dùng bởi api.getPokemonDetail)
let detailCache = {};

/* Tiện ích chung: xáo trộn Fisher–Yates */
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
