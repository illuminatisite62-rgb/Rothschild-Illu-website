/**
 * js/welcome.js
 * Handles the "Welcome to the Rothschild Illuminati family" pop-up.
 */

document.addEventListener("DOMContentLoaded", () => {
  // Check if they've already agreed this session
  if (sessionStorage.getItem("rothschild_welcome_accepted") === "true") {
    return;
  }

  const overlay = document.createElement("div");
  overlay.className = "welcome-overlay";
  
  const modal = document.createElement("div");
  modal.className = "welcome-modal";
  
  modal.innerHTML = `
    <div class="welcome-symbol">
      <img src="assets/images/01_logo_emblem_transparent.png" alt="Illuminati Symbol" />
    </div>
    <h2 class="welcome-title">Welcome to the Rothschild Illuminati family</h2>
    <p class="welcome-desc">You are entering an exclusive domain. By proceeding, you acknowledge our values of Concordia, Integritas, and Fortitudo.</p>
    <div class="welcome-actions">
      <button class="btn btn-gold" id="welcomeProceedBtn">Proceed to Site</button>
      <button class="btn btn-outline-gold" id="welcomeExitBtn">Exit</button>
    </div>
  `;
  
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  
  // Disable scrolling while open
  document.body.style.overflow = "hidden";
  
  // Trigger animation
  setTimeout(() => {
    overlay.classList.add("show");
  }, 50);

  document.getElementById("welcomeProceedBtn").addEventListener("click", () => {
    sessionStorage.setItem("rothschild_welcome_accepted", "true");
    overlay.classList.remove("show");
    document.body.style.overflow = "";
    setTimeout(() => {
      overlay.remove();
    }, 600);
  });

  document.getElementById("welcomeExitBtn").addEventListener("click", () => {
    window.location.href = "https://www.google.com";
  });
});
