const collections = [...document.querySelectorAll("[data-site-collection]")];

const selectSite = (collection, slug, { announce = false, updateUrl = false } = {}) => {
  const selectors = [...collection.querySelectorAll("[data-site-select]")];
  const panels = [...collection.querySelectorAll("[data-site-panel]")];
  const selected = selectors.some((selector) => selector.dataset.siteSelect === slug)
    ? slug
    : selectors[0]?.dataset.siteSelect;

  if (!selected) return;

  collection.dataset.enhanced = "true";
  selectors.forEach((selector) => {
    const active = selector.dataset.siteSelect === selected;
    selector.setAttribute("aria-current", active ? "true" : "false");
  });
  panels.forEach((panel) => {
    const active = panel.dataset.sitePanel === selected;
    panel.hidden = !active;
    panel.setAttribute("aria-hidden", String(!active));
  });

  if (announce) {
    const selectedPanel = panels.find((panel) => panel.dataset.sitePanel === selected);
    const siteName = selectedPanel?.querySelector("h2, h3")?.textContent?.trim() || "";
    const liveRegion = collection.querySelector("[data-site-live]");
    if (liveRegion) liveRegion.textContent = siteName;
  }

  if (updateUrl) {
    const url = new URL(location.href);
    url.searchParams.set("site", selected);
    history.replaceState(history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }
};

collections.forEach((collection) => {
  const requested = new URLSearchParams(location.search).get("site");
  const first = collection.querySelector("[data-site-select]")?.dataset.siteSelect;
  selectSite(collection, requested || first);

  collection.addEventListener("click", (event) => {
    const selector = event.target.closest("[data-site-select]");
    if (!selector || !collection.contains(selector)) return;
    event.preventDefault();
    selectSite(collection, selector.dataset.siteSelect, { announce: true, updateUrl: true });
  });
});

const dialog = document.querySelector("[data-sites-dialog]");
const opener = document.querySelector("[data-sites-opener]");
const baseDocumentTitle = document.title;
let closeFromHistory = false;

const focusOpener = () => {
  if (opener?.isConnected) opener.focus({ preventScroll: true });
};

const openDialog = () => {
  if (!dialog || dialog.open || typeof dialog.showModal !== "function") return;
  dialog.showModal();
  document.body.dataset.siteDialogOpen = "true";
  if (dialog.dataset.sitesTitle) document.title = dialog.dataset.sitesTitle;
  requestAnimationFrame(() => {
    dialog.querySelector("[data-site-collection-close]")?.focus({ preventScroll: true });
  });
};

const closeDialogFromHistory = () => {
  if (!dialog?.open) return;
  closeFromHistory = true;
  dialog.close();
  closeFromHistory = false;
  delete document.body.dataset.siteDialogOpen;
  document.title = baseDocumentTitle;
  focusOpener();
};

const requestDialogClose = () => {
  if (!dialog?.open) return;
  if (history.state?.sitesOverlay) {
    history.back();
    return;
  }
  closeDialogFromHistory();
};

const focusableElements = () => [...dialog.querySelectorAll(
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
)].filter((element) => !element.closest("[hidden]") && element.getClientRects().length > 0);

if (dialog && opener && typeof dialog.showModal === "function") {
  opener.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    history.pushState({ sitesOverlay: true }, "", opener.href);
    openDialog();
  });

  dialog.querySelector("[data-site-collection-close]")?.addEventListener("click", requestDialogClose);

  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    requestDialogClose();
  });

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) requestDialogClose();
  });

  document.addEventListener("keydown", (event) => {
    if (!dialog.open || event.key !== "Tab") return;
    const focusable = focusableElements();
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) {
      event.preventDefault();
      dialog.querySelector("[data-site-collection-close]")?.focus({ preventScroll: true });
      return;
    }
    if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
      event.preventDefault();
      last.focus({ preventScroll: true });
    } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
      event.preventDefault();
      first.focus({ preventScroll: true });
    }
  });

  dialog.addEventListener("close", () => {
    delete document.body.dataset.siteDialogOpen;
    document.title = baseDocumentTitle;
    if (!closeFromHistory && history.state?.sitesOverlay) history.back();
  });

  window.addEventListener("popstate", () => {
    if (history.state?.sitesOverlay) {
      openDialog();
    } else {
      closeDialogFromHistory();
    }
  });
}
