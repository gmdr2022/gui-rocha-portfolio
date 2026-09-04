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
const projectShell = document.querySelector("[data-project-shell]");
const caseSources = [...document.querySelectorAll("[data-case-source]")];
const readingLens = document.querySelector("[data-reading-lens]");
let activeGalleryIndex = 0;
const preloadedGalleryItems = new Set();

const publishEvidenceAmbient = (element, id, index) => {
  if (!projectShell || !element) return;
  window.dispatchEvent(new CustomEvent("portal:ambientchange", {
    detail: { source: "evidence", id, index, element, interactive: true, accentRgb: projectShell.style.getPropertyValue("--project-accent-rgb").trim() },
  }));
};

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

const activateTab = (id, focus = false, { writeUrl = true, ambient = true } = {}) => {
  const index = tabButtons.findIndex((button) => button.dataset.projectTab === id);
  if (index < 0) return;
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
  caseSources.forEach((entry) => {
    entry.dataset.caseActive = String(entry.dataset.caseSource === `tab:${id}`);
  });
  readingLens?.style.setProperty("--lens-progress", `${((index + 1) / tabButtons.length) * 100}%`);
  revealTab(selectedButton);
  if (writeUrl) history.replaceState(null, "", `#panel-${id}`);
  if (ambient) publishEvidenceAmbient(selectedButton, `facet-${id}`, index);
};

document.querySelectorAll("[data-case-tab]").forEach((link) => {
  link.addEventListener("click", (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    activateTab(link.dataset.caseTab, true);
  });
});

tablist?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-project-tab]");
  if (button) activateTab(button.dataset.projectTab);
});

tablist?.addEventListener("keydown", (event) => {
  const vertical = tablist.getAttribute("aria-orientation") === "vertical";
  const previousKey = vertical ? "ArrowUp" : "ArrowLeft";
  const nextKey = vertical ? "ArrowDown" : "ArrowRight";
  if (event.altKey || event.ctrlKey || event.metaKey || ![previousKey, nextKey, "Home", "End"].includes(event.key)) return;
  const current = tabButtons.indexOf(document.activeElement);
  let target = current;
  if (event.key === nextKey) target = (current + 1) % tabButtons.length;
  if (event.key === previousKey) target = (current - 1 + tabButtons.length) % tabButtons.length;
  if (event.key === "Home") target = 0;
  if (event.key === "End") target = tabButtons.length - 1;
  event.preventDefault();
  activateTab(tabButtons[target].dataset.projectTab, true);
});

const syncTabOrientation = () => {
  if (tablist) tablist.setAttribute("aria-orientation", getComputedStyle(tablist).flexDirection === "column" ? "vertical" : "horizontal");
};
syncTabOrientation();
if (tablist && typeof window.ResizeObserver === "function") new ResizeObserver(syncTabOrientation).observe(tablist);
else window.addEventListener("resize", syncTabOrientation, { passive: true });

const tabFromHash = () => {
  try {
    return decodeURIComponent(location.hash.slice(1)).replace(/^panel-/, "");
  } catch {
    return "";
  }
};
const requestedTab = tabFromHash();
const initialTab = tabButtons.some((button) => button.dataset.projectTab === requestedTab)
  ? requestedTab : tabButtons[0]?.dataset.projectTab;
if (initialTab) activateTab(initialTab, false, { writeUrl: false, ambient: false });
window.addEventListener("hashchange", () => activateTab(tabFromHash(), false, { writeUrl: false }));

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
  if (announce) publishEvidenceAmbient(galleryRoot, `gallery-${activeGalleryIndex}`, activeGalleryIndex);

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
