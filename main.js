// Cullery website motion. No libraries, nothing loaded from elsewhere. With reduced motion
// every piece shows its finished state straight away.

const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Until scripts/site-fill.sh puts the App Store link in, the Download buttons say so.
document.querySelectorAll('a.button[href^="[["]').forEach((button) => {
  button.textContent = "Coming soon to the App Store";
  button.removeAttribute("href");
  button.setAttribute("aria-disabled", "true");
});

// Header hairline once the page scrolls.
const header = document.querySelector(".site-header");
const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 8);
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

// Fade sections in as they arrive.
const reveal = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (entry.isIntersecting) {
      entry.target.classList.add("in");
      reveal.unobserve(entry.target);
    }
  }
}, { rootMargin: "0px 0px -8% 0px" });
document.querySelectorAll(".reveal").forEach((el) => reveal.observe(el));

// The hero card: the example card's 412 shots, culled to its 38 picks (6 on Saturday's 148,
// 32 on Sunday's 264), each tile one of the stand-in photos from the sprite.
const SHOTS = 412, COLUMNS = 20, PICKS = 38;
const mosaic = document.getElementById("mosaic");
const sd = document.getElementById("sd");
const count = document.getElementById("pick-count");
const replay = document.getElementById("replay");

function picks() {
  let seed = 7;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const chosen = new Set([2]);
  while (chosen.size < 6) chosen.add(Math.floor(random() * 148));
  while (chosen.size < PICKS) chosen.add(148 + Math.floor(random() * 264));
  return chosen;
}

const tiles = [];
if (mosaic) {
  const chosen = picks();
  const total = Math.ceil(SHOTS / COLUMNS) * COLUMNS;
  for (let i = 0; i < total; i++) {
    const tile = document.createElement("i");
    if (i >= SHOTS) {
      tile.className = "empty";
    } else {
      const photo = i % 50;
      tile.style.backgroundPosition = `${(photo % 10) / 9 * 100}% ${Math.floor(photo / 10) / 4 * 100}%`;
      if (chosen.has(i)) tile.classList.add("pick");
      tiles.push(tile);
    }
    mosaic.appendChild(tile);
  }
}

let timers = [];
function cull() {
  timers.forEach(clearTimeout);
  timers = [];
  mosaic.classList.remove("on", "culled");
  sd.classList.remove("done");
  replay.hidden = true;
  if (still) {
    mosaic.classList.add("on", "culled");
    sd.classList.add("done");
    count.textContent = PICKS;
    return;
  }
  count.textContent = 0;
  // Tiles arrive in a diagonal wave…
  tiles.forEach((tile, i) => {
    tile.style.transitionDelay = `${(Math.floor(i / COLUMNS) + (i % COLUMNS)) * 14}ms`;
  });
  void mosaic.offsetWidth;
  mosaic.classList.add("on");
  // …then the card is gone through in order, the rest dimming as each pick lights up.
  timers.push(setTimeout(() => {
    let picked = 0;
    tiles.forEach((tile, i) => {
      const delay = i * 4;
      tile.style.transitionDelay = `${delay}ms`;
      if (tile.classList.contains("pick")) {
        timers.push(setTimeout(() => { count.textContent = ++picked; }, delay + 120));
      }
    });
    mosaic.classList.add("culled");
    timers.push(setTimeout(() => {
      sd.classList.add("done");
      replay.hidden = false;
      tiles.forEach((tile) => { tile.style.transitionDelay = "0ms"; });
    }, SHOTS * 4 + 700));
  }, 1300));
}

if (mosaic) {
  cull();
  replay.addEventListener("click", cull);
}

// How it goes: the phone shows the step in the middle of the screen.
const steps = [...document.querySelectorAll(".step")];
const screens = [...document.querySelectorAll("#screens img")];
const dots = [...document.querySelectorAll("#dots span")];
function show(index) {
  steps.forEach((step, i) => step.classList.toggle("active", i === index));
  screens.forEach((img, i) => img.classList.toggle("active", i === index));
  dots.forEach((dot, i) => dot.classList.toggle("active", i === index));
}
// The step whose middle is nearest the middle of the window, so a jump (a link, a fast
// flick) still lands on the right screen.
let current = -1, queued = false;
function follow() {
  queued = false;
  const middle = window.innerHeight / 2;
  let best = 0, distance = Infinity;
  steps.forEach((step, i) => {
    const box = step.getBoundingClientRect();
    const d = Math.abs(box.top + box.height / 2 - middle);
    if (d < distance) { distance = d; best = i; }
  });
  if (best !== current) { current = best; show(best); }
}
if (steps.length) {
  window.addEventListener("scroll", () => {
    if (!queued) { queued = true; requestAnimationFrame(follow); }
  }, { passive: true });
  window.addEventListener("resize", follow);
  follow();
}

// Verify copies: the three fingerprints type out, then agree.
const hashes = document.getElementById("hashes");
const result = document.getElementById("hash-result");
const codes = hashes ? [...hashes.querySelectorAll("code")] : [];
const pause = (ms) => new Promise((done) => setTimeout(done, ms));
async function fingerprint() {
  if (still) {
    codes.forEach((code) => { code.textContent = code.dataset.hash; });
    result.classList.add("show");
    return;
  }
  for (const code of codes) {
    const hash = code.dataset.hash;
    const cursor = document.createElement("span");
    cursor.className = "cursor";
    for (let n = 1; n <= hash.length; n += 2) {
      code.textContent = hash.slice(0, n + 1);
      code.appendChild(cursor);
      await pause(16);
    }
    cursor.remove();
    await pause(260);
  }
  result.classList.add("show");
}
if (hashes) {
  const hashWatch = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      hashWatch.disconnect();
      fingerprint();
    }
  }, { threshold: 0.5 });
  hashWatch.observe(hashes);
}

// Light and dark: the slider moves the split.
const compare = document.getElementById("compare");
if (compare) {
  const range = compare.querySelector("input");
  const split = () => compare.style.setProperty("--split", `${range.value}%`);
  range.addEventListener("input", split);
  split();
}
