const tablist = document.querySelector(".project-tabs");
const tabButtons = [...document.querySelectorAll("[data-project-tab]")];
const panels = [...document.querySelectorAll(".project-tab-panel")];
const galleryTemplate = document.querySelector("[data-gallery-data]");
const galleryItems = galleryTemplate ? JSON.parse(galleryTemplate.content.textContent) : [];
const galleryImage = document.querySelector("[data-project-image]");
const galleryLabel = document.querySelector("[data-visual-label]");
const galleryCurrent = document.querySelector("[data-gallery-current]");
const galleryLive = document.querySelector("[data-gallery-live]");
const galleryRoot = document.querySelector("[data-project-gallery]");
let activeGalleryIndex = 0;
const preloadedGalleryItems = new Set();

if (galleryRoot) galleryRoot.tabIndex = 0;

const revealTab = (button) => {
  if (!tablist || !button) return;
  const listBounds = tablist.getBoundingClientRect();
  const buttonBounds = button.getBoundingClientRect();
  if (buttonBounds.left < listBounds.left) {
    tablist.scrollBy({ left: buttonBounds.left - listBounds.left - 8 });
  } else if (buttonBounds.right > listBounds.right) {
    tablist.scrollBy({ left: buttonBounds.right - listBounds.right + 8 });
  }
};

const activateTab = (id, focus = false) => {
  let selectedButton = null;
  tabButtons.forEach((button) => {
    const selected = button.dataset.projectTab === id;
    button.setAttribute("aria-selected", String(selected));
    button.tabIndex = selected ? 0 : -1;
    if (selected) {
      selectedButton = button;
      if (focus) button.focus();
    }
  });
  panels.forEach((panel) => {
    panel.hidden = panel.id !== `panel-${id}`;
  });
  revealTab(selectedButton);
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

let requestedTab = "";
try {
  requestedTab = decodeURIComponent(location.hash.slice(1));
} catch {
  requestedTab = "";
}
if (requestedTab && tabButtons.some((button) => button.dataset.projectTab === requestedTab)) {
  activateTab(requestedTab);
}

const showGalleryItem = (requestedIndex, announce = false) => {
  if (!galleryItems.length || !galleryImage) return;
  activeGalleryIndex = (requestedIndex + galleryItems.length) % galleryItems.length;
  const item = galleryItems[activeGalleryIndex];
  galleryImage.src = item.src;
  galleryImage.alt = item.alt;
  if (Number.isInteger(item.width) && item.width > 0) galleryImage.width = item.width;
  if (Number.isInteger(item.height) && item.height > 0) galleryImage.height = item.height;
  if (galleryRoot && Number.isInteger(item.width) && Number.isInteger(item.height) && item.width > 0 && item.height > 0) {
    const frameWidth = Number.isInteger(item.frameWidth) && item.frameWidth > 0 ? item.frameWidth : item.width;
    const frameHeight = Number.isInteger(item.frameHeight) && item.frameHeight > 0 ? item.frameHeight : item.height;
    galleryRoot.style.setProperty("--gallery-ratio", `${frameWidth} / ${frameHeight}`);
  }
  if (galleryLabel) galleryLabel.textContent = item.label;
  if (galleryCurrent) galleryCurrent.textContent = String(activeGalleryIndex + 1);
  if (announce && galleryLive) galleryLive.textContent = `${item.label}. ${activeGalleryIndex + 1} / ${galleryItems.length}.`;

  if (announce && galleryItems.length > 1) {
    const nextItem = galleryItems[(activeGalleryIndex + 1) % galleryItems.length];
    if (nextItem?.src && !preloadedGalleryItems.has(nextItem.src)) {
      const preload = new Image();
      preload.decoding = "async";
      preload.src = nextItem.src;
      preloadedGalleryItems.add(nextItem.src);
    }
  }
};

document.querySelector("[data-gallery-previous]")?.addEventListener("click", () => showGalleryItem(activeGalleryIndex - 1, true));
document.querySelector("[data-gallery-next]")?.addEventListener("click", () => showGalleryItem(activeGalleryIndex + 1, true));

galleryRoot?.addEventListener("keydown", (event) => {
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    showGalleryItem(activeGalleryIndex - 1, true);
  }
  if (event.key === "ArrowRight") {
    event.preventDefault();
    showGalleryItem(activeGalleryIndex + 1, true);
  }
});

showGalleryItem(0);
