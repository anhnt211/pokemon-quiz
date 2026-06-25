"use strict";
/* =====================================================================
   MAIN — gắn sự kiện, khởi động game, đăng ký Service Worker (PWA)
   ===================================================================== */

/* ===== Sự kiện ===== */
getLaunch.addEventListener("click", goGetMap);   // main -> bản đồ ポケモンGET
getBackBtn.addEventListener("click", goHome);    // bản đồ -> main
backBtn.addEventListener("click", goGetMap);     // thoát 1 vùng -> về bản đồ
// Pokémon Puzzle
puzzleLaunch.addEventListener("click", enterPuzzle);
puzzleBackBtn.addEventListener("click", goHome);
puzzleShuffleBtn.addEventListener("click", newPuzzle);
puzzleNextBtn.addEventListener("click", newPuzzle);
puzzleHomeBtn.addEventListener("click", goHome);

// Battle (nút もういちど / ホームへ được gán động trong setResultButtons)
battleLaunch.addEventListener("click", enterBattle);
battleStartBtn.addEventListener("click", startBattle);
zmoveBtn.addEventListener("click", activateZMove);
battleBackBtn.addEventListener("click", () => { stopBattle(); goHome(); });

// 🐾 ポケモンそだて (Pet / nuôi Bạn Đồng Hành)
// Bọc guard: nếu dom.js cũ (thiếu pet refs) thì bỏ qua, không làm crash cả game.
if (typeof petLaunch !== "undefined" && petLaunch) {
  petLaunch.addEventListener("click", enterPet);
  petBackBtn.addEventListener("click", goHome);
  petFeedBtn.addEventListener("click", feedPet);
  petEvolveBtn.addEventListener("click", evolvePet);
  petChangeBtn.addEventListener("click", backToPetChooser);
  petContinueBtn.addEventListener("click", petContinue);
  petHomeBtn.addEventListener("click", goHome);
} else {
  console.warn("⚠️ Thiếu tham chiếu DOM của そだてる — hãy cập nhật js/dom.js (và xóa cache PWA).");
}

// Photo Studio
photoLaunch.addEventListener("click", enterPhoto);
photoBackBtn.addEventListener("click", goHome);
camBtn.addEventListener("click", capturePhoto);
photoChangeBtn.addEventListener("click", backToPhotoChooser);
// Album + Lightbox
albumBtn.addEventListener("click", openAlbum);
albumCloseBtn.addEventListener("click", closeAlbum);
lightboxClose.addEventListener("click", closeLightbox);
lightbox.addEventListener("click", (e) => { if (e.target === lightbox || e.target === lightboxImg) closeLightbox(); });
dexOpenBtn.addEventListener("click", () => { dexOverlay.classList.contains("open") ? closePokedex() : openPokedex(); });
dexCloseBtn.addEventListener("click", closePokedex);
dexOverlay.addEventListener("click", (e) => { if (e.target === dexOverlay) closePokedex(); });

/* ===== Khởi động ===== */
window.addEventListener("DOMContentLoaded", () => {
  loadGame();            // tải tiến trình + tự migrate v2 -> v3
  ensureDailyMissions();
  renderHome();
  showScreen("home");
});

/* ===== Đăng ký Service Worker để chơi offline (PWA) ===== */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js")
      .then(reg => console.log("✅ Service Worker đã đăng ký:", reg.scope))
      .catch(err => console.warn("Service Worker chưa đăng ký được (cần chạy qua http/https):", err));
  });
}
