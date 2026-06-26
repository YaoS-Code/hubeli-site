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
