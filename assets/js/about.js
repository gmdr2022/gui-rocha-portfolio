const contextCards = [...document.querySelectorAll("[data-context-card]")];
const hoverAvailable = window.matchMedia("(hover: hover) and (pointer: fine)");
let pinnedContextIndex = contextCards.length ? 0 : -1;
let previewContextIndex = -1;
let contextSuspended = false;

const publishAmbient = (element, source) => {
  if (!element) return;
  const index = Number(element.dataset.index);
  const accentRgb = element.dataset.accentRgb
    || element.style.getPropertyValue("--context-accent-rgb").trim();
  window.dispatchEvent(new CustomEvent("portal:ambientchange", {
    detail: {
      id: element.dataset.category || element.id || `${source}-${index}`,
      accentRgb,
      index,
      source,
    },
  }));
};

const setContextState = (activeIndex) => {
  contextCards.forEach((card, index) => {
    const open = index === activeIndex;
    const trigger = card.querySelector("[data-context-trigger]");
    const panel = card.querySelector("[data-context-panel]");
    trigger?.setAttribute("aria-expanded", String(open));
    if (panel) panel.hidden = !open;
    card.dataset.open = String(open);
    card.dataset.selected = String(index === pinnedContextIndex);
  });
  if (activeIndex >= 0) publishAmbient(contextCards[activeIndex], "context");
};

const previewContext = (index) => {
  contextSuspended = false;
  previewContextIndex = index;
  setContextState(index);
};

const restorePinnedContext = () => {
  previewContextIndex = -1;
  setContextState(contextSuspended ? -1 : pinnedContextIndex);
};

contextCards.forEach((card, index) => {
  const trigger = card.querySelector("[data-context-trigger]");

  card.addEventListener("pointerenter", () => {
    if (hoverAvailable.matches) previewContext(index);
  });

  card.addEventListener("pointerleave", () => {
    if (hoverAvailable.matches && previewContextIndex === index) restorePinnedContext();
  });

  card.addEventListener("focusin", () => previewContext(index));

  card.addEventListener("focusout", () => {
    requestAnimationFrame(() => {
      if (!card.contains(document.activeElement) && previewContextIndex === index) restorePinnedContext();
    });
  });

  trigger?.addEventListener("click", () => {
    const closesCurrent = !hoverAvailable.matches
      && pinnedContextIndex === index
      && card.dataset.open === "true";
    pinnedContextIndex = index;
    previewContextIndex = -1;
    contextSuspended = closesCurrent;
    setContextState(closesCurrent ? -1 : index);
  });

  card.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    previewContextIndex = -1;
    contextSuspended = true;
    setContextState(-1);
    trigger?.focus();
  });
});

if (pinnedContextIndex >= 0) setContextState(pinnedContextIndex);

const decisionSteps = [...document.querySelectorAll("[data-decision-step]")];
let activeDecisionIndex = 0;

const selectDecision = (index, { focus = false } = {}) => {
  const step = decisionSteps[index];
  if (!step) return;
  activeDecisionIndex = index;
  decisionSteps.forEach((item, itemIndex) => {
    const link = item.querySelector("a");
    if (itemIndex === activeDecisionIndex) link?.setAttribute("aria-current", "step");
    else link?.removeAttribute("aria-current");
    item.dataset.current = String(itemIndex === activeDecisionIndex);
  });
  publishAmbient(step, "decision");
  if (focus) step.querySelector("a")?.focus();
};

decisionSteps.forEach((step, index) => {
  const link = step.querySelector("a");
  step.addEventListener("pointerenter", () => {
    if (hoverAvailable.matches) selectDecision(index);
  });
  link?.addEventListener("focus", () => selectDecision(index));
  link?.addEventListener("click", () => selectDecision(index));
  link?.addEventListener("keydown", (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    let nextIndex = activeDecisionIndex;
    if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = decisionSteps.length - 1;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = (activeDecisionIndex - 1 + decisionSteps.length) % decisionSteps.length;
    else nextIndex = (activeDecisionIndex + 1) % decisionSteps.length;
    selectDecision(nextIndex, { focus: true });
  });
});

if (decisionSteps.length) selectDecision(0);
