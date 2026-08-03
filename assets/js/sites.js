const collections = [...document.querySelectorAll("[data-site-collection]")];
const languageLinks = [...document.querySelectorAll("[data-language-link]")];

const updateLanguageLinks = (slug) => {
  languageLinks.forEach((link) => {
    const target = new URL(link.getAttribute("href"), location.origin);
    target.searchParams.set("site", slug);
    link.href = `${target.pathname}${target.search}`;
  });
};

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
  updateLanguageLinks(selected);

  if (announce) {
    const selectedPanel = panels.find((panel) => panel.dataset.sitePanel === selected);
    const siteName = selectedPanel?.querySelector("h2")?.textContent?.trim() || "";
    const liveRegion = collection.querySelector("[data-site-live]");
    if (liveRegion) liveRegion.textContent = siteName;
  }

  if (updateUrl) {
    const url = new URL(location.href);
    url.searchParams.set("site", selected);
    url.hash = "";
    history.replaceState(history.state, "", `${url.pathname}${url.search}`);
  }

  return selected;
};

collections.forEach((collection) => {
  const requestedFromQuery = new URLSearchParams(location.search).get("site");
  const requestedFromHash = [...collection.querySelectorAll("[data-site-panel]")]
    .find((panel) => `#${panel.id}` === location.hash)
    ?.dataset.sitePanel;
  const first = collection.querySelector("[data-site-select]")?.dataset.siteSelect;
  const selected = selectSite(collection, requestedFromQuery || requestedFromHash || first);
  const shouldNormalizeUrl = Boolean(requestedFromHash)
    || Boolean(requestedFromQuery && requestedFromQuery !== selected);
  if (shouldNormalizeUrl && selected) {
    selectSite(collection, selected, { updateUrl: true });
  }

  collection.addEventListener("click", (event) => {
    const selector = event.target.closest("[data-site-select]");
    if (!selector || !collection.contains(selector)) return;
    event.preventDefault();
    selectSite(collection, selector.dataset.siteSelect, { announce: true, updateUrl: true });
  });
});
