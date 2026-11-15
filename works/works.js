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
  const layered = kv.classList.contains("wkv-layers"); // page 03: the cover's layers move into place first
  const portrait = matchMedia("(max-aspect-ratio: 1/1)");
  const MOVE = 0.9, HOLD = 1.7; // screens: layers in place by 0.9, next slide arrives after 1.7 (= .wkv-layers ~ main margin)
  // layered cover: scroll sets a target, and the drawn progress glides after it every frame, so wheel steps don't jerk;
  // each layer then gets its own eased slice of it (logo first, panel + frame a beat later, tags last)
  let fTarget = 0, fNow = 0, raf = 0;
  const ease = x => x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2; // easeInOutCubic
  const slice = (f, from, to) => ease(Math.min(Math.max((f - from) / (to - from), 0), 1));
  const paint = () => {
    fNow += (fTarget - fNow) * 0.05; // glide knob: lower = softer, slower
    if (Math.abs(fTarget - fNow) < 0.0005) fNow = fTarget;
    kv.style.setProperty("--a", slice(fNow, 0, 0.7).toFixed(4));
    kv.style.setProperty("--b", slice(fNow, 0.2, 0.95).toFixed(4));
    kv.style.setProperty("--c", slice(fNow, 0.45, 1).toFixed(4));
    raf = fNow === fTarget ? 0 : requestAnimationFrame(paint);
  };
  // layered cover geometry (px, once per resize): side margin, and how far the stage shifts so that — with the curtains
  // closed — the crop falls mostly on the right (24% of it on the left), sparing the copy and the logo
  const geometry = () => {
    if (!layered) return;
    const vw = kv.clientWidth, vh = kv.clientHeight, cw = Math.max(vw, vh * 16 / 9);
    const gut = portrait.matches ? 0 : Math.min(Math.max((vw - 1.53 * vh) / 2, 0), 0.06 * vw); // 1.53 × height = room the copy + logo need
    const over = Math.max(cw - (vw - 2 * gut), 0);
    kv.style.setProperty("--gut", gut.toFixed(1) + "px");
    kv.style.setProperty("--shift", (portrait.matches ? 0 : gut - 0.24 * over - (vw - cw) / 2).toFixed(1) + "px");
  };
  const toggleBars = () => {
    const H = kv.offsetHeight;
    let y = scrollY;
    if (layered) {
      fTarget = portrait.matches ? 1 : Math.min(y / (H * MOVE), 1); // portrait: shown finished
      if (!portrait.matches) y = Math.max(y - H * HOLD, 0); // the slide-up starts once the hold is over
      if (!raf) raf = requestAnimationFrame(paint);
    }
    bars.forEach(el => el.classList.toggle("is-hidden", y < H / 2));
    if (cssFade) return; // layered cover on a scroll-timeline browser: works.css fades it back on the compositor
    const t = Math.min(y / H, 1);
    kv.style.setProperty("--p", (t * t).toFixed(3)); // 0 → 1 over the first screen, eased in so the blur builds up slowly at first
    kv.classList.toggle("is-blur", t > 0);
  };
  const cssFade = layered && CSS.supports("animation-timeline: scroll()");
  addEventListener("scroll", toggleBars, { passive: true });
  addEventListener("resize", geometry);
  geometry();
  toggleBars();
  // decode the slides' big images ahead of time (idle, after load), so they don't decode mid-scroll as they come in
  if (layered) addEventListener("load", () => {
    const imgs = [...document.querySelectorAll(".wslides img")];
    const next = () => { const im = imgs.shift(); if (im) im.decode().catch(() => {}).then(() => window.requestIdleCallback ? requestIdleCallback(next) : setTimeout(next, 50)); };
    next();
  });
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
