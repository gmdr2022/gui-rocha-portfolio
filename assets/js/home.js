const deck = document.querySelector("[data-project-deck]");
const dots = document.querySelector("[data-deck-dots]");
const counter = document.querySelector("[data-deck-counter]");
const stage = document.querySelector("[data-home-stage]");
const previousButton = document.querySelector("[data-deck-previous]");
const nextButton = document.querySelector("[data-deck-next]");

let projects = [];
let activeIndex = 0;

const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", "\"": "&quot;",
}[character]));

const cardTemplate = (project, index) => `
  <article class="project-card" data-project-card data-image-kind="${project.imageKind}" data-index="${index}" style="--project-accent:${project.accent};--project-accent-rgb:${project.accentRgb}" aria-hidden="${index === 0 ? "false" : "true"}">
    <div class="project-card-media is-${project.imageKind}">
      <img src="${project.image}" alt="${escapeHtml(project.imageAlt)}" ${index === 0 ? 'fetchpriority="high"' : 'loading="lazy"'} width="1920" height="1080">
      <div class="project-card-scrim" aria-hidden="true"></div>
    </div>
    <div class="project-card-copy">
      <div class="project-card-topline"><span>${project.code}</span><p>${escapeHtml(project.kicker)}</p></div>
      <div class="project-card-body">
        <span class="status-pill" data-tone="${project.statusTone}">${escapeHtml(project.status)}</span>
        <h2>${escapeHtml(project.name)}</h2>
        <p>${escapeHtml(project.summary)}</p>
      </div>
      <div class="project-card-footer">
        <ul aria-label="Características">${project.facts.map((fact) => `<li>${escapeHtml(fact)}</li>`).join("")}</ul>
        <a class="round-link" href="${project.route}" aria-label="Conhecer ${escapeHtml(project.name)}"><span>Conhecer</span><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 12h13M13 6l6 6-6 6"></path></svg></a>
      </div>
    </div>
  </article>`;

const updateDeck = (requestedIndex, announce = false) => {
  if (!projects.length) return;
  activeIndex = (requestedIndex + projects.length) % projects.length;
  deck.querySelectorAll("[data-project-card]").forEach((card, index) => {
    const offset = index - activeIndex;
    const wrappedOffset = offset > projects.length / 2 ? offset - projects.length : offset < -projects.length / 2 ? offset + projects.length : offset;
    card.style.setProperty("--card-offset", wrappedOffset);
    card.dataset.position = wrappedOffset === 0 ? "active" : wrappedOffset === 1 ? "next" : wrappedOffset === -1 ? "previous" : "hidden";
    card.setAttribute("aria-hidden", String(wrappedOffset !== 0));
    card.querySelectorAll("a,button").forEach((element) => element.tabIndex = wrappedOffset === 0 ? 0 : -1);
  });
  dots.querySelectorAll("button").forEach((dot, index) => {
    dot.setAttribute("aria-pressed", String(index === activeIndex));
  });
  counter.textContent = `${String(activeIndex + 1).padStart(2, "0")} / ${String(projects.length).padStart(2, "0")}`;
  stage.style.setProperty("--active-accent", projects[activeIndex].accent);
  stage.style.setProperty("--active-accent-rgb", projects[activeIndex].accentRgb);
  if (announce) {
    const live = document.querySelector("[data-deck-live]");
    live.textContent = `${projects[activeIndex].name}: ${projects[activeIndex].status}`;
    history.replaceState(null, "", activeIndex === 0 ? "/" : `/?projeto=${projects[activeIndex].slug}`);
  }
};

const initialize = async () => {
  try {
    const response = await fetch("/assets/data/projects.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    projects = (await response.json()).sort((a, b) => a.order - b.order);
    deck.innerHTML = projects.map(cardTemplate).join("");
    dots.innerHTML = projects.map((project, index) => `<button type="button" aria-label="Mostrar ${escapeHtml(project.name)}" data-deck-dot="${index}" aria-pressed="${index === 0}"></button>`).join("");
    const requestedSlug = new URLSearchParams(location.search).get("projeto");
    const requestedIndex = projects.findIndex((project) => project.slug === requestedSlug);
    updateDeck(requestedIndex >= 0 ? requestedIndex : 0);
    deck.dataset.ready = "true";
  } catch {
    deck.innerHTML = `<div class="deck-error"><strong>O catálogo não carregou.</strong><p>Use o mapa de produtos para continuar.</p><a class="button primary" href="/projetos/clubal/">Abrir ClubAL</a></div>`;
  }
};

previousButton?.addEventListener("click", () => updateDeck(activeIndex - 1, true));
nextButton?.addEventListener("click", () => updateDeck(activeIndex + 1, true));
dots?.addEventListener("click", (event) => {
  const dot = event.target.closest("[data-deck-dot]");
  if (dot) updateDeck(Number(dot.dataset.deckDot), true);
});
deck?.addEventListener("click", (event) => {
  const card = event.target.closest("[data-project-card]");
  if (!card || card.dataset.position === "active") return;
  event.preventDefault();
  updateDeck(Number(card.dataset.index), true);
});

document.addEventListener("keydown", (event) => {
  if (event.target.closest("input,textarea,dialog")) return;
  if (event.key === "ArrowRight") updateDeck(activeIndex + 1, true);
  if (event.key === "ArrowLeft") updateDeck(activeIndex - 1, true);
});

let pointerStart = null;
deck?.addEventListener("pointerdown", (event) => { pointerStart = event.clientX; });
deck?.addEventListener("pointerup", (event) => {
  if (pointerStart === null) return;
  const delta = event.clientX - pointerStart;
  if (Math.abs(delta) > 60) updateDeck(activeIndex + (delta < 0 ? 1 : -1), true);
  pointerStart = null;
});

initialize();
