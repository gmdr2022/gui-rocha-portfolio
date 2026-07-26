const contextCards = [...document.querySelectorAll("[data-context-card]")];
const hoverAvailable = window.matchMedia("(hover: hover) and (pointer: fine)");

const setCardOpen = (card, open) => {
  const trigger = card.querySelector("[data-context-trigger]");
  const panel = card.querySelector("[data-context-panel]");
  if (!trigger || !panel) return;
  trigger.setAttribute("aria-expanded", String(open));
  panel.hidden = !open;
  card.dataset.open = String(open);
};

const closeOtherCards = (currentCard) => {
  contextCards.forEach((card) => {
    if (card === currentCard) return;
    card.dataset.pinned = "false";
    setCardOpen(card, false);
  });
};

contextCards.forEach((card) => {
  const trigger = card.querySelector("[data-context-trigger]");
  card.dataset.pinned = "false";
  card.dataset.open = "false";
  setCardOpen(card, false);

  card.addEventListener("pointerenter", () => {
    if (!hoverAvailable.matches || card.dataset.suppressPreview === "true") return;
    setCardOpen(card, true);
  });

  card.addEventListener("pointerleave", () => {
    card.dataset.suppressPreview = "false";
    if (card.dataset.pinned !== "true" && !card.contains(document.activeElement)) {
      setCardOpen(card, false);
    }
  });

  card.addEventListener("focusin", () => {
    if (card.dataset.suppressPreview !== "true") setCardOpen(card, true);
  });

  card.addEventListener("focusout", () => {
    requestAnimationFrame(() => {
      if (card.contains(document.activeElement)) return;
      card.dataset.suppressPreview = "false";
      if (card.dataset.pinned !== "true" && !(hoverAvailable.matches && card.matches(":hover"))) {
        setCardOpen(card, false);
      }
    });
  });

  trigger?.addEventListener("click", () => {
    const willPin = card.dataset.pinned !== "true";
    closeOtherCards(card);
    card.dataset.pinned = String(willPin);
    card.dataset.suppressPreview = String(!willPin);
    setCardOpen(card, willPin);
  });

  card.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    card.dataset.pinned = "false";
    card.dataset.suppressPreview = "true";
    setCardOpen(card, false);
    trigger?.focus();
  });
});
