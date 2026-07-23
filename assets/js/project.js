const shell = document.querySelector("[data-project-shell]");
const slug = document.body.dataset.project;
let galleryItems = [];
let activeGalleryIndex = 0;

const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", "\"": "&quot;",
}[character]));

const renderTab = (tab) => `
  <div class="project-tab-panel" id="panel-${tab.id}" role="tabpanel" aria-labelledby="tab-${tab.id}">
    <span class="project-panel-index">${escapeHtml(tab.label)}</span>
    <h2>${escapeHtml(tab.title)}</h2>
    <p>${escapeHtml(tab.body)}</p>
    <ul>${tab.points.map((point) => `<li><span aria-hidden="true"></span>${escapeHtml(point)}</li>`).join("")}</ul>
  </div>`;

const activateTab = (id, announce = false) => {
  document.querySelectorAll("[data-project-tab]").forEach((button) => {
    const selected = button.dataset.projectTab === id;
    button.setAttribute("aria-selected", String(selected));
    button.tabIndex = selected ? 0 : -1;
  });
  document.querySelectorAll(".project-tab-panel").forEach((panel) => {
    panel.hidden = panel.id !== `panel-${id}`;
  });
  if (announce) history.replaceState(null, "", `#${id}`);
};

const showGalleryItem = (requestedIndex, announce = false) => {
  if (!galleryItems.length) return;
  activeGalleryIndex = (requestedIndex + galleryItems.length) % galleryItems.length;
  const item = galleryItems[activeGalleryIndex];
  const image = document.querySelector("[data-project-image]");
  const visual = image.closest(".project-visual");
  image.src = item.src;
  image.alt = item.alt;
  visual.dataset.kind = item.kind;
  visual.style.setProperty("--visual-image", `url("${item.src}")`);
  document.querySelector("[data-visual-label]").textContent = item.label;
  document.querySelector("[data-gallery-counter]").textContent = galleryItems.length > 1
    ? `${String(activeGalleryIndex + 1).padStart(2, "0")} / ${String(galleryItems.length).padStart(2, "0")}`
    : "";
  document.querySelectorAll("[data-gallery-dot]").forEach((dot, index) => {
    dot.setAttribute("aria-pressed", String(index === activeGalleryIndex));
  });
  if (announce) {
    document.querySelector("[data-gallery-live]").textContent = `${item.label}. Imagem ${activeGalleryIndex + 1} de ${galleryItems.length}.`;
  }
};

const setupGallery = (project) => {
  galleryItems = project.gallery?.length
    ? project.gallery.map((item) => ({ ...item, kind: item.kind || project.imageKind }))
    : [{ src: project.image, alt: project.imageAlt, label: project.visualLabel, kind: project.imageKind }];
  activeGalleryIndex = 0;
  const controls = document.querySelector("[data-gallery-controls]");
  controls.hidden = galleryItems.length < 2;
  controls.innerHTML = galleryItems.length < 2 ? "" : `
    <button type="button" class="gallery-arrow" data-gallery-previous aria-label="Imagem conceito anterior">
      <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"></path></svg>
    </button>
    <div class="gallery-dots" aria-label="Selecionar imagem conceito">
      ${galleryItems.map((item, index) => `<button type="button" data-gallery-dot="${index}" aria-label="Mostrar ${escapeHtml(item.label)}" aria-pressed="${index === 0}"></button>`).join("")}
    </div>
    <button type="button" class="gallery-arrow" data-gallery-next aria-label="Próxima imagem conceito">
      <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"></path></svg>
    </button>`;
  showGalleryItem(0);
};

const render = async () => {
  try {
    const response = await fetch("/assets/data/projects.json", { cache: "no-store" });
    const projects = await response.json();
    const project = projects.find((item) => item.slug === slug);
    if (!project) throw new Error("Projeto não encontrado");
    const ordered = [...projects].sort((a, b) => a.order - b.order);
    const currentIndex = ordered.findIndex((item) => item.slug === slug);
    const next = ordered[(currentIndex + 1) % ordered.length];

    shell.style.setProperty("--project-accent", project.accent);
    shell.style.setProperty("--project-accent-rgb", project.accentRgb);
    document.querySelector("[data-project-code]").textContent = project.code;
    document.querySelector("[data-project-kicker]").textContent = project.kicker;
    document.querySelector("[data-project-status]").textContent = project.status;
    document.querySelector("[data-project-status]").dataset.tone = project.statusTone;
    document.querySelector("[data-project-title]").textContent = project.name;
    document.querySelector("[data-project-promise]").textContent = project.promise;
    document.querySelector("[data-project-summary]").textContent = project.summary;
    document.querySelector("[data-project-image]").closest(".project-visual").dataset.kind = project.imageKind;
    setupGallery(project);
    document.querySelector("[data-project-facts]").innerHTML = project.facts.map((fact) => `<li>${escapeHtml(fact)}</li>`).join("");
    document.querySelector("[data-project-tabs]").innerHTML = project.tabs.map((tab, index) => `<button type="button" role="tab" id="tab-${tab.id}" data-project-tab="${tab.id}" aria-controls="panel-${tab.id}" aria-selected="${index === 0}" tabindex="${index === 0 ? 0 : -1}">${escapeHtml(tab.label)}</button>`).join("");
    document.querySelector("[data-project-panels]").innerHTML = project.tabs.map(renderTab).join("");
    document.querySelector("[data-project-links]").innerHTML = project.links.map((link) => `<a class="button ${link.kind === "primary" ? "primary" : "ghost"}" href="${link.href}" ${link.href.startsWith("http") ? 'target="_blank" rel="noopener noreferrer"' : ""}>${escapeHtml(link.label)}${link.href.startsWith("http") ? '<span class="external-mark" aria-hidden="true">↗</span>' : ""}</a>`).join("");
    const nextLink = document.querySelector("[data-next-project]");
    nextLink.href = next.route;
    nextLink.querySelector("strong").textContent = next.name;
    nextLink.style.setProperty("--next-accent", next.accent);

    const requestedTab = location.hash.slice(1);
    activateTab(project.tabs.some((tab) => tab.id === requestedTab) ? requestedTab : project.tabs[0].id);
    shell.dataset.ready = "true";
  } catch (error) {
    document.querySelector("[data-project-summary]").textContent = "Não foi possível carregar os detalhes agora. Volte ao catálogo principal para continuar.";
  }
};

document.querySelector("[data-project-tabs]")?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-project-tab]");
  if (button) activateTab(button.dataset.projectTab, true);
});

document.querySelector("[data-project-tabs]")?.addEventListener("keydown", (event) => {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  const buttons = [...document.querySelectorAll("[data-project-tab]")];
  const current = buttons.indexOf(document.activeElement);
  let next = current;
  if (event.key === "ArrowRight") next = (current + 1) % buttons.length;
  if (event.key === "ArrowLeft") next = (current - 1 + buttons.length) % buttons.length;
  if (event.key === "Home") next = 0;
  if (event.key === "End") next = buttons.length - 1;
  event.preventDefault();
  buttons[next].focus();
  activateTab(buttons[next].dataset.projectTab, true);
});

document.querySelector("[data-project-shell]")?.addEventListener("click", (event) => {
  if (event.target.closest("[data-gallery-previous]")) showGalleryItem(activeGalleryIndex - 1, true);
  if (event.target.closest("[data-gallery-next]")) showGalleryItem(activeGalleryIndex + 1, true);
  const dot = event.target.closest("[data-gallery-dot]");
  if (dot) showGalleryItem(Number(dot.dataset.galleryDot), true);
});

render();
