"use strict";
/* =====================================================================
   DOM — tham chiếu phần tử (script nạp cuối <body> nên DOM đã sẵn sàng)
   ===================================================================== */

// Màn hình
const homeScreen = document.getElementById("home-screen");
const gameScreen = document.getElementById("game-screen");
const quizScreen = document.getElementById("quiz-screen");

// Home
const adventureMap = document.getElementById("adventure-map");
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

// Quiz
const quizLaunch  = document.getElementById("quiz-launch");
const quizBackBtn = document.getElementById("quiz-back-btn");
const quizQuestionEl = document.getElementById("quiz-question");
const quizStatusEl   = document.getElementById("quiz-status");
const quizProgressEl = document.getElementById("quiz-progress");
const quizRangeEl    = document.getElementById("quiz-range");
const quizCandy   = document.getElementById("quiz-candy");
const quizOptionButtons = document.querySelectorAll("#quiz-options .btn-option");
