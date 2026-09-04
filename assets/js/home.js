const catalog = document.querySelector("[data-project-catalog]");
const deck = document.querySelector("[data-project-deck]");
const cards = [...document.querySelectorAll("[data-project-card]")];
const dots = [...document.querySelectorAll("[data-deck-dot]")];
const orbit = document.querySelector("[data-project-orbit]");
const previousButton = document.querySelector("[data-deck-previous]");
const nextButton = document.querySelector("[data-deck-next]");
const previousEdgeButton = document.querySelector("[data-deck-edge-previous]");
const nextEdgeButton = document.querySelector("[data-deck-edge-next]");
const edgeButtons = [previousEdgeButton, nextEdgeButton].filter(Boolean);
const energyCanvases = [...document.querySelectorAll("[data-deck-energy-canvas]")];
const swipeHint = document.querySelector("[data-deck-swipe-hint]");
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
let orbitRotation = 0;
let pointerStart = null;
let suppressNextClick = false;
let suppressClickTimer = 0;
let swipeIntroTimer = 0;
let swipeIntroFrame = 0;
let swipeIntroRevealFrame = 0;
let swipeIntroHasRun = false;
let swipeIntroGateObserver = null;
let energyNavigation = null;

const coarsePointerMedia = matchMedia("(hover: none), (pointer: coarse)");
const reducedMotionMedia = matchMedia("(prefers-reduced-motion: reduce)");

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

const parseEnergyColor = (value) => {
  const channels = String(value ?? "").match(/\d+(?:\.\d+)?/g)?.slice(0, 3).map(Number);
  if (!channels || channels.length !== 3 || channels.some((channel) => !Number.isFinite(channel))) {
    return [92, 214, 183];
  }
  return channels.map((channel) => Math.max(0, Math.min(255, channel)));
};

class DeckEnergyField {
  constructor(canvas, direction) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d", { alpha: true });
    this.direction = direction === "previous" ? -1 : 1;
    this.color = [92, 214, 183];
    this.width = 0;
    this.height = 0;
    this.particles = [];
    this.frameHandle = 0;
    this.lastFrame = 0;
    this.tick = this.tick.bind(this);
    this.resizeObserver = this.context && "ResizeObserver" in window
      ? new ResizeObserver(() => this.resize())
      : null;
    this.resizeObserver?.observe(canvas);
    this.resize();
  }

  setColor(value) {
    this.color = parseEnergyColor(value);
  }

  particleCount() {
    return coarsePointerMedia.matches ? 30 : 68;
  }

  resetParticle(particle = {}, initial = false) {
    const width = Math.max(this.width, 72);
    const height = Math.max(this.height, 240);
    particle.x = width * (.2 + Math.random() * .6);
    particle.y = initial ? Math.random() * height : height + Math.random() * 36;
    particle.previousX = particle.x;
    particle.previousY = particle.y;
    particle.velocityX = (Math.random() - .5) * 8;
    particle.velocityY = -(18 + Math.random() * 34);
    particle.size = .45 + Math.random() * 1.65;
    particle.alpha = .16 + Math.random() * .46;
    particle.phase = Math.random() * Math.PI * 2;
    particle.orbit = (Math.random() > .5 ? 1 : -1) * (.35 + Math.random() * .65);
    particle.spark = Math.random() > .92;
    particle.silver = Math.random() > .8;
    return particle;
  }

  resize() {
    if (!this.context) return;
    const bounds = this.canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(bounds.width));
    const height = Math.max(1, Math.round(bounds.height));
    if (Math.abs(width - this.width) < 1 && Math.abs(height - this.height) < 1) return;

    this.width = width;
    this.height = height;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.75);
    this.canvas.width = Math.max(1, Math.round(width * pixelRatio));
    this.canvas.height = Math.max(1, Math.round(height * pixelRatio));
    this.context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    this.particles = Array.from({ length: this.particleCount() }, () => this.resetParticle({}, true));
  }

  drawFilaments(elapsed) {
    const context = this.context;
    const [red, green, blue] = this.color;
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    context.save();
    context.globalCompositeOperation = "lighter";
    context.lineCap = "round";
    for (let index = 0; index < 3; index += 1) {
      const phase = elapsed * (.00022 + index * .000025) + index * 2.1;
      const spread = this.width * (.08 + index * .035);
      const lowerWave = Math.sin(phase * 1.7) * spread;
      const coreWave = Math.cos(phase * 2.3) * spread * .32;
      const upperWave = Math.sin(phase * 1.35 + 1.8) * spread;
      context.beginPath();
      context.moveTo(centerX + lowerWave, this.height + 12);
      context.bezierCurveTo(
        centerX - lowerWave * .45 + this.direction * spread * .25,
        centerY + this.height * .28,
        centerX + coreWave - this.direction * spread * .18,
        centerY + this.height * .07,
        centerX + coreWave,
        centerY,
      );
      context.bezierCurveTo(
        centerX - coreWave + this.direction * spread * .2,
        centerY - this.height * .08,
        centerX + upperWave * .5,
        this.height * .18,
        centerX + upperWave,
        -12,
      );
      context.strokeStyle = `rgba(${red}, ${green}, ${blue}, ${.045 + index * .015})`;
      context.lineWidth = .7 + index * .45;
      context.shadowColor = `rgba(${red}, ${green}, ${blue}, .22)`;
      context.shadowBlur = 8 + index * 4;
      context.stroke();
    }
    context.restore();
  }

  drawParticle(particle, elapsed, delta) {
    const context = this.context;
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    const attractionRadius = Math.max(76, this.width * .92);

    particle.previousX = particle.x;
    particle.previousY = particle.y;
    particle.y += particle.velocityY * delta;
    particle.x += particle.velocityX * delta;
    particle.x += Math.sin(particle.phase + particle.y * .025 + elapsed * .00042) * 7 * delta;

    const differenceX = centerX - particle.x;
    const differenceY = centerY - particle.y;
    const distance = Math.hypot(differenceX, differenceY) || 1;
    const influence = Math.max(0, 1 - distance / attractionRadius);
    if (influence > 0) {
      particle.x += differenceX * influence * .52 * delta;
      particle.y += differenceY * influence * .08 * delta;
      particle.x += (-differenceY / distance) * particle.orbit * influence * 23 * delta;
      particle.y += (differenceX / distance) * particle.orbit * influence * 7 * delta;
    }

    if (particle.y < -18 || particle.x < -24 || particle.x > this.width + 24) {
      this.resetParticle(particle, false);
      return;
    }

    const color = particle.silver ? [238, 249, 247] : this.color;
    const coreBoost = 1 + influence * .72;
    const alpha = particle.alpha * coreBoost;
    context.beginPath();
    context.moveTo(particle.previousX, particle.previousY);
    context.lineTo(particle.x, particle.y);
    context.strokeStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha * .34})`;
    context.lineWidth = Math.max(.35, particle.size * .52);
    context.stroke();

    context.beginPath();
    context.arc(particle.x, particle.y, particle.spark ? particle.size * 1.65 : particle.size, 0, Math.PI * 2);
    context.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
    context.shadowColor = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${Math.min(.75, alpha)})`;
    context.shadowBlur = particle.spark ? 10 : 4 + influence * 5;
    context.fill();
  }

  tick(timestamp) {
    if (!this.frameHandle || !this.context) return;
    const delta = Math.min(40, Math.max(8, timestamp - this.lastFrame)) / 1000;
    this.lastFrame = timestamp;
    this.context.clearRect(0, 0, this.width, this.height);
    this.context.save();
    this.context.globalCompositeOperation = "lighter";
    this.drawFilaments(timestamp);
    this.particles.forEach((particle) => this.drawParticle(particle, timestamp, delta));
    this.context.restore();
    this.frameHandle = requestAnimationFrame(this.tick);
  }

  setRunning(running) {
    const nextState = Boolean(running && this.context);
    this.canvas.dataset.energyRunning = String(nextState);
    if (nextState && !this.frameHandle) {
      this.resize();
      this.lastFrame = performance.now();
      this.frameHandle = requestAnimationFrame(this.tick);
    } else if (!nextState && this.frameHandle) {
      cancelAnimationFrame(this.frameHandle);
      this.frameHandle = 0;
    }
  }

  destroy() {
    this.setRunning(false);
    this.resizeObserver?.disconnect();
  }
}

const createEnergyNavigation = () => {
  if (!deck || !energyCanvases.length) return null;
  const fields = energyCanvases
    .map((canvas) => new DeckEnergyField(canvas, canvas.closest("[data-energy-direction]")?.dataset.energyDirection))
    .filter((field) => field.context);
  let inView = true;
  let updateFrame = 0;

  const motionIsReduced = () => (
    reducedMotionMedia.matches || document.documentElement.dataset.motion === "reduced"
  );
  const shouldRun = () => {
    if (!inView || document.hidden || motionIsReduced()) return false;
    const keyboardReveal = deck.matches(":focus-visible") || edgeButtons.some((button) => button.matches(":focus-visible"));
    if (coarsePointerMedia.matches) return deck.dataset.swipeIntro === "visible" || keyboardReveal;
    return deck.matches(":hover") || keyboardReveal;
  };
  const update = () => {
    updateFrame = 0;
    const running = shouldRun();
    deck.dataset.energyMotion = running ? "running" : "paused";
    fields.forEach((field) => field.setRunning(running));
  };
  const scheduleUpdate = () => {
    if (!updateFrame) updateFrame = requestAnimationFrame(update);
  };

  const visibilityObserver = "IntersectionObserver" in window
    ? new IntersectionObserver(([entry]) => {
      inView = Boolean(entry?.isIntersecting);
      scheduleUpdate();
    }, { rootMargin: "80px", threshold: .01 })
    : null;
  visibilityObserver?.observe(deck);

  const preferenceObserver = new MutationObserver(scheduleUpdate);
  preferenceObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-motion"] });
  deck.addEventListener("pointerenter", scheduleUpdate);
  deck.addEventListener("pointerleave", scheduleUpdate);
  deck.addEventListener("focusin", scheduleUpdate);
  deck.addEventListener("focusout", scheduleUpdate);
  document.addEventListener("visibilitychange", scheduleUpdate);
  coarsePointerMedia.addEventListener("change", scheduleUpdate);
  reducedMotionMedia.addEventListener("change", scheduleUpdate);

  let destroyed = false;
  const controller = {
    setColor(value) {
      fields.forEach((field) => field.setColor(value));
    },
    refresh: scheduleUpdate,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      if (updateFrame) cancelAnimationFrame(updateFrame);
      visibilityObserver?.disconnect();
      preferenceObserver.disconnect();
      deck.removeEventListener("pointerenter", scheduleUpdate);
      deck.removeEventListener("pointerleave", scheduleUpdate);
      deck.removeEventListener("focusin", scheduleUpdate);
      deck.removeEventListener("focusout", scheduleUpdate);
      document.removeEventListener("visibilitychange", scheduleUpdate);
      coarsePointerMedia.removeEventListener("change", scheduleUpdate);
      reducedMotionMedia.removeEventListener("change", scheduleUpdate);
      removeEventListener("pagehide", handlePageHide);
      removeEventListener("pageshow", handlePageShow);
      fields.forEach((field) => field.destroy());
    },
  };
  const handlePageHide = (event) => {
    fields.forEach((field) => field.setRunning(false));
    deck.dataset.energyMotion = "paused";
    if (!event.persisted) controller.destroy();
  };
  const handlePageShow = () => scheduleUpdate();
  update();
  addEventListener("pagehide", handlePageHide);
  addEventListener("pageshow", handlePageShow);
  return controller;
};

const setSwipeIntro = (state) => {
  if (!deck) return;
  deck.dataset.swipeIntro = state;
  energyNavigation?.refresh();
};

const cancelSwipeIntroSchedule = () => {
  clearTimeout(swipeIntroTimer);
  cancelAnimationFrame(swipeIntroFrame);
  cancelAnimationFrame(swipeIntroRevealFrame);
  swipeIntroTimer = 0;
  swipeIntroFrame = 0;
  swipeIntroRevealFrame = 0;
};

const dismissSwipeIntro = () => {
  cancelSwipeIntroSchedule();
  if (!deck || deck.dataset.swipeIntro === "hidden") return;
  setSwipeIntro("hidden");
};

const startSwipeIntro = () => {
  if (!deck || !swipeHint || cards.length < 2 || !coarsePointerMedia.matches || swipeIntroHasRun) {
    if (!coarsePointerMedia.matches) setSwipeIntro("hidden");
    return;
  }
  const cookieBanner = document.querySelector("[data-cookie-banner]");
  if (cookieBanner && !cookieBanner.hidden) {
    setSwipeIntro("idle");
    if (!swipeIntroGateObserver) {
      swipeIntroGateObserver = new MutationObserver(() => {
        if (!cookieBanner.hidden) return;
        swipeIntroGateObserver?.disconnect();
        swipeIntroGateObserver = null;
        startSwipeIntro();
      });
      swipeIntroGateObserver.observe(cookieBanner, { attributes: true, attributeFilter: ["hidden"] });
    }
    return;
  }
  swipeIntroHasRun = true;
  setSwipeIntro("idle");
  swipeIntroFrame = requestAnimationFrame(() => {
    swipeIntroFrame = 0;
    swipeIntroRevealFrame = requestAnimationFrame(() => {
      swipeIntroRevealFrame = 0;
      if (!coarsePointerMedia.matches || deck.dataset.swipeIntro !== "idle") return;
      setSwipeIntro("visible");
      swipeIntroTimer = setTimeout(dismissSwipeIntro, 4600);
    });
  });
};

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

  // Accumulate the shortest angular delta, including the last/first boundary.
  const indexDelta = ((requestedIndex - activeIndex + cards.length * 1.5) % cards.length) - cards.length / 2;
  orbitRotation -= indexDelta * 360 / cards.length;
  orbit?.style.setProperty("--orbit-rotation", `${orbitRotation}deg`);
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
  if (deck) deck.dataset.energyProject = activeCard.dataset.project;
  energyNavigation?.setColor(activeCard.style.getPropertyValue("--project-accent-rgb"));
  window.dispatchEvent(new CustomEvent("portal:ambientchange", {
    detail: {
      id: activeCard.dataset.project,
      accentRgb: activeCard.style.getPropertyValue("--project-accent-rgb").trim(),
      index: activeIndex,
      source: "project",
      element: catalog,
      interactive: announce,
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

const armClickSuppression = () => {
  suppressNextClick = true;
  clearTimeout(suppressClickTimer);
  suppressClickTimer = setTimeout(() => {
    suppressNextClick = false;
  }, 120);
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

energyNavigation = createEnergyNavigation();
energyNavigation?.setColor(cards[activeIndex]?.style.getPropertyValue("--project-accent-rgb"));
startSwipeIntro();
addEventListener("pagehide", () => {
  swipeIntroHasRun = true;
  swipeIntroGateObserver?.disconnect();
  swipeIntroGateObserver = null;
  cancelSwipeIntroSchedule();
  if (deck) deck.dataset.swipeIntro = "hidden";
});
coarsePointerMedia.addEventListener("change", () => {
  if (coarsePointerMedia.matches) startSwipeIntro();
  else dismissSwipeIntro();
});

previousButton?.addEventListener("click", () => {
  dismissSwipeIntro();
  selectOffset(-1);
});
nextButton?.addEventListener("click", () => {
  dismissSwipeIntro();
  selectOffset(1);
});
const handleEdgeClick = (event, offset) => {
  if (suppressNextClick) {
    suppressNextClick = false;
    clearTimeout(suppressClickTimer);
    event.preventDefault();
    event.stopPropagation();
    return;
  }
  dismissSwipeIntro();
  selectOffset(offset);
};
previousEdgeButton?.addEventListener("click", (event) => handleEdgeClick(event, -1));
nextEdgeButton?.addEventListener("click", (event) => handleEdgeClick(event, 1));

dots.forEach((dot, index) => {
  dot.addEventListener("click", () => {
    dismissSwipeIntro();
    const slug = cards[index]?.dataset.project;
    if (slug) applyActiveProject(slug, { announce: true, writeUrl: true });
  });
  dot.addEventListener("keydown", (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? dots.length - 1
      : (index + (["ArrowLeft", "ArrowUp"].includes(event.key) ? -1 : 1) + dots.length) % dots.length;
    dismissSwipeIntro();
    const slug = cards[nextIndex]?.dataset.project;
    if (slug) applyActiveProject(slug, { announce: true, writeUrl: true });
    dots[nextIndex]?.focus({ preventScroll: true });
  });
});

deck?.addEventListener("click", (event) => {
  if (suppressNextClick) {
    suppressNextClick = false;
    clearTimeout(suppressClickTimer);
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
  const edgeControl = event.target instanceof Element
    ? event.target.closest("[data-deck-edge-previous], [data-deck-edge-next]")
    : null;
  const touchEdgeGesture = Boolean(edgeControl && event.pointerType !== "mouse");
  if (!event.isPrimary || event.button !== 0 || (isInteractiveTarget(event.target) && !touchEdgeGesture)) {
    pointerStart = null;
    return;
  }
  if (event.pointerType !== "mouse") dismissSwipeIntro();
  pointerStart = {
    x: event.clientX,
    y: event.clientY,
    pointerId: event.pointerId,
    edgeControl: touchEdgeGesture,
    edgeOffset: edgeControl === previousEdgeButton ? -1 : edgeControl === nextEdgeButton ? 1 : 0,
  };
  if (event.isTrusted) deck.setPointerCapture?.(event.pointerId);
});

const finishPointer = (event, allowSelection) => {
  if (!pointerStart || pointerStart.pointerId !== event.pointerId) return;
  const deltaX = event.clientX - pointerStart.x;
  const deltaY = event.clientY - pointerStart.y;
  const horizontalGesture = Math.abs(deltaX) > 56 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2;
  const movedGesture = Math.hypot(deltaX, deltaY) > 14;
  if (allowSelection && horizontalGesture) {
    armClickSuppression();
    event.preventDefault();
    selectOffset(deltaX < 0 ? 1 : -1);
  } else if (allowSelection && pointerStart.edgeControl && !movedGesture && pointerStart.edgeOffset) {
    armClickSuppression();
    event.preventDefault();
    selectOffset(pointerStart.edgeOffset);
  } else if (pointerStart.edgeControl && movedGesture) {
    armClickSuppression();
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
