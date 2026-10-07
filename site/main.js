// One place to edit: seats and the app address
const SEATS_TOTAL = 100;
const SEATS_TAKEN = 37; // TODO(owner): set the real number by hand
const APP_URL = "https://choochootraining.com/";

document.querySelectorAll("[data-fill]").forEach(e => e.style.width = (SEATS_TAKEN / SEATS_TOTAL * 100) + "%");
document.querySelectorAll("[data-left]").forEach(e => e.textContent = SEATS_TOTAL - SEATS_TAKEN);
document.querySelectorAll("[data-app]").forEach(e => e.href = APP_URL);
document.querySelectorAll("[data-track]").forEach(e => e.addEventListener("click", () => {
  if (window.va) window.va("event", { name: e.dataset.track });
}));
if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
  document.querySelectorAll("video").forEach(v => { v.removeAttribute("autoplay"); v.pause(); });
}
(function () {
  const c = document.getElementById("stars");
  if (!c) return;
  const x = c.getContext("2d");
  function draw() {
    const r = c.getBoundingClientRect();
    c.width = r.width; c.height = r.height;
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 140; i++) {
      x.globalAlpha = .25 + rnd() * .6; x.fillStyle = "#F3F0FF";
      x.beginPath(); x.arc(rnd() * c.width, rnd() * c.height, rnd() * 1.4 + .3, 0, 7); x.fill();
    }
  }
  draw(); addEventListener("resize", draw);
})();
