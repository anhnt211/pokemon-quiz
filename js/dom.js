"use strict";
/* =====================================================================
   DOM — tham chiếu phần tử (script nạp cuối <body> nên DOM đã sẵn sàng)
   ===================================================================== */

// Màn hình
const homeScreen = document.getElementById("home-screen");
const getmapScreen = document.getElementById("getmap-screen");
const gameScreen = document.getElementById("game-screen");
const puzzleScreen = document.getElementById("puzzle-screen");

// Nút điều hướng
const getLaunch = document.getElementById("get-launch");
const getBackBtn = document.getElementById("get-back-btn");
const battleLaunch = document.getElementById("battle-launch");

// Bản đồ ポケモンGET (markers trên nền bản đồ)
const mapBoard = document.getElementById("map-board");

// Sàn đấu Battle
const battleScreen   = document.getElementById("battle-screen");
const battleBackBtn  = document.getElementById("battle-back-btn");
const battleChoose   = document.getElementById("battle-choose");
const chooseGrid     = document.getElementById("choose-grid");
const battleArena    = document.getElementById("battle-arena");
const arenaEl        = document.getElementById("arena");
const foeSide   = document.getElementById("foe-side");
const foeName   = document.getElementById("foe-name");
const foeImg    = document.getElementById("foe-img");
const foeHp     = document.getElementById("foe-hp");
const mySide    = document.getElementById("my-side");
const myName    = document.getElementById("my-name");
const myImg     = document.getElementById("my-img");
const myHp      = document.getElementById("my-hp");
const typeFlash = document.getElementById("type-flash");
const battleLog = document.getElementById("battle-log");
const battleStartBtn = document.getElementById("battle-start");
const zmoveBtn       = document.getElementById("zmove-btn");
const battleResult = document.getElementById("battle-result");
const resultText   = document.getElementById("result-text");
const battleAgainBtn = document.getElementById("battle-again");
const battleHomeBtn  = document.getElementById("battle-home");

// Home
const missionList = document.getElementById("mission-list");
const trainerRankEl = document.getElementById("trainer-rank");
const homeCandy = document.getElementById("home-candy");
const homeScore = document.getElementById("home-score");
const statCaught = document.getElementById("stat-caught");
const statShiny = document.getElementById("stat-shiny");
const progressPct = document.getElementById("progress-pct");
const progressFill = document.getElementById("progress-fill");

// Game
const elImage   = document.getElementById("pokemon-image");
const elStage   = document.getElementById("image-stage");
const elSparkle = document.getElementById("sparkle-layer");
const elStatus  = document.getElementById("status-text");
const elScore   = document.getElementById("score");
const regionNameEl = document.getElementById("region-name");
const optionButtons = document.querySelectorAll("#options-grid .btn-option");
const backBtn   = document.getElementById("back-btn");

// Popups
const catchPopup     = document.getElementById("catch-popup");
const catchBubble    = document.getElementById("catch-bubble");
const catchPopupText = document.getElementById("catch-popup-text");
const oakPopup       = document.getElementById("oak-popup");
const unlockPopup    = document.getElementById("unlock-popup");

// Pokédex
const dexOverlay  = document.getElementById("dex-overlay");
const dexGrid     = document.getElementById("dex-grid");
const dexCount    = document.getElementById("dex-count");
const dexRegionName = document.getElementById("dex-region-name");
const dexOpenBtn  = document.getElementById("dex-open-btn");
const dexCloseBtn = document.getElementById("dex-close-btn");

// Pokémon Puzzle
const puzzleLaunch   = document.getElementById("puzzle-launch");
const puzzleBackBtn  = document.getElementById("puzzle-back-btn");
const puzzleStatus   = document.getElementById("puzzle-status");
const puzzleRef      = document.getElementById("puzzle-ref");
const puzzleGrid     = document.getElementById("puzzle-grid");
const puzzleShuffleBtn = document.getElementById("puzzle-shuffle");
const puzzleResult   = document.getElementById("puzzle-result");
const puzzleResultText = document.getElementById("puzzle-result-text");
const puzzleNextBtn  = document.getElementById("puzzle-next");
const puzzleHomeBtn  = document.getElementById("puzzle-home");

// Photo Studio
const photoScreen     = document.getElementById("photo-screen");
const photoLaunch     = document.getElementById("photo-launch");
const photoBackBtn    = document.getElementById("photo-back-btn");
const photoChoose     = document.getElementById("photo-choose");
const photoChooseGrid = document.getElementById("photo-choose-grid");
const photoStudio     = document.getElementById("photo-studio");
const photoStage      = document.getElementById("photo-stage");
const photoPoke       = document.getElementById("photo-poke");
const photoCaption    = document.getElementById("photo-caption");
const bgPicker        = document.getElementById("bg-picker");
const camBtn          = document.getElementById("cam-btn");
const photoChangeBtn  = document.getElementById("photo-change-btn");
const photoHint       = document.getElementById("photo-hint");
// Album
const albumBtn        = document.getElementById("album-btn");
const photoMainHeader = document.getElementById("photo-main-header");
const photoAlbum      = document.getElementById("photo-album");
const albumGrid       = document.getElementById("album-grid");
const albumEmpty      = document.getElementById("album-empty");
const albumCloseBtn   = document.getElementById("album-close-btn");
// Lightbox
const lightbox        = document.getElementById("lightbox");
const lightboxImg     = document.getElementById("lightbox-img");
const lightboxClose   = document.getElementById("lightbox-close");

// 🐾 ポケモンそだて (Pet / nuôi Bạn Đồng Hành)
const petScreen      = document.getElementById("pet-screen");
const petLaunch      = document.getElementById("pet-launch");
const petBackBtn     = document.getElementById("pet-back-btn");
const petChoose      = document.getElementById("pet-choose");
const petChooseGrid  = document.getElementById("pet-choose-grid");
const petView        = document.getElementById("pet-view");
const petImg         = document.getElementById("pet-img");
const petNameEl      = document.getElementById("pet-name");
const petGrowFill    = document.getElementById("pet-grow-fill");
const petGrowPct     = document.getElementById("pet-grow-pct");
const petHintEl      = document.getElementById("pet-hint");
const petFeedBtn     = document.getElementById("pet-feed");
const petEvolveBtn   = document.getElementById("pet-evolve");
const petChangeBtn   = document.getElementById("pet-change");
const petCandyEl     = document.getElementById("pet-candy");
const petResult      = document.getElementById("pet-result");
const petResultText  = document.getElementById("pet-result-text");
const petContinueBtn = document.getElementById("pet-continue");
const petHomeBtn     = document.getElementById("pet-home");
