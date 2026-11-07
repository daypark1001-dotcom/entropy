// shared by the slide-deck detail pages (01, 02, …): cursor, layered slides, reveal, cover blur, toc

// custom cursor, as on entropy.html: crosshair follows exactly, red dot trails and grows over links
const cursor = document.querySelector(".cursor"), cursorDot = document.querySelector(".cursor-dot");
if (cursor && matchMedia("(pointer: fine)").matches) {
  let mx = innerWidth / 2, my = innerHeight / 2, dx = mx, dy = my, scale = 1, scaleTarget = 1;
  document.addEventListener("mousemove", e => {
    mx = e.clientX; my = e.clientY;
    cursor.classList.remove("is-out"); cursorDot.classList.remove("is-out");
  });
  // the vimeo iframe swallows mouse events, so hide the cursor graphic instead of freezing it there
  document.addEventListener("mouseout", e => {
    if (!e.relatedTarget || e.relatedTarget.tagName === "IFRAME") { cursor.classList.add("is-out"); cursorDot.classList.add("is-out"); }
  });
  document.querySelectorAll("a").forEach(a => {
    a.addEventListener("mouseenter", () => { scaleTarget = 2.6; cursor.style.opacity = "0.35"; });
    a.addEventListener("mouseleave", () => { scaleTarget = 1; cursor.style.opacity = ""; });
  });
  (function loop() {
    dx += (mx - dx) * 0.18; dy += (my - dy) * 0.18; scale += (scaleTarget - scale) * 0.2;
    cursor.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
    cursorDot.style.transform = `translate(${dx}px, ${dy}px) translate(-50%, -50%) scale(${scale})`;
    requestAnimationFrame(loop);
  })();
}

// layered slides: objects lean toward the cursor, each by its own --depth
document.querySelectorAll(".wlayers").forEach(el => {
  el.addEventListener("mousemove", e => {
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", ((e.clientX - r.left) / r.width * 2 - 1).toFixed(3));
    el.style.setProperty("--my", ((e.clientY - r.top) / r.height * 2 - 1).toFixed(3));
  });
  el.addEventListener("mouseleave", () => { el.style.setProperty("--mx", 0); el.style.setProperty("--my", 0); });
});

// reveal on scroll, as on entropy.html (added here so objects stay visible without js)
const io = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
}, { threshold: 0.1 });
document.querySelectorAll(".wslide").forEach(el => { el.classList.add("reveal"); io.observe(el); });

// hide the fixed top bar and floating toc until the page has covered half the cover
// (the cover is sticky and never leaves the screen, so this goes by scroll distance)
const kv = document.querySelector(".wkv"), bars = document.querySelectorAll(".wtop, .wtoc");
if (kv) {
  const toggleBars = () => {
    bars.forEach(el => el.classList.toggle("is-hidden", scrollY < kv.offsetHeight / 2));
    const t = Math.min(scrollY / kv.offsetHeight, 1);
    kv.style.setProperty("--p", (t * t).toFixed(3)); // 0 → 1 over the first screen, eased in so the blur builds up slowly at first
  };
  addEventListener("scroll", toggleBars, { passive: true });
  toggleBars();
}

// highlight the toc link of the section currently at mid-screen
const tocLinks = [...document.querySelectorAll(".wtoc a")];
const tocTargets = tocLinks.map(a => document.querySelector(a.hash));
let tocJumping = false, tocTimer;
function setToc(cur) {
  tocLinks.forEach((a, i) => a.classList.toggle("is-active", i === cur));
}
function updateToc() {
  let cur = 0;
  tocTargets.forEach((t, i) => { if (t && t.getBoundingClientRect().top < innerHeight / 2) cur = i; });
  setToc(cur);
}
// on click, jump the highlight straight to the target and hold it until the smooth scroll settles
tocLinks.forEach((a, i) => a.addEventListener("click", () => {
  tocJumping = true; setToc(i);
  clearTimeout(tocTimer); tocTimer = setTimeout(() => { tocJumping = false; }, 150); // released early if no scroll happens
}));
addEventListener("scroll", () => {
  clearTimeout(tocTimer);
  tocTimer = setTimeout(() => { tocJumping = false; updateToc(); }, 150);
  if (!tocJumping) updateToc();
}, { passive: true });
updateToc();
