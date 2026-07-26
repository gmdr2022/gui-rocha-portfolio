const tablist = document.querySelector(".project-tabs");
const tabButtons = [...document.querySelectorAll("[data-project-tab]")];
const panels = [...document.querySelectorAll(".project-tab-panel")];
const galleryTemplate = document.querySelector("[data-gallery-data]");
const galleryItems = galleryTemplate ? JSON.parse(galleryTemplate.content.textContent) : [];
const galleryImage = document.querySelector("[data-project-image]");
const galleryLabel = document.querySelector("[data-visual-label]");
const galleryCurrent = document.querySelector("[data-gallery-current]");
const galleryLive = document.querySelector("[data-gallery-live]");
let activeGalleryIndex = 0;

const activateTab = (id, focus = false) => {
  tabButtons.forEach((button) => {
    const selected = button.dataset.projectTab === id;
    button.setAttribute("aria-selected", String(selected));
    button.tabIndex = selected ? 0 : -1;
    if (selected && focus) button.focus();
  });
  panels.forEach((panel) => {
    panel.hidden = panel.id !== `panel-${id}`;
  });
  history.replaceState(null, "", `#${id}`);
};

tablist?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-project-tab]");
  if (button) activateTab(button.dataset.projectTab);
});

tablist?.addEventListener("keydown", (event) => {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  const current = tabButtons.indexOf(document.activeElement);
  let target = current;
  if (event.key === "ArrowRight") target = (current + 1) % tabButtons.length;
  if (event.key === "ArrowLeft") target = (current - 1 + tabButtons.length) % tabButtons.length;
  if (event.key === "Home") target = 0;
  if (event.key === "End") target = tabButtons.length - 1;
  event.preventDefault();
  activateTab(tabButtons[target].dataset.projectTab, true);
});

const requestedTab = decodeURIComponent(location.hash.slice(1));
if (requestedTab && tabButtons.some((button) => button.dataset.projectTab === requestedTab)) {
  activateTab(requestedTab);
}

const showGalleryItem = (requestedIndex, announce = false) => {
  if (!galleryItems.length || !galleryImage) return;
  activeGalleryIndex = (requestedIndex + galleryItems.length) % galleryItems.length;
  const item = galleryItems[activeGalleryIndex];
  galleryImage.src = item.src;
  galleryImage.alt = item.alt;
  galleryLabel.textContent = item.label;
  if (galleryCurrent) galleryCurrent.textContent = String(activeGalleryIndex + 1);
  if (announce && galleryLive) galleryLive.textContent = `${item.label}. ${activeGalleryIndex + 1} / ${galleryItems.length}.`;
};

document.querySelector("[data-gallery-previous]")?.addEventListener("click", () => showGalleryItem(activeGalleryIndex - 1, true));
document.querySelector("[data-gallery-next]")?.addEventListener("click", () => showGalleryItem(activeGalleryIndex + 1, true));
