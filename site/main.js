// One place to edit: seats and the app address
const SEATS_TOTAL = 100;
const SEATS_TAKEN = 37; // TODO(owner): set the real number by hand
const APP_URL = "https://choochootraining.com/";

const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const $$ = (s) => document.querySelectorAll(s);

// Seats and app links
const pct = Math.min(100, Math.max(0, SEATS_TAKEN / SEATS_TOTAL * 100));
$$("[data-left]").forEach(e => e.textContent = Math.max(0, SEATS_TOTAL - SEATS_TAKEN));
$$("[data-total]").forEach(e => e.textContent = SEATS_TOTAL);
$$("[data-fill]").forEach(e => {
  e.style.width = reduced ? pct + "%" : "0%";
  const bar = e.parentElement;
  bar.setAttribute("aria-valuemax", SEATS_TOTAL);
  bar.setAttribute("aria-valuenow", SEATS_TAKEN);
});
$$("[data-app]").forEach(e => e.href = APP_URL);

// Analytics: Vercel Web Analytics custom events (no-op until the site runs on Vercel)
$$("[data-track]").forEach(e => e.addEventListener("click", () => {
  if (typeof window.va === "function") window.va("event", { name: e.dataset.track });
}));

if (reduced) $$("video").forEach(v => { v.removeAttribute("autoplay"); v.pause(); });

// Nav gets a backdrop once the page scrolls
const header = document.getElementById("top");
const onScroll = () => header.classList.toggle("scrolled", scrollY > 8);
addEventListener("scroll", onScroll, { passive: true }); onScroll();

if ("IntersectionObserver" in window) {
  // Fade sections in as they arrive; the seat bar fills when the ticket shows
  const io = new IntersectionObserver((entries) => entries.forEach(en => {
    if (!en.isIntersecting) return;
    en.target.classList.add("in");
    en.target.querySelectorAll("[data-fill]").forEach(f => f.style.width = pct + "%");
    io.unobserve(en.target);
  }), { rootMargin: "0px 0px -8% 0px" });
  $$(".reveal").forEach(e => io.observe(e));

  // Mobile start bar: show after the hero button scrolls away, hide where another start button is on screen
  const dock = document.getElementById("dock");
  const dockLink = dock.querySelector("a");
  const seen = new Set();
  const watch = [document.getElementById("hero-cta"), document.querySelector("#founding .btn"), document.querySelector(".close .btn")];
  let heroGone = false;
  const dio = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (en.target === watch[0]) heroGone = !en.isIntersecting && en.boundingClientRect.top < 0;
      en.isIntersecting ? seen.add(en.target) : seen.delete(en.target);
    });
    const show = heroGone && seen.size === 0;
    dock.classList.toggle("show", show);
    dock.setAttribute("aria-hidden", String(!show));
    dockLink.tabIndex = show ? 0 : -1;
  });
  watch.forEach(e => e && dio.observe(e));
} else {
  $$(".reveal").forEach(e => e.classList.add("in"));
  $$("[data-fill]").forEach(f => f.style.width = pct + "%");
}

// Stars, drawn once per size with a fixed seed so they don't jump; first drawn when the browser is idle so they never delay the page
(function () {
  const c = document.getElementById("stars");
  if (!c) return;
  const x = c.getContext("2d");
  function draw() {
    const r = c.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2);
    c.width = r.width * d; c.height = r.height * d; x.scale(d, d);
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 140; i++) {
      x.globalAlpha = .25 + rnd() * .6; x.fillStyle = "#F3F0FF";
      x.beginPath(); x.arc(rnd() * r.width, rnd() * r.height, rnd() * 1.4 + .3, 0, 7); x.fill();
    }
  }
  let t;
  (window.requestIdleCallback || ((f) => setTimeout(f, 200)))(draw);
  addEventListener("resize", () => { clearTimeout(t); t = setTimeout(draw, 150); });
})();
