const catalog = document.querySelector("[data-project-catalog]");
const deck = document.querySelector("[data-project-deck]");
const cards = [...document.querySelectorAll("[data-project-card]")];
const dots = [...document.querySelectorAll("[data-deck-dot]")];
const previousButton = document.querySelector("[data-deck-previous]");
const nextButton = document.querySelector("[data-deck-next]");
const previousEdgeButton = document.querySelector("[data-deck-edge-previous]");
const nextEdgeButton = document.querySelector("[data-deck-edge-next]");
const previousEdgeName = document.querySelector("[data-deck-edge-previous-name]");
const nextEdgeName = document.querySelector("[data-deck-edge-next-name]");
const currentName = document.querySelector("[data-deck-current]");
const currentHeading = document.querySelector("[data-deck-current-heading]");
const subtitle = document.querySelector("[data-deck-subtitle]");
const counter = document.querySelector("[data-deck-counter]");
const liveRegion = document.querySelector("[data-deck-live]");
const languageLinks = [...document.querySelectorAll("[data-language-link]")];

const slugAliases = new Map([
  ["cc", "codex-checkpoint"],
  ["checkpoint", "codex-checkpoint"],
  ["maeve-roscaern", "maeve"],
  ["demonyza", "sites"],
  ["site", "sites"],
  ["presenca-digital", "sites"],
  ["presencia-digital", "sites"],
  ["digital-presence", "sites"],
  ["local-first", "local-first-checklist"],
  ["c7", "c7-engineering-system"],
  ["c7es", "c7-engineering-system"],
]);

let activeIndex = 0;
let pointerStart = null;
let suppressNextClick = false;

const normalizeSlug = (value) => {
  const normalized = String(value ?? "").trim().toLowerCase();
  return slugAliases.get(normalized) ?? normalized;
};

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

const updateLanguageLinks = (slug) => {
  languageLinks.forEach((link) => {
    const target = new URL(link.getAttribute("href"), location.origin);
    target.searchParams.set("project", slug);
    target.searchParams.delete("projeto");
    target.searchParams.delete("proyecto");
    link.href = `${target.pathname}${target.search}`;
  });
};

const updateUrl = (slug) => {
  const url = new URL(location.href);
  url.searchParams.set("project", slug);
  url.searchParams.delete("projeto");
  url.searchParams.delete("proyecto");
  history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
};

const applyActiveProject = (requestedSlug, { announce = false, writeUrl = false } = {}) => {
  if (!cards.length || !catalog) return false;

  const slug = normalizeSlug(requestedSlug);
  const requestedIndex = cards.findIndex((card) => card.dataset.project === slug);
  if (requestedIndex < 0) return false;

  activeIndex = requestedIndex;
  const activeCard = cards[activeIndex];
  hydrateCard(activeCard);
  hydrateCard(cards[(activeIndex + 1) % cards.length]);

  const projectName = activeCard.querySelector("h2")?.textContent?.trim() || "";
  const deckName = activeCard.dataset.deckName || projectName;
  const projectSubtitle = activeCard.dataset.showcaseSubtitle || "";
  const previousCard = cards[(activeIndex - 1 + cards.length) % cards.length];
  const nextCard = cards[(activeIndex + 1) % cards.length];
  const previousName = previousCard.querySelector("h2")?.textContent?.trim() || "";
  const nextName = nextCard.querySelector("h2")?.textContent?.trim() || "";
  const previousDeckName = previousCard.dataset.deckName || previousName;
  const nextDeckName = nextCard.dataset.deckName || nextName;

  cards.forEach((card, index) => {
    const offset = wrappedOffset(index);
    const position = offset === 0 ? "active" : offset === 1 ? "next" : offset === -1 ? "previous" : "hidden";
    card.dataset.position = position;
    card.style.setProperty("--card-offset", offset);
    card.setAttribute("aria-hidden", String(offset !== 0));
    card.inert = offset !== 0;
  });

  dots.forEach((dot, index) => dot.setAttribute("aria-pressed", String(index === activeIndex)));
  if (currentName) currentName.textContent = deckName;
  if (currentHeading) currentHeading.textContent = projectName;
  if (subtitle) subtitle.textContent = projectSubtitle;
  if (counter) counter.textContent = `${String(activeIndex + 1).padStart(2, "0")} / ${String(cards.length).padStart(2, "0")}`;
  catalog.style.setProperty("--active-accent", activeCard.style.getPropertyValue("--project-accent"));
  catalog.style.setProperty("--active-accent-rgb", activeCard.style.getPropertyValue("--project-accent-rgb"));
  window.dispatchEvent(new CustomEvent("portal:ambientchange", {
    detail: {
      id: activeCard.dataset.project,
      accentRgb: activeCard.style.getPropertyValue("--project-accent-rgb").trim(),
      index: activeIndex,
      source: "project",
    },
  }));
  if (previousEdgeButton) {
    previousEdgeButton.setAttribute("aria-controls", previousCard.id);
    previousEdgeButton.setAttribute("aria-label", `${previousEdgeButton.dataset.edgeLabel}: ${previousName}`);
  }
  if (nextEdgeButton) {
    nextEdgeButton.setAttribute("aria-controls", nextCard.id);
    nextEdgeButton.setAttribute("aria-label", `${nextEdgeButton.dataset.edgeLabel}: ${nextName}`);
  }
  if (previousEdgeName) previousEdgeName.textContent = previousDeckName;
  if (nextEdgeName) nextEdgeName.textContent = nextDeckName;
  updateLanguageLinks(slug);

  if (writeUrl) updateUrl(slug);
  if (announce && liveRegion) {
    liveRegion.textContent = `${projectName}, ${activeIndex + 1} / ${cards.length}.`;
  }
  return true;
};

const slugAtOffset = (offset) => cards[(activeIndex + offset + cards.length) % cards.length]?.dataset.project;
const selectOffset = (offset, announce = true) => {
  const slug = slugAtOffset(offset);
  if (slug) applyActiveProject(slug, { announce, writeUrl: true });
};

const parameters = new URLSearchParams(location.search);
const requestedSlug = parameters.get("project") ?? parameters.get("projeto") ?? parameters.get("proyecto");
const initialSlug = normalizeSlug(requestedSlug || cards[0]?.dataset.project);
if (!applyActiveProject(initialSlug, { writeUrl: Boolean(requestedSlug) })) {
  applyActiveProject(cards[0]?.dataset.project);
  if (requestedSlug) {
    const cleanUrl = new URL(location.href);
    cleanUrl.searchParams.delete("project");
    cleanUrl.searchParams.delete("projeto");
    cleanUrl.searchParams.delete("proyecto");
    history.replaceState(null, "", `${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`);
  }
}

previousButton?.addEventListener("click", () => selectOffset(-1));
nextButton?.addEventListener("click", () => selectOffset(1));
previousEdgeButton?.addEventListener("click", () => selectOffset(-1));
nextEdgeButton?.addEventListener("click", () => selectOffset(1));

dots.forEach((dot, index) => {
  dot.addEventListener("click", () => {
    const slug = cards[index]?.dataset.project;
    if (slug) applyActiveProject(slug, { announce: true, writeUrl: true });
  });
});

deck?.addEventListener("click", (event) => {
  if (suppressNextClick) {
    suppressNextClick = false;
    event.preventDefault();
    event.stopPropagation();
    return;
  }
  if (isInteractiveTarget(event.target)) return;
  const card = event.target.closest("[data-project-card]")
    ?? document.elementsFromPoint(event.clientX, event.clientY).find((element) => element.matches?.("[data-project-card]"));
  if (!card || card.dataset.position === "active") return;
  event.preventDefault();
  applyActiveProject(card.dataset.project, { announce: true, writeUrl: true });
});

deck?.addEventListener("pointerdown", (event) => {
  if (!event.isPrimary || event.button !== 0 || isInteractiveTarget(event.target)) {
    pointerStart = null;
    return;
  }
  pointerStart = {
    x: event.clientX,
    y: event.clientY,
    pointerId: event.pointerId,
  };
  deck.setPointerCapture?.(event.pointerId);
});

const finishPointer = (event, allowSelection) => {
  if (!pointerStart || pointerStart.pointerId !== event.pointerId) return;
  const deltaX = event.clientX - pointerStart.x;
  const deltaY = event.clientY - pointerStart.y;
  const horizontalGesture = Math.abs(deltaX) > 56 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2;
  if (allowSelection && horizontalGesture) {
    suppressNextClick = true;
    setTimeout(() => {
      suppressNextClick = false;
    }, 0);
    selectOffset(deltaX < 0 ? 1 : -1);
  }
  if (deck.hasPointerCapture?.(event.pointerId)) deck.releasePointerCapture(event.pointerId);
  pointerStart = null;
};

deck?.addEventListener("pointerup", (event) => finishPointer(event, true));
deck?.addEventListener("pointercancel", (event) => finishPointer(event, false));
deck?.addEventListener("lostpointercapture", (event) => {
  if (pointerStart?.pointerId === event.pointerId) pointerStart = null;
});

deck?.addEventListener("keydown", (event) => {
  if (isInteractiveTarget(event.target)) return;
  if (event.key === "ArrowRight") {
    event.preventDefault();
    selectOffset(1);
  } else if (event.key === "ArrowLeft") {
    event.preventDefault();
    selectOffset(-1);
  }
});
