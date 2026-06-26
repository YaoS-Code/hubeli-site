const hero = document.querySelector(".hero");
const menuButton = document.querySelector(".menu-button");
const navLinks = document.querySelector(".nav-links");
const zones = Array.from(document.querySelectorAll(".head-zone"));

const INTRO_SCREENS = 1;
const PERFORMER_SCREENS = 2.25;
const performers = ["cello", "piano", "violin"];

let hoveredPerformer = null;
let scrollPerformer = null;
let isPinned = false;
let frame = 0;

const spotlightTarget = { x: -999, y: -999 };
const spotlightSmooth = { x: -999, y: -999 };

function setActivePerformer(value) {
  const active = hoveredPerformer || scrollPerformer || "";
  hero.dataset.active = active;
  hero.classList.toggle("has-active", Boolean(active));
  hero.classList.toggle("home-spotlight", !active);

  zones.forEach((zone) => {
    zone.classList.toggle("is-active", zone.dataset.performer === active);
  });
}

function updateScrollState() {
  frame = 0;

  if (window.matchMedia("(max-width: 820px)").matches) {
    isPinned = false;
    scrollPerformer = null;
    hoveredPerformer = null;
    hero.classList.remove("is-pinned");
    setActivePerformer();
    return;
  }

  const viewportHeight = window.innerHeight;
  const distanceIntoHero = window.scrollY - hero.offsetTop;
  const pinEnd = hero.offsetHeight - viewportHeight;

  isPinned = distanceIntoHero >= 0 && distanceIntoHero < pinEnd;
  hero.classList.toggle("is-pinned", isPinned);

  if (!isPinned || distanceIntoHero < viewportHeight * INTRO_SCREENS) {
    scrollPerformer = null;
    setActivePerformer();
    return;
  }

  const performerIndex = Math.floor(
    (distanceIntoHero - viewportHeight * INTRO_SCREENS) / (viewportHeight * PERFORMER_SCREENS)
  );
  scrollPerformer = performers[Math.min(performerIndex, performers.length - 1)] || null;
  setActivePerformer();
}

function requestScrollUpdate() {
  if (frame) return;
  frame = window.requestAnimationFrame(updateScrollState);
}

function setSpotlightFromEvent(event) {
  const rect = hero.getBoundingClientRect();
  const next = {
    x: isPinned ? event.clientX : event.clientX - rect.left,
    y: isPinned ? event.clientY : event.clientY - rect.top
  };

  spotlightTarget.x = next.x;
  spotlightTarget.y = next.y;

  if (spotlightSmooth.x < -500 || spotlightSmooth.y < -500) {
    spotlightSmooth.x = next.x;
    spotlightSmooth.y = next.y;
  }
}

function animateSpotlight() {
  spotlightSmooth.x += (spotlightTarget.x - spotlightSmooth.x) * 0.12;
  spotlightSmooth.y += (spotlightTarget.y - spotlightSmooth.y) * 0.12;

  hero.style.setProperty("--spotlight-x", `${spotlightSmooth.x}px`);
  hero.style.setProperty("--spotlight-y", `${spotlightSmooth.y}px`);

  window.requestAnimationFrame(animateSpotlight);
}

hero.addEventListener("pointermove", setSpotlightFromEvent);
window.addEventListener("scroll", requestScrollUpdate, { passive: true });
window.addEventListener("resize", requestScrollUpdate);

zones.forEach((zone) => {
  zone.addEventListener("mouseenter", (event) => {
    setSpotlightFromEvent(event);
    hoveredPerformer = zone.dataset.performer;
    setActivePerformer();
  });

  zone.addEventListener("mouseleave", () => {
    hoveredPerformer = null;
    setActivePerformer();
  });

  zone.addEventListener("focus", (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setSpotlightFromEvent({ clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 });
    hoveredPerformer = zone.dataset.performer;
    setActivePerformer();
  });

  zone.addEventListener("blur", () => {
    hoveredPerformer = null;
    setActivePerformer();
  });
});

menuButton?.addEventListener("click", () => {
  const expanded = menuButton.getAttribute("aria-expanded") === "true";
  menuButton.setAttribute("aria-expanded", String(!expanded));
  navLinks?.classList.toggle("is-open", !expanded);
});

updateScrollState();
animateSpotlight();

// --- Position hero head-zones to track the cover-cropped image at any viewport ---
const HEAD_FRACTIONS = {
  cello: [0.56, 0.36],
  piano: [0.69, 0.3],
  violin: [0.89, 0.28]
};
const heroBaseImg = document.querySelector(".hero-base");
const heroStage = document.querySelector(".hero-stage");

function positionHeadZones() {
  if (!heroBaseImg || !heroStage || !heroBaseImg.naturalWidth) return;
  if (window.matchMedia("(max-width: 820px)").matches) {
    zones.forEach((zone) => {
      zone.style.left = "";
      zone.style.top = "";
      zone.style.transform = "";
    });
    return;
  }
  const w = heroStage.clientWidth;
  const h = heroStage.clientHeight;
  const scale = Math.max(w / heroBaseImg.naturalWidth, h / heroBaseImg.naturalHeight);
  const renderW = heroBaseImg.naturalWidth * scale;
  const renderH = heroBaseImg.naturalHeight * scale;
  const offsetX = (w - renderW) * 1; // matches object-position-x: 100%
  const offsetY = (h - renderH) * 0.5; // matches object-position-y: center
  zones.forEach((zone) => {
    const f = HEAD_FRACTIONS[zone.dataset.performer];
    if (!f) return;
    // Position by corner (center - half size) instead of a transform: a transform
    // on the zone would become the containing block for the performer-copy's
    // position: fixed, pinning the text to the head instead of the viewport edge.
    zone.style.left = `${offsetX + f[0] * renderW - zone.offsetWidth / 2}px`;
    zone.style.top = `${offsetY + f[1] * renderH - zone.offsetHeight / 2}px`;
    zone.style.transform = "none";
  });
}

if (heroBaseImg) {
  if (heroBaseImg.complete) positionHeadZones();
  heroBaseImg.addEventListener("load", positionHeadZones);
}
window.addEventListener("resize", positionHeadZones);
positionHeadZones();

// --- Scroll reveal + nav scroll-spy (progressive enhancement) ---
document.documentElement.classList.add("js-reveal");

const reveals = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window && reveals.length) {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { rootMargin: "0px 0px -10% 0px", threshold: 0.12 }
  );
  reveals.forEach((el) => revealObserver.observe(el));
} else {
  reveals.forEach((el) => el.classList.add("is-visible"));
}

const navAnchors = Array.from(document.querySelectorAll(".nav-links a"));
const spyTargets = [
  { id: "top", el: hero },
  { id: "ensemble", el: document.getElementById("ensemble") },
  { id: "performances", el: document.getElementById("performances") },
  { id: "contact", el: document.getElementById("contact") }
].filter((target) => target.el);

if ("IntersectionObserver" in window && navAnchors.length && spyTargets.length) {
  const spy = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = entry.target.dataset.spyId;
        navAnchors.forEach((anchor) =>
          anchor.classList.toggle("is-active", anchor.getAttribute("href") === `#${id}`)
        );
      });
    },
    { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
  );
  spyTargets.forEach((target) => {
    target.el.dataset.spyId = target.id;
    spy.observe(target.el);
  });
}

const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = String(new Date().getFullYear());
