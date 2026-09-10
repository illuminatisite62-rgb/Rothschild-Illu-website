/**
 * Shared site behavior: navigation drawer, footer year, active nav highlighting.
 * Loaded on every public page.
 */
(function () {
  "use strict";

  function initNavDrawer() {
    const toggle = document.getElementById("navToggle");
    const drawer = document.getElementById("navDrawer");
    if (!toggle || !drawer) return;

    const closers = drawer.querySelectorAll("[data-nav-close]");

    function open() {
      drawer.setAttribute("data-open", "true");
      toggle.setAttribute("aria-expanded", "true");
      document.body.classList.add("nav-open");
    }

    function close() {
      drawer.setAttribute("data-open", "false");
      toggle.setAttribute("aria-expanded", "false");
      document.body.classList.remove("nav-open");
    }

    toggle.addEventListener("click", function () {
      const isOpen = drawer.getAttribute("data-open") === "true";
      isOpen ? close() : open();
    });

    closers.forEach(function (el) {
      el.addEventListener("click", close);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && drawer.getAttribute("data-open") === "true") {
        close();
      }
    });
  }

  function initFooterYear() {
    const el = document.getElementById("year");
    if (el) el.textContent = new Date().getFullYear();
  }

  function initActiveNavLink() {
    const path = window.location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll(".nav-drawer-links a").forEach(function (link) {
      const href = link.getAttribute("href");
      if (href === path) {
        link.classList.add("active");
      } else {
        link.classList.remove("active");
      }
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initNavDrawer();
    initFooterYear();
    initActiveNavLink();
  });
})();
