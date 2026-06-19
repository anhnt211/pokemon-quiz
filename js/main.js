"use strict";
/* =====================================================================
   MAIN — gắn sự kiện, khởi động game, đăng ký Service Worker (PWA)
   ===================================================================== */

/* ===== Sự kiện ===== */
backBtn.addEventListener("click", goHome);
quizBackBtn.addEventListener("click", goHome);
quizLaunch.addEventListener("click", enterQuiz);
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
