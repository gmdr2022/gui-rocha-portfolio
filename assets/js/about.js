const workMaps = [...document.querySelectorAll("[data-work-map]")];
const hoverAvailable = window.matchMedia("(hover: hover) and (pointer: fine)");
const anyHoverAvailable = window.matchMedia("(any-hover: hover) and (any-pointer: fine)");
const workMapPanelTransitionMs = 260;
const workMapCloseDelayMs = 300;
const syntheticHoverSuppressionMs = 1200;
const keyboardHoverSuppressionMs = 450;
const workMapEffectDurationMs = 1050;
const panelHideTimers = new WeakMap();
let lastInputWasPointer = false;
let lastPointerType = "";
let suppressHoverUntil = 0;
let lastPointerPosition = null;

const rememberPointerPosition = (event) => {
  lastPointerPosition = { x: event.clientX, y: event.clientY };
};

const pointerIsWithin = (element) => {
  if (!element || !lastPointerPosition) return false;
  const hoveredElement = document.elementFromPoint(lastPointerPosition.x, lastPointerPosition.y);
  return Boolean(hoveredElement && element.contains(hoveredElement));
};

const pointerCanHover = (event) => (
  event.pointerType === "mouse"
  && window.performance.now() >= suppressHoverUntil
  && (hoverAvailable.matches || anyHoverAvailable.matches)
);

const publishAmbient = (element, source) => {
  if (!element) return;
  const rootNode = element.matches?.('[data-work-map-depth="0"]')
    ? element
    : element.closest?.('[data-work-map-depth="0"]');
  const ambientNode = rootNode || element;
  const index = Number(ambientNode.dataset.index);
  const accentRgb = ambientNode.dataset.accentRgb
    || ambientNode.style.getPropertyValue("--work-map-accent-rgb").trim();
  window.dispatchEvent(new CustomEvent("portal:ambientchange", {
    detail: {
      id: ambientNode.dataset.category || ambientNode.id || `${source}-${index}`,
      accentRgb,
      index,
      source,
    },
  }));
};

const clearPanelHideTimer = (panel) => {
  const timer = panelHideTimers.get(panel);
  if (!timer) return;
  window.clearTimeout(timer);
  panelHideTimers.delete(panel);
};

const clamp = (value, minimum, maximum) => Math.min(Math.max(value, minimum), Math.max(minimum, maximum));

const directBranches = (list) => [...list?.children || []].filter((node) => node.matches?.(".work-map-branch"));

const initializeWorkMap = (map) => {
  const nav = map.querySelector("[data-work-map-nav]");
  const visual = map.querySelector("[data-work-map-visual]");
  const mediaImage = map.querySelector(".work-map-media img");
  const effects = map.querySelector("[data-work-map-effects]");
  const focusImage = map.querySelector("[data-work-map-focus-image]");
  const hotspots = [...map.querySelectorAll("[data-work-map-hotspot]")];
  const branches = [...map.querySelectorAll(".work-map-branch")];
  const closeTimers = new WeakMap();
  let layoutFrame = 0;
  let effectTimer = 0;
  let orbitTimer = 0;
  let animatedOrbitShapes = [];

  const panelFor = (branch) => branch.querySelector(":scope > [data-work-map-panel]");
  const triggerFor = (branch) => branch.querySelector(":scope > [data-work-map-trigger]");
  const depthOf = (branch) => Number(branch.dataset.workMapDepth || 0);
  const isOpen = (branch) => branch.dataset.open === "true";
  const isExpanded = (branch) => triggerFor(branch)?.getAttribute("aria-expanded") === "true";

  const rootNodeFor = (node) => node?.matches?.('[data-work-map-depth="0"]')
    ? node
    : node?.closest?.('[data-work-map-depth="0"]');

  const syncFocusImageSource = () => {
    if (!mediaImage || !focusImage) return;
    const source = mediaImage.currentSrc || mediaImage.src;
    if (source && focusImage.getAttribute("href") !== source) focusImage.setAttribute("href", source);
  };

  const updateFocusImage = (hotspot, accentRgb = "130 215 255") => {
    if (!hotspot) {
      if (focusImage) {
        focusImage.dataset.active = "false";
        focusImage.removeAttribute("data-work-map-effect");
      }
      delete map.dataset.workMapEffectActive;
      return;
    }
    const effect = hotspot.dataset.workMapEffect || "screen";
    map.dataset.workMapEffectActive = effect;
    if (!focusImage) return;
    const clipPath = hotspot.dataset.workMapClip;
    if (clipPath) focusImage.setAttribute("clip-path", clipPath);
    focusImage.style.setProperty("--work-map-hotspot-rgb", accentRgb);
    focusImage.dataset.workMapEffect = effect;
    focusImage.dataset.active = "true";
    syncFocusImageSource();
  };

  const clearInkOrbitAnimation = () => {
    if (orbitTimer) window.clearTimeout(orbitTimer);
    orbitTimer = 0;
    animatedOrbitShapes.forEach((shape) => {
      shape.removeAttribute("transform");
      shape.style.removeProperty("stroke-dashoffset");
      shape.style.removeProperty("opacity");
    });
    animatedOrbitShapes = [];
  };

  const animateInkOrbit = (hotspot) => {
    clearInkOrbitAnimation();
    const root = document.documentElement;
    if (
      !hotspot
      || hotspot.dataset.workMapEffect !== "ink"
      || root.dataset.motion === "reduced"
      || root.dataset.contrast === "high"
      || window.matchMedia("(forced-colors: active)").matches
      || window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) return;
    const compactVisual = map.clientWidth <= 720;
    if (compactVisual) return;
    const primaryShapes = [...hotspot.querySelectorAll(".work-map-hotspot-orbit-primary .work-map-hotspot-orbit-shape")];
    const secondaryShapes = [...hotspot.querySelectorAll(".work-map-hotspot-orbit-secondary .work-map-hotspot-orbit-shape")];
    const entries = [...primaryShapes.map((shape) => ({
      shape,
      offset: -92,
      restingOpacity: .46,
      peakOpacity: 1,
    })),
      ...secondaryShapes.map((shape) => ({ shape, offset: 68, restingOpacity: .28, peakOpacity: .7 }))];
    if (!entries.length) return;
    animatedOrbitShapes = entries.map(({ shape }) => shape);
    const duration = 860;
    let elapsed = 0;
    let previousTimestamp = window.performance.now();
    const step = () => {
      if (root.dataset.motion === "reduced") {
        clearInkOrbitAnimation();
        return;
      }
      const timestamp = window.performance.now();
      const frameDelta = clamp(timestamp - previousTimestamp, 0, 48);
      previousTimestamp = timestamp;
      elapsed += frameDelta;
      const progress = clamp(elapsed / duration, 0, 1);
      const eased = 1 - ((1 - progress) ** 3);
      const intensity = Math.sin(Math.PI * progress);
      entries.forEach(({ shape, offset, restingOpacity, peakOpacity }) => {
        shape.style.strokeDashoffset = `${(offset * eased).toFixed(2)}px`;
        shape.style.opacity = (restingOpacity + ((peakOpacity - restingOpacity) * intensity)).toFixed(3);
      });
      if (progress < 1) orbitTimer = window.setTimeout(step, 16);
      else clearInkOrbitAnimation();
    };
    orbitTimer = window.setTimeout(step, 16);
  };

  const pulseMapEffect = (hotspot) => {
    if (!effects) return;
    window.clearTimeout(effectTimer);
    map.dataset.workMapBurst = "false";
    void effects.offsetWidth;
    map.dataset.workMapBurst = "true";
    effectTimer = window.setTimeout(() => {
      map.dataset.workMapBurst = "false";
      clearInkOrbitAnimation();
    }, workMapEffectDurationMs);
    animateInkOrbit(hotspot);
  };

  const reactToNode = (node, { burst = false, publish = true } = {}) => {
    if (!node) return;
    const rootNode = rootNodeFor(node) || node;
    const targetId = node.dataset.workMapTarget || rootNode.dataset.workMapTarget;
    if (map.dataset.workMapTargetActive && map.dataset.workMapTargetActive !== targetId) clearInkOrbitAnimation();
    const activeHotspot = hotspots.find((hotspot) => hotspot.dataset.workMapHotspot === targetId);
    hotspots.forEach((hotspot) => {
      hotspot.dataset.active = String(hotspot === activeHotspot);
    });
    const anchor = node.querySelector?.(":scope > [data-work-map-trigger], :scope > [data-work-map-link]")
      || rootNode.querySelector?.(":scope > [data-work-map-trigger]");
    const visualRect = visual?.getBoundingClientRect() || map.getBoundingClientRect();
    const anchorRect = anchor?.getBoundingClientRect();
    if (!visualRect.width || !visualRect.height || !anchorRect) return;
    const accentRgb = activeHotspot?.style.getPropertyValue("--work-map-hotspot-rgb").trim()
      || rootNode.dataset.accentRgb
      || rootNode.style.getPropertyValue("--work-map-accent-rgb").trim()
      || "130 215 255";
    updateFocusImage(activeHotspot, accentRgb);
    const focusX = Number(activeHotspot?.dataset.focusX);
    const focusY = Number(activeHotspot?.dataset.focusY);
    const effectX = Number.isFinite(focusX)
      ? clamp((focusX / 1672) * 100, 4, 96)
      : clamp(((anchorRect.right - visualRect.left) / visualRect.width) * 100 + 3, 8, 92);
    const effectY = Number.isFinite(focusY)
      ? clamp((focusY / 941) * 100, 4, 96)
      : clamp((((anchorRect.top + (anchorRect.height / 2)) - visualRect.top) / visualRect.height) * 100, 8, 92);
    map.style.setProperty("--work-map-effect-rgb", accentRgb);
    map.style.setProperty("--work-map-effect-x", `${effectX.toFixed(2)}%`);
    map.style.setProperty("--work-map-effect-y", `${effectY.toFixed(2)}%`);
    map.dataset.workMapReactive = "true";
    map.dataset.workMapActive = rootNode.dataset.category || rootNode.dataset.workMapId || "active";
    if (targetId) map.dataset.workMapTargetActive = targetId;
    if (burst) pulseMapEffect(activeHotspot);
    if (publish) publishAmbient(rootNode, "work-map");
  };

  const settleMapEffect = () => {
    const activeBranches = branches
      .filter(isExpanded)
      .sort((left, right) => depthOf(right) - depthOf(left));
    const activeBranch = activeBranches[0];
    if (activeBranch) {
      const nodeBelongsToOpenBranch = (node) => {
        const branch = node?.matches?.(".work-map-branch") ? node : node?.closest?.(".work-map-branch");
        return Boolean(branch && isExpanded(branch));
      };
      const focusedNode = map.contains(document.activeElement)
        ? document.activeElement.closest?.("[data-work-map-node]")
        : null;
      const pointerElement = lastPointerPosition
        ? document.elementFromPoint(lastPointerPosition.x, lastPointerPosition.y)
        : null;
      const pointerNode = map.contains(pointerElement)
        ? pointerElement.closest?.("[data-work-map-node]")
        : null;
      const candidates = lastInputWasPointer
        ? [pointerNode, focusedNode]
        : [focusedNode, pointerNode];
      const interactiveNode = candidates.find(nodeBelongsToOpenBranch);
      reactToNode(interactiveNode || activeBranch, { publish: false });
    }
    else {
      clearInkOrbitAnimation();
      map.dataset.workMapReactive = "false";
      delete map.dataset.workMapActive;
      delete map.dataset.workMapTargetActive;
      hotspots.forEach((hotspot) => {
        hotspot.dataset.active = "false";
      });
      updateFocusImage(null);
    }
  };

  const clearCloseTimer = (branch) => {
    const timer = closeTimers.get(branch);
    if (!timer) return;
    window.clearTimeout(timer);
    closeTimers.delete(branch);
  };

  const layoutOpenPanels = () => {
    layoutFrame = 0;
    const width = map.clientWidth;
    const mode = width >= 1100 ? "wide" : width > 720 ? "compact" : "mobile";
    map.dataset.workMapMode = mode;
    const navRect = nav.getBoundingClientRect();

    branches.forEach((branch) => {
      const panel = panelFor(branch);
      if (!panel) return;
      panel.removeAttribute("data-work-map-presentation");
      panel.style.removeProperty("left");
      panel.style.removeProperty("top");
      panel.style.removeProperty("width");
      panel.style.removeProperty("max-height");
      if (!isOpen(branch) || mode === "mobile") return;

      const trigger = triggerFor(branch);
      const triggerRect = trigger.getBoundingClientRect();
      const safeInset = 12;
      const gap = 12;
      const availableRight = navRect.right - triggerRect.right - gap - safeInset;
      const parentPanel = branch.parentElement?.closest("[data-work-map-panel]");
      const minimumPanelWidth = mode === "wide" ? 280 : 240;
      const desiredPanelWidth = mode === "wide" ? 380 : 330;
      const drillDown = depthOf(branch) > 0 && availableRight < minimumPanelWidth;
      const panelWidth = drillDown
        ? Math.min(parentPanel?.getBoundingClientRect().width || desiredPanelWidth, navRect.width - (2 * safeInset))
        : clamp(availableRight, minimumPanelWidth, desiredPanelWidth);

      panel.dataset.workMapPresentation = drillDown ? "drilldown" : "branch";
      panel.style.width = `${panelWidth}px`;
      panel.style.maxHeight = `${Math.max(220, navRect.height - (2 * safeInset))}px`;

      let panelLeft = triggerRect.right + gap;
      if (drillDown && parentPanel) panelLeft = parentPanel.getBoundingClientRect().left;
      panelLeft = clamp(panelLeft, navRect.left + safeInset, navRect.right - panelWidth - safeInset);
      const offsetParent = panel.offsetParent instanceof HTMLElement ? panel.offsetParent : nav;
      const offsetParentRect = offsetParent.getBoundingClientRect();
      const containingLeft = offsetParentRect.left + offsetParent.clientLeft;
      const containingTop = offsetParentRect.top + offsetParent.clientTop;
      panel.style.left = `${panelLeft - containingLeft}px`;
      panel.style.top = `${navRect.top + safeInset - containingTop}px`;

      const panelHeight = panel.getBoundingClientRect().height;
      const triggerCenter = triggerRect.top + (triggerRect.height / 2);
      const navCenter = navRect.top + (navRect.height / 2);
      let panelTop = triggerCenter <= navCenter
        ? triggerRect.top
        : triggerRect.bottom - panelHeight;
      if (drillDown && parentPanel) panelTop = parentPanel.getBoundingClientRect().top;
      panelTop = clamp(panelTop, navRect.top + safeInset, navRect.bottom - panelHeight - safeInset);
      panel.style.top = `${panelTop - containingTop}px`;
      panel.dataset.workMapDirection = triggerCenter <= navCenter ? "down" : "up";
    });
    settleMapEffect();
  };

  const scheduleLayout = () => {
    syncFocusImageSource();
    if (layoutFrame) return;
    layoutFrame = window.requestAnimationFrame(layoutOpenPanels);
  };

  const closeBranch = (branch, { animate = true, focus = false } = {}) => {
    clearCloseTimer(branch);
    const panel = panelFor(branch);
    const trigger = triggerFor(branch);
    branches
      .filter((candidate) => candidate !== branch && branch.contains(candidate) && isExpanded(candidate))
      .sort((left, right) => depthOf(right) - depthOf(left))
      .forEach((descendant) => closeBranch(descendant, { animate: false }));
    branch.dataset.open = "false";
    trigger?.setAttribute("aria-expanded", "false");
    if (panel) {
      clearPanelHideTimer(panel);
      panel.inert = true;
      if (!panel.hidden && animate) {
        const timer = window.setTimeout(() => {
          if (!isOpen(branch)) panel.hidden = true;
          panelHideTimers.delete(panel);
        }, workMapPanelTransitionMs);
        panelHideTimers.set(panel, timer);
      } else {
        panel.hidden = true;
      }
    }
    if (focus && trigger) {
      branch.dataset.suppressFocusOpen = "true";
      trigger.focus();
      delete branch.dataset.suppressFocusOpen;
    }
    scheduleLayout();
    window.requestAnimationFrame(settleMapEffect);
  };

  const openBranch = (branch, { animate = true, focusPanel = false, burst = false } = {}) => {
    clearCloseTimer(branch);
    const siblings = directBranches(branch.parentElement);
    siblings.filter((sibling) => sibling !== branch && isExpanded(sibling)).forEach((sibling) => closeBranch(sibling));
    const panel = panelFor(branch);
    const trigger = triggerFor(branch);
    clearPanelHideTimer(panel);
    const wasHidden = panel?.hidden;
    if (panel) {
      panel.hidden = false;
      panel.inert = false;
    }
    trigger?.setAttribute("aria-expanded", "true");
    branch.dataset.open = animate && wasHidden ? "false" : "true";
    scheduleLayout();
    window.requestAnimationFrame(() => {
      if (trigger?.getAttribute("aria-expanded") !== "true") return;
      branch.dataset.open = "true";
      reactToNode(branch, { publish: false });
      layoutOpenPanels();
      if (focusPanel) {
        const panelControl = panel?.matches('[data-work-map-presentation="drilldown"]')
          ? panel.querySelector(":scope > .work-map-panel-heading [data-work-map-back]")
          : panel?.querySelector(":scope > ul > .work-map-node > [data-work-map-link], :scope > ul > .work-map-node > [data-work-map-trigger]");
        panelControl?.focus();
      }
    });
    reactToNode(branch, { burst });
  };

  const closeAll = ({ animate = true } = {}) => {
    branches.filter(isExpanded).sort((left, right) => depthOf(right) - depthOf(left)).forEach((branch) => closeBranch(branch, { animate }));
  };

  const scheduleClose = (branch) => {
    clearCloseTimer(branch);
    const timer = window.setTimeout(() => {
      closeTimers.delete(branch);
      const keyboardFocusWithin = !lastInputWasPointer && branch.contains(document.activeElement);
      if (isExpanded(branch) && !keyboardFocusWithin && !pointerIsWithin(branch)) closeBranch(branch);
    }, workMapCloseDelayMs);
    closeTimers.set(branch, timer);
  };

  branches.forEach((branch) => {
    const trigger = triggerFor(branch);
    const back = panelFor(branch)?.querySelector(":scope > .work-map-panel-heading [data-work-map-back]");

    branch.addEventListener("pointerenter", (event) => {
      rememberPointerPosition(event);
      if (!pointerCanHover(event)) return;
      clearCloseTimer(branch);
      openBranch(branch);
    });

    branch.addEventListener("pointerleave", (event) => {
      rememberPointerPosition(event);
      if (pointerCanHover(event) && isExpanded(branch)) scheduleClose(branch);
    });

    branch.addEventListener("focusin", (event) => {
      if (branch.dataset.suppressFocusOpen === "true") return;
      if (lastInputWasPointer && lastPointerType !== "mouse") return;
      clearCloseTimer(branch);
      if (event.target === trigger) openBranch(branch);
    });

    branch.addEventListener("focusout", () => {
      window.requestAnimationFrame(() => {
        if (!branch.contains(document.activeElement) && isExpanded(branch)) scheduleClose(branch);
      });
    });

    trigger?.addEventListener("click", (event) => {
      const pointerHoverClick = event.detail > 0 && lastPointerType === "mouse"
        && (hoverAvailable.matches || anyHoverAvailable.matches);
      if (pointerHoverClick) openBranch(branch, { burst: true });
      else if (isExpanded(branch)) closeBranch(branch);
      else openBranch(branch, { burst: true });
    });

    trigger?.addEventListener("keydown", (event) => {
      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const siblings = directBranches(branch.parentElement);
      const siblingIndex = siblings.indexOf(branch);
      if (event.key === "ArrowRight") {
        openBranch(branch, { focusPanel: true, burst: true });
        return;
      }
      if (event.key === "ArrowLeft") {
        if (isExpanded(branch)) closeBranch(branch, { focus: true });
        else branch.parentElement?.closest(".work-map-branch")?.querySelector(":scope > [data-work-map-trigger]")?.focus();
        return;
      }
      const nextIndex = event.key === "Home"
        ? 0
        : event.key === "End"
          ? siblings.length - 1
          : (siblingIndex + (event.key === "ArrowUp" ? -1 : 1) + siblings.length) % siblings.length;
      triggerFor(siblings[nextIndex])?.focus();
    });

    back?.addEventListener("click", () => closeBranch(branch, { focus: true }));
  });

  map.querySelectorAll("[data-work-map-link]").forEach((link) => {
    const node = link.closest("[data-work-map-node]");
    link.addEventListener("pointerenter", (event) => {
      rememberPointerPosition(event);
      if (pointerCanHover(event)) reactToNode(node);
    });
    link.addEventListener("pointerdown", () => reactToNode(node, { burst: true }));
    link.addEventListener("focus", () => reactToNode(node));
    link.addEventListener("pointerleave", () => window.requestAnimationFrame(settleMapEffect));
    link.addEventListener("blur", () => window.requestAnimationFrame(settleMapEffect));
  });

  map.addEventListener("work-map:close", () => closeAll());
  if (typeof window.ResizeObserver === "function") {
    const resizeObserver = new window.ResizeObserver(scheduleLayout);
    resizeObserver.observe(map);
    branches.map(panelFor).filter(Boolean).forEach((panel) => resizeObserver.observe(panel));
  } else {
    window.addEventListener("resize", scheduleLayout);
  }
  mediaImage?.addEventListener("load", scheduleLayout);
  document.fonts?.ready.then(scheduleLayout);
  window.addEventListener("orientationchange", scheduleLayout);
  scheduleLayout();
  closeAll({ animate: false });
  map.dataset.workMapReactive = "false";
  map.dataset.workMapBurst = "false";
};

workMaps.forEach(initializeWorkMap);

document.addEventListener("pointermove", rememberPointerPosition, { passive: true });
document.addEventListener("pointerdown", (event) => {
  rememberPointerPosition(event);
  lastInputWasPointer = true;
  lastPointerType = event.pointerType;
  if (event.pointerType !== "mouse") suppressHoverUntil = window.performance.now() + syntheticHoverSuppressionMs;
  if (!event.target.closest("[data-work-map-node]")) workMaps.forEach((map) => map.dispatchEvent(new CustomEvent("work-map:close")));
}, true);

document.addEventListener("keydown", (event) => {
  lastInputWasPointer = false;
  lastPointerType = "";
  suppressHoverUntil = Math.max(suppressHoverUntil, window.performance.now() + keyboardHoverSuppressionMs);
  if (event.key !== "Escape") return;
  const openBranches = [...document.querySelectorAll('.work-map-trigger[aria-expanded="true"]')]
    .map((trigger) => trigger.closest(".work-map-branch"))
    .filter(Boolean)
    .sort((left, right) => Number(right.dataset.workMapDepth || 0) - Number(left.dataset.workMapDepth || 0));
  const branch = openBranches[0];
  if (!branch) return;
  event.preventDefault();
  const trigger = branch.querySelector(":scope > [data-work-map-trigger]");
  trigger?.focus();
  trigger?.click();
});

hoverAvailable.addEventListener?.("change", () => workMaps.forEach((map) => map.dispatchEvent(new CustomEvent("work-map:close"))));
anyHoverAvailable.addEventListener?.("change", () => workMaps.forEach((map) => map.dispatchEvent(new CustomEvent("work-map:close"))));

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
