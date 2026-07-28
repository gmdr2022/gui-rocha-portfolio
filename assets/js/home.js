const catalog = document.querySelector("[data-project-catalog]");
const deck = document.querySelector("[data-project-deck]");
const cards = [...document.querySelectorAll("[data-project-card]")];
const dots = [...document.querySelectorAll("[data-deck-dot]")];
const previousButton = document.querySelector("[data-deck-previous]");
const nextButton = document.querySelector("[data-deck-next]");
const currentName = document.querySelector("[data-deck-current]");
const counter = document.querySelector("[data-deck-counter]");
const catalogTitle = document.querySelector("#projects-title");
const liveRegion = document.querySelector("[data-deck-live]");

let activeIndex = 0;
let pointerStart = null;

const hydrateCard = (card) => {
  card?.querySelectorAll("[data-deferred-src]").forEach((image) => {
    const source = image.dataset.deferredSrc;
    if (!source) return;
    image.src = source;
    delete image.dataset.deferredSrc;
  });
};

const isInteractiveTarget = (target) => (
  target instanceof Element
  && Boolean(target.closest("a, button, summary, input, select, textarea, label"))
);

const wrappedOffset = (index) => {
  let offset = index - activeIndex;
  if (offset > cards.length / 2) offset -= cards.length;
  if (offset < -cards.length / 2) offset += cards.length;
  return offset;
};

const updateDeck = (requestedIndex, announce = false) => {
  if (!cards.length) return;
  activeIndex = (requestedIndex + cards.length) % cards.length;
  const activeCard = cards[activeIndex];
  hydrateCard(activeCard);
  const projectName = activeCard.querySelector("h2")?.textContent?.trim() || "";
  const deckName = activeCard.dataset.deckName || projectName;

  cards.forEach((card, index) => {
    const offset = wrappedOffset(index);
    const position = offset === 0 ? "active" : offset === 1 ? "next" : offset === -1 ? "previous" : "hidden";
    card.dataset.position = position;
    card.style.setProperty("--card-offset", offset);
    card.setAttribute("aria-hidden", String(offset !== 0));
    card.inert = offset !== 0;
  });

  dots.forEach((dot, index) => dot.setAttribute("aria-pressed", String(index === activeIndex)));
  currentName.textContent = deckName;
  catalogTitle.textContent = projectName;
  counter.textContent = `${String(activeIndex + 1).padStart(2, "0")} / ${String(cards.length).padStart(2, "0")}`;
  catalog.style.setProperty("--active-accent", activeCard.style.getPropertyValue("--project-accent"));
  catalog.style.setProperty("--active-accent-rgb", activeCard.style.getPropertyValue("--project-accent-rgb"));

  if (announce) {
    const status = activeCard.querySelector(".status-pill")?.textContent?.trim() || "";
    liveRegion.textContent = `${projectName}. ${status}`;
    const url = new URL(location.href);
    if (activeIndex === 0) {
      url.searchParams.delete("project");
      url.searchParams.delete("projeto");
    } else {
      const slug = activeCard.querySelector(".card-link")?.getAttribute("href")?.split("/").filter(Boolean).at(-1);
      url.searchParams.set("project", slug);
      url.searchParams.delete("projeto");
    }
    history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }
};

const requestedSlug = new URLSearchParams(location.search).get("project")
  || new URLSearchParams(location.search).get("projeto");
const requestedIndex = cards.findIndex((card) => card.querySelector(".card-link")?.getAttribute("href")?.includes(`/${requestedSlug}/`));
updateDeck(requestedIndex >= 0 ? requestedIndex : 0);

previousButton?.addEventListener("click", () => updateDeck(activeIndex - 1, true));
nextButton?.addEventListener("click", () => updateDeck(activeIndex + 1, true));

dots.forEach((dot, index) => {
  dot.addEventListener("click", () => updateDeck(index, true));
});

deck?.addEventListener("click", (event) => {
  const card = event.target.closest("[data-project-card]");
  if (!card || card.dataset.position === "active") return;
  event.preventDefault();
  updateDeck(Number(card.dataset.index), true);
});

deck?.addEventListener("pointerdown", (event) => {
  if (event.button !== 0 || isInteractiveTarget(event.target)) {
    pointerStart = null;
    return;
  }
  pointerStart = {
    x: event.clientX,
    pointerId: event.pointerId,
  };
  deck.setPointerCapture?.(event.pointerId);
});

deck?.addEventListener("pointerup", (event) => {
  if (pointerStart === null || pointerStart.pointerId !== event.pointerId) return;
  const delta = event.clientX - pointerStart.x;
  if (Math.abs(delta) > 56) updateDeck(activeIndex + (delta < 0 ? 1 : -1), true);
  pointerStart = null;
});

deck?.addEventListener("pointercancel", () => {
  pointerStart = null;
});

catalog?.addEventListener("keydown", (event) => {
  if (event.target.matches("a, button, summary")) return;
  if (event.key === "ArrowRight") {
    event.preventDefault();
    updateDeck(activeIndex + 1, true);
  }
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    updateDeck(activeIndex - 1, true);
  }
});
