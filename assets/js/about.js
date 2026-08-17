const contextCards = [...document.querySelectorAll("[data-context-card]")];
const hoverAvailable = window.matchMedia("(hover: hover) and (pointer: fine)");
const anyHoverAvailable = window.matchMedia("(any-hover: hover) and (any-pointer: fine)");
const contextPanelTransitionMs = 220;
const contextCloseDelayMs = 330;
const syntheticHoverSuppressionMs = 1200;
const panelHideTimers = new WeakMap();
let activeContextIndex = -1;
let contextCloseTimer = 0;
let lastInputWasPointer = false;
let lastPointerType = "";
let suppressHoverUntil = 0;
let lastPointerPosition = null;

const rememberPointerPosition = (event) => {
  lastPointerPosition = { x: event.clientX, y: event.clientY };
};

const pointerIsWithinCard = (card) => {
  if (!card || !lastPointerPosition) return false;
  const hoveredElement = document.elementFromPoint(lastPointerPosition.x, lastPointerPosition.y);
  return Boolean(hoveredElement && card.contains(hoveredElement));
};

const pointerCanHover = (event) => (
  event.pointerType !== "touch"
  && window.performance.now() >= suppressHoverUntil
  && (hoverAvailable.matches || anyHoverAvailable.matches)
);

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

const clearContextCloseTimer = () => {
  if (!contextCloseTimer) return;
  window.clearTimeout(contextCloseTimer);
  contextCloseTimer = 0;
};

const clearPanelHideTimer = (panel) => {
  const timer = panelHideTimers.get(panel);
  if (!timer) return;
  window.clearTimeout(timer);
  panelHideTimers.delete(panel);
};

const setContextState = (activeIndex, { animate = true } = {}) => {
  clearContextCloseTimer();
  activeContextIndex = activeIndex;
  contextCards.forEach((card, index) => {
    const open = index === activeIndex;
    const trigger = card.querySelector("[data-context-trigger]");
    const panel = card.querySelector("[data-context-panel]");
    trigger?.setAttribute("aria-expanded", String(open));
    card.dataset.selected = String(open);

    if (!panel) {
      card.dataset.open = String(open);
      return;
    }

    clearPanelHideTimer(panel);
    if (open) {
      panel.inert = false;
      const wasHidden = panel.hidden;
      panel.hidden = false;
      if (animate && wasHidden) {
        card.dataset.open = "false";
        window.requestAnimationFrame(() => {
          if (activeContextIndex === index) card.dataset.open = "true";
        });
      } else {
        card.dataset.open = "true";
      }
      return;
    }

    card.dataset.open = "false";
    panel.inert = true;
    if (panel.hidden) return;
    if (!animate) {
      panel.hidden = true;
      return;
    }
    const hideTimer = window.setTimeout(() => {
      if (card.dataset.open === "false") panel.hidden = true;
      panelHideTimers.delete(panel);
    }, contextPanelTransitionMs);
    panelHideTimers.set(panel, hideTimer);
  });
  if (activeIndex >= 0) publishAmbient(contextCards[activeIndex], "context");
};

const scheduleContextClose = (index) => {
  clearContextCloseTimer();
  contextCloseTimer = window.setTimeout(() => {
    contextCloseTimer = 0;
    const card = contextCards[index];
    const keyboardFocusWithin = !lastInputWasPointer && card?.contains(document.activeElement);
    if (activeContextIndex !== index || keyboardFocusWithin || pointerIsWithinCard(card)) return;
    setContextState(-1);
  }, contextCloseDelayMs);
};

contextCards.forEach((card, index) => {
  const trigger = card.querySelector("[data-context-trigger]");

  card.addEventListener("pointerenter", (event) => {
    rememberPointerPosition(event);
    if (!pointerCanHover(event)) return;
    clearContextCloseTimer();
    setContextState(index);
  });

  card.addEventListener("pointerleave", (event) => {
    rememberPointerPosition(event);
    if (pointerCanHover(event) && activeContextIndex === index) scheduleContextClose(index);
  });

  card.addEventListener("focusin", () => {
    if (lastInputWasPointer && lastPointerType === "touch") return;
    clearContextCloseTimer();
    setContextState(index);
  });

  card.addEventListener("focusout", () => {
    requestAnimationFrame(() => {
      if (!card.contains(document.activeElement) && activeContextIndex === index) scheduleContextClose(index);
    });
  });

  trigger?.addEventListener("click", (event) => {
    if (event.detail > 0 && lastPointerType !== "touch" && (hoverAvailable.matches || lastPointerType === "mouse" || lastPointerType === "pen")) {
      setContextState(index);
      return;
    }
    const closesCurrent = activeContextIndex === index && card.dataset.open === "true";
    setContextState(closesCurrent ? -1 : index);
  });
});

document.addEventListener("pointermove", rememberPointerPosition, { passive: true });
document.addEventListener("pointerdown", (event) => {
  rememberPointerPosition(event);
  lastInputWasPointer = true;
  lastPointerType = event.pointerType;
  if (event.pointerType === "touch") suppressHoverUntil = window.performance.now() + syntheticHoverSuppressionMs;
  if (activeContextIndex >= 0 && !event.target.closest("[data-context-card]")) setContextState(-1);
}, true);

document.addEventListener("keydown", (event) => {
  lastInputWasPointer = false;
  lastPointerType = "";
  if (event.key !== "Escape" || activeContextIndex < 0) return;
  event.preventDefault();
  const trigger = contextCards[activeContextIndex]?.querySelector("[data-context-trigger]");
  trigger?.focus();
  setContextState(-1);
});

hoverAvailable.addEventListener?.("change", () => setContextState(-1));
anyHoverAvailable.addEventListener?.("change", () => setContextState(-1));
setContextState(-1, { animate: false });

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
