import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import { localeOrder, locales } from "../content/pages.mjs";

const root = resolve(process.cwd());
const origin = "https://gui-rocha.pages.dev";
const projectFiles = {
  "pt-BR": "projects.json",
  en: "projects.en.json",
  es: "projects.es.json",
};
const siteFiles = {
  "pt-BR": "sites.json",
  en: "sites.en.json",
  es: "sites.es.json",
};
const projectAssets = JSON.parse(await readFile(join(root, "assets", "data", "project-assets.json"), "utf8"));
const mutableAssetPaths = [
  "assets/css/styles.css",
  "assets/js/site.js",
  "assets/js/home.js",
  "assets/js/about.js",
  "assets/js/project.js",
  "assets/js/contact.js",
  "assets/js/sites.js",
];
const assetVersionHash = createHash("sha256");
for (const path of mutableAssetPaths) {
  assetVersionHash.update(await readFile(join(root, path)));
}
const assetVersion = assetVersionHash.digest("hex").slice(0, 12);
const versionedAsset = (path) => `${path}?v=${assetVersion}`;

const projectsByLocale = Object.fromEntries(await Promise.all(localeOrder.map(async (locale) => {
  const path = join(root, "assets", "data", projectFiles[locale]);
  const projects = JSON.parse(await readFile(path, "utf8")).sort((a, b) => a.order - b.order);
  return [locale, projects];
})));

const siteContentByLocale = Object.fromEntries(await Promise.all(localeOrder.map(async (locale) => {
  const path = join(root, "assets", "data", siteFiles[locale]);
  const content = JSON.parse(await readFile(path, "utf8"));
  content.sites = content.sites.filter((site) => site.visible !== false).sort((a, b) => a.order - b.order);
  return [locale, content];
})));

const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (character) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "'": "&#039;",
  "\"": "&quot;",
}[character]));

const safeDimension = (value, fallback) => Number.isInteger(value) && value > 0 ? value : fallback;
const deferredImagePlaceholder = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
const imageSource = (source, deferred = false) => deferred
  ? `src="${deferredImagePlaceholder}" data-deferred-src="${escapeHtml(source)}"`
  : `src="${escapeHtml(source)}"`;

const projectIcon = (project, { eager = false, deferred = false, className = "" } = {}) => {
  const asset = projectAssets[project.slug];
  if (!asset) throw new Error(`Missing shared project asset for ${project.slug}`);
  const loading = eager ? "" : ' loading="lazy"';
  return `<span class="project-icon${className ? ` ${className}` : ""}" data-icon-kind="${escapeHtml(asset.kind)}"><img ${imageSource(asset.src, deferred)} alt="" width="${safeDimension(asset.width, 96)}" height="${safeDimension(asset.height, 96)}" decoding="async"${loading} aria-hidden="true"></span>`;
};

const clubalMediaCopy = {
  "pt-BR": {
    operation: "OPERAÇÃO",
    environment: "AMBIENTE DEMO",
    ready: "PRONTO",
    weatherAlt: "Recorte seguro da superfície Flet de clima do ClubAL com dados fictícios",
  },
  en: {
    operation: "OPERATIONS",
    environment: "DEMO SPACE",
    ready: "READY",
    weatherAlt: "Safe crop of ClubAL's Flet weather surface with fictional data",
  },
  es: {
    operation: "OPERACIÓN",
    environment: "ESPACIO DEMO",
    ready: "LISTO",
    weatherAlt: "Recorte seguro de la superficie Flet de clima de ClubAL con datos ficticios",
  },
};

const routeFor = (locale, page) => {
  const config = locales[locale];
  if (page.type === "home") return config.home;
  if (page.type === "about") return config.routes.about;
  if (page.type === "contact") return config.routes.contact;
  if (page.type === "privacy") return config.routes.privacy;
  if (page.type === "sites") return config.routes.sites;
  if (page.type === "site") return `${config.routes.sites}${page.slug}/`;
  if (page.type === "project") return `${config.routes.projects}${page.slug}/`;
  return config.home;
};

const pageFile = (route) => join(root, route.replace(/^\/|\/$/g, ""), "index.html");

const writePage = async (route, html) => {
  const output = pageFile(route);
  if (output !== join(root, "index.html") && !output.startsWith(`${root}${sep}`)) {
    throw new Error(`Unsafe generated path: ${output}`);
  }
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, html, "utf8");
};

const icon = (name) => {
  const paths = {
    arrowLeft: '<path d="M14.5 5 7.5 12l7 7"/>',
    arrowRight: '<path d="m9.5 5 7 7-7 7"/>',
    arrowDown: '<path d="m5 9.5 7 7 7-7"/>',
    chevron: '<path d="m7 9 5 5 5-5"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9S14.5 18.3 12 21c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3Z"/>',
    theme: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5"/>',
    accessibility: '<circle cx="12" cy="4.5" r="2.2"/><path d="M4.5 8.1c4.7 1.9 10.3 1.9 15 0M12 9.4v10.1M8.2 21l3.8-6.2 3.8 6.2"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>',
    whatsapp: '<path d="M20 11.6a8 8 0 0 1-11.8 7L4 19.7l1.2-4A8 8 0 1 1 20 11.6Z"/><path d="M8.7 8.4c.2 2.8 2.1 4.8 4.9 5.2"/>',
    github: '<path d="M9 19c-4 .8-4-2-5-2.5M15 22v-3.9c0-1.1.4-1.9 1-2.4 3.3-.4 6.7-1.6 6.7-7.3A5.7 5.7 0 0 0 21.2 4 5.3 5.3 0 0 0 21 0s-1.2-.4-4 1.5a15 15 0 0 0-8 0C6.2-.4 5 0 5 0a5.3 5.3 0 0 0-.2 4 5.7 5.7 0 0 0-1.5 4.4c0 5.7 3.4 7 6.7 7.3.6.5 1 1.5 1 2.7V22"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    collection: '<rect x="3" y="4" width="18" height="14" rx="2"/><path d="M7 21h10M12 18v3M3 8h18"/>',
  };
  return `<svg aria-hidden="true" viewBox="0 0 24 24">${paths[name]}</svg>`;
};

const alternateLinks = (page) => localeOrder.map((locale) => {
  const hreflang = locale === "pt-BR" ? "pt-BR" : locale;
  return `<link rel="alternate" hreflang="${hreflang}" href="${origin}${routeFor(locale, page)}">`;
}).join("\n  ");

const languageSwitcher = (locale, page) => {
  const current = locales[locale];
  return `
    <details class="language-switcher">
      <summary aria-label="${escapeHtml(`${current.common.languageMenu}: ${current.short} ${current.nativeName}`)}">
        ${icon("globe")}
        <span>${current.short}</span>
        <strong>${escapeHtml(current.nativeName)}</strong>
        ${icon("chevron")}
      </summary>
      <nav aria-label="${escapeHtml(current.common.language)}">
        ${localeOrder.map((targetLocale) => {
          const target = locales[targetLocale];
          const currentAttribute = targetLocale === locale ? ' aria-current="page"' : "";
          return `<a href="${routeFor(targetLocale, page)}" lang="${target.htmlLang}" hreflang="${target.htmlLang}"${currentAttribute}><span>${target.short}</span>${escapeHtml(target.nativeName)}</a>`;
        }).join("")}
      </nav>
    </details>`;
};

const header = (locale, page) => {
  const config = locales[locale];
  const common = config.common;
  return `
  <header class="site-header">
    <a class="brand-lockup" href="${config.home}" aria-label="Guilherme Rocha">
      <span class="brand-logo" aria-hidden="true"></span>
      <span class="brand-copy">
        <strong>Guilherme Rocha</strong>
        <small>${escapeHtml(common.brandTagline)}</small>
      </span>
    </a>
    <nav class="site-nav" aria-label="${escapeHtml(common.navLabel)}">
      <a href="${config.routes.contact}" data-site-nav="contact">${escapeHtml(common.contact)}</a>
      <a href="${config.routes.about}" data-site-nav="about">${escapeHtml(common.about)}</a>
      <a href="${config.home}#projects" data-site-nav="home">${escapeHtml(common.products)}</a>
    </nav>
    <div class="header-actions">
      ${languageSwitcher(locale, page)}
      <button class="theme-button" type="button" data-theme-toggle aria-label="${escapeHtml(common.theme)}">${icon("theme")}<span data-theme-label>${escapeHtml(common.themeInitial)}</span></button>
      <a class="button compact header-talk" href="${config.routes.contact}">${escapeHtml(common.talk)}</a>
    </div>
    <span class="site-scroll-progress" aria-hidden="true"><span data-scroll-progress></span></span>
  </header>`;
};

const footer = (locale) => {
  const config = locales[locale];
  const common = config.common;
  return `
  <footer class="site-footer">
    <p>© <span data-current-year>2026</span> ${escapeHtml(common.copyright)}</p>
    <nav class="footer-links" aria-label="${escapeHtml(common.footerLabel)}">
      <a href="https://github.com/gmdr2022" target="_blank" rel="noopener noreferrer">GitHub</a>
      <a href="mailto:suporte.clubal@gmail.com">${escapeHtml(common.email)}</a>
      <a href="${config.routes.privacy}">${escapeHtml(common.privacy)}</a>
      <button type="button" data-open-cookie>${escapeHtml(common.cookies)}</button>
    </nav>
  </footer>`;
};

const layout = ({ locale, page, title, description, main, scripts = [], bodyClass = "", ogImage = "/assets/img/social-card.png", robots = "" }) => {
  const config = locales[locale];
  const canonical = `${origin}${routeFor(locale, page)}`;
  const manifest = locale === "pt-BR" ? "/manifest.webmanifest" : `/${locale}/manifest.webmanifest`;
  const output = `<!doctype html>
<html lang="${config.htmlLang}" class="no-js" data-theme="system">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="theme-color" content="#071412">
  ${robots ? `<meta name="robots" content="${robots}">` : ""}
  <meta property="og:type" content="website">
  <meta property="og:locale" content="${config.ogLocale}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${origin}${ogImage}">
  <link rel="canonical" href="${canonical}">
  ${alternateLinks(page)}
  <link rel="alternate" hreflang="x-default" href="${origin}${routeFor("pt-BR", page)}">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="manifest" href="${manifest}">
  <link rel="stylesheet" href="${versionedAsset("/assets/css/styles.css")}">
  <script src="${versionedAsset("/assets/js/site.js")}" defer></script>
  ${scripts.map((script) => `<script src="${versionedAsset(script)}" defer></script>`).join("\n  ")}
  <title>${escapeHtml(title)}</title>
</head>
<body class="${bodyClass}" data-locale="${locale}" data-page="${page.type}">
  <a class="skip-link" href="#content">${escapeHtml(config.common.skip)}</a>
  ${header(locale, page)}
  ${main}
  ${footer(locale)}
</body>
</html>
`;
  return output.replace(/[ \t]+$/gm, "");
};

const siteCollectionCard = (locale) => {
  const { collection, sites } = siteContentByLocale[locale];
  const countLabel = sites.length === 1 ? collection.countSingular : collection.countPlural;
  return {
    ...collection,
    slug: "sites",
    status: `${sites.length} ${countLabel}`,
    statusTone: "live",
    facts: [`${sites.length} ${countLabel}`, ...collection.facts],
  };
};

const projectCard = (locale, project, index) => {
  const config = locales[locale];
  const common = config.common;
  const cardCta = project.cardCta ?? common.viewProject;
  const cardImage = project.cardImage ?? project.image;
  const cardImageAlt = project.cardImageAlt ?? project.imageAlt;
  const imageWidth = safeDimension(project.cardImageWidth ?? project.imageWidth, 1600);
  const imageHeight = safeDimension(project.cardImageHeight ?? project.imageHeight, 900);
  const deferred = index !== 0;
  const media = project.slug === "clubal" ? (() => {
    const copy = clubalMediaCopy[locale];
    return `
            <div class="clubal-showcase">
              <div class="clubal-operation-panel" aria-hidden="true">
                <div class="clubal-operation-header"><strong>${escapeHtml(copy.operation)}</strong><span>01</span></div>
                <div class="clubal-operation-summary">
                  <span>${escapeHtml(copy.environment)}</span>
                  <strong>${escapeHtml(copy.ready)}</strong>
                </div>
                <div class="clubal-operation-rows">
                  <i></i><i></i><i></i>
                </div>
              </div>
              <img class="clubal-weather-surface" src="/assets/img/clubal/clima-flet-home.webp" alt="${escapeHtml(copy.weatherAlt)}" width="968" height="533"${index === 0 ? "" : ' loading="lazy"'}>
              <img class="clubal-rotinas-surface" src="${cardImage}" alt="${escapeHtml(cardImageAlt)}" width="${imageWidth}" height="${imageHeight}"${index === 0 ? ' fetchpriority="high"' : ' loading="lazy"'}>
            </div>`;
  })() : `
            <img ${imageSource(cardImage, deferred)} alt="${escapeHtml(cardImageAlt)}" width="${imageWidth}" height="${imageHeight}"${index === 0 ? ' fetchpriority="high"' : ' loading="lazy"'}>`;
  return `
        <article class="project-card" data-project-card data-project="${project.slug}" data-index="${index}" data-kind="${project.imageKind}" data-deck-name="${escapeHtml(project.shortName ?? project.name)}" data-position="${index === 0 ? "active" : "hidden"}" aria-hidden="${index === 0 ? "false" : "true"}" style="--project-accent:${project.accent};--project-accent-rgb:${project.accentRgb}">
          <div class="project-card-media">
            ${media}
            <span class="visual-label">${escapeHtml(project.visualLabel)}</span>
          </div>
          <div class="project-card-content">
            <div class="project-card-meta"><span>${project.code}</span><p>${escapeHtml(project.kicker)}</p></div>
            <span class="status-pill" data-tone="${project.statusTone}">${escapeHtml(project.status)}</span>
            <div class="project-title-row">${projectIcon(project, { eager: index === 0, deferred })}<h2>${escapeHtml(project.name)}</h2></div>
            <p>${escapeHtml(project.summary)}</p>
            <div class="project-card-footer">
              <ul aria-label="${escapeHtml(project.name)}">${project.facts.map((fact) => `<li>${escapeHtml(fact)}</li>`).join("")}</ul>
              <a class="card-link" href="${project.route}" aria-label="${escapeHtml(cardCta)}: ${escapeHtml(project.name)}"${project.slug === "sites" ? " data-sites-opener" : ""}>
                <span>${escapeHtml(cardCta)}</span>${icon("arrowRight")}
              </a>
            </div>
          </div>
        </article>`;
};

const siteCollectionMarkup = (locale, { mode = "page" } = {}) => {
  const config = locales[locale];
  const { collection, sites } = siteContentByLocale[locale];
  const prefix = mode === "dialog" ? "sites-overlay" : "sites-page";
  const headingTag = mode === "dialog" ? "h2" : "h1";
  const panelHeadingTag = mode === "dialog" ? "h3" : "h2";
  const countLabel = sites.length === 1 ? collection.countSingular : collection.countPlural;
  const closeControl = mode === "dialog"
    ? `<button class="sites-window-close" type="button" data-site-collection-close aria-label="${escapeHtml(collection.closeLabel)}">${icon("close")}</button>`
    : `<a class="sites-window-back" href="${config.home}#projects" aria-label="${escapeHtml(collection.backLabel)}">${icon("arrowLeft")}<span>${escapeHtml(collection.backLabel)}</span></a>`;

  return `
    <section class="sites-window" data-site-collection aria-labelledby="${prefix}-title" aria-describedby="${prefix}-description">
      <header class="sites-window-header">
        <div class="sites-window-identity">
          <span class="sites-window-mark" aria-hidden="true">${icon("collection")}</span>
          <div>
            <p class="eyebrow">${escapeHtml(collection.eyebrow)}</p>
            <${headingTag} id="${prefix}-title">${escapeHtml(collection.heading)}</${headingTag}>
          </div>
        </div>
        <p id="${prefix}-description">${escapeHtml(collection.lead)}</p>
        <span class="sites-window-count"><strong>${sites.length}</strong> ${escapeHtml(countLabel)}</span>
        ${closeControl}
      </header>
      <div class="sites-workspace">
        <nav class="sites-catalog" aria-label="${escapeHtml(collection.catalogLabel)}">
          ${sites.map((site, index) => `
            <a href="#${prefix}-${site.slug}" data-site-select="${site.slug}" aria-controls="${prefix}-${site.slug}" aria-current="${index === 0 ? "true" : "false"}">
              <img src="${site.icon}" alt="" width="${safeDimension(site.iconWidth, 96)}" height="${safeDimension(site.iconHeight, 96)}" loading="lazy" decoding="async" aria-hidden="true">
              <span><strong>${escapeHtml(site.name)}</strong><small>${escapeHtml(site.category)}</small></span>
              <em><i aria-hidden="true"></i>${escapeHtml(site.status)}</em>
              ${icon("arrowRight")}
            </a>`).join("")}
        </nav>
        <div class="sites-stage" aria-label="${escapeHtml(collection.selectedLabel)}">
          ${sites.map((site, index) => `
            <article class="site-feature-panel" id="${prefix}-${site.slug}" data-site-panel="${site.slug}" style="--site-accent:${site.accent};--site-accent-rgb:${site.accentRgb}">
              <figure class="site-feature-cover">
                <img src="${site.cover.src}" alt="${escapeHtml(site.cover.alt)}" width="${safeDimension(site.cover.width, 1600)}" height="${safeDimension(site.cover.height, 1000)}"${mode === "page" && index === 0 ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async">
                <figcaption>${escapeHtml(site.cover.label)}</figcaption>
              </figure>
              <div class="site-feature-copy">
                <div class="site-feature-meta">
                  <span class="status-pill" data-tone="${site.statusTone}">${escapeHtml(site.status)}</span>
                  <span>${String(index + 1).padStart(2, "0")} / ${String(sites.length).padStart(2, "0")}</span>
                </div>
                <p class="eyebrow">${escapeHtml(site.category)}</p>
                <${panelHeadingTag}>${escapeHtml(site.name)}</${panelHeadingTag}>
                <p class="site-feature-summary">${escapeHtml(site.summary)}</p>
                <div class="site-feature-objective">
                  <strong>${escapeHtml(collection.objectiveLabel)}</strong>
                  <p>${escapeHtml(site.objective)}</p>
                </div>
                <ul class="site-feature-tags" aria-label="${escapeHtml(site.name)}">${site.tags.map((tag) => `<li>${escapeHtml(tag)}</li>`).join("")}</ul>
                <div class="site-feature-evidence">
                  <strong>${escapeHtml(collection.evidenceLabel)}</strong>
                  <ul>${site.evidence.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
                </div>
                <div class="site-feature-actions">
                  <a class="button primary" href="${site.route}">${escapeHtml(collection.viewCase)}${icon("arrowRight")}</a>
                  <a class="button secondary" href="${site.officialUrl}" target="_blank" rel="noopener noreferrer">${escapeHtml(collection.visitOfficial)}${icon("external")}<span class="sr-only"> (${escapeHtml(collection.external)})</span></a>
                  ${site.relatedProduct ? `<a class="text-link" href="${site.relatedProduct.route}">${escapeHtml(site.relatedProduct.label)}${icon("arrowRight")}</a>` : ""}
                </div>
              </div>
            </article>`).join("")}
        </div>
      </div>
      <p class="sr-only" aria-live="polite" data-site-live></p>
    </section>`;
};

const sitesDialog = (locale) => `
    <dialog class="sites-dialog" data-sites-dialog data-sites-title="${escapeHtml(siteContentByLocale[locale].collection.title)}" aria-labelledby="sites-overlay-title" aria-describedby="sites-overlay-description" aria-modal="true">
      ${siteCollectionMarkup(locale, { mode: "dialog" })}
    </dialog>`;

const homePage = (locale) => {
  const config = locales[locale];
  const copy = config.homePage;
  const common = config.common;
  const collectionCard = siteCollectionCard(locale);
  const projects = projectsByLocale[locale].map((project) => project.slug === "demonyza" ? collectionCard : project);
  const page = { type: "home" };
  const main = `
  <main class="home-main" id="content">
    <section class="home-intro" aria-labelledby="home-title">
      <div class="portrait-line">
        <img src="/assets/img/gui-rocha-home.webp" alt="${escapeHtml(copy.portraitAlt)}" width="104" height="104">
        <p><strong>Guilherme Rocha</strong><span>${escapeHtml(copy.portraitCaption)}</span></p>
      </div>
      <p class="eyebrow">${escapeHtml(copy.eyebrow)}</p>
      <h1 id="home-title">${escapeHtml(copy.heading)}</h1>
      <p class="home-lead">${escapeHtml(copy.lead)}</p>
      <div class="button-row">
        <a class="button primary" href="#projects">${escapeHtml(copy.primaryAction)}</a>
        <a class="button secondary" href="${config.routes.contact}">${escapeHtml(copy.secondaryAction)}</a>
      </div>
    </section>
    <section class="project-catalog" id="projects" aria-labelledby="projects-title" data-project-catalog style="--active-accent:${projects[0].accent};--active-accent-rgb:${projects[0].accentRgb}">
      <header class="catalog-header">
        <div><p class="eyebrow">${escapeHtml(copy.catalogTitle)}</p><h2 id="projects-title">${escapeHtml(projects[0].name)}</h2></div>
        <p>${escapeHtml(copy.catalogHint)}</p>
      </header>
      <div class="project-deck" data-project-deck>
        ${projects.map((project, index) => projectCard(locale, project, index)).join("")}
      </div>
      <div class="deck-controls">
        <button class="deck-button" type="button" data-deck-previous>${icon("arrowLeft")}<span>${escapeHtml(common.previous)}</span></button>
        <div class="deck-progress" role="group" aria-label="${escapeHtml(copy.catalogTitle)}">
          ${projects.map((project, index) => `<button type="button" data-deck-dot="${index}" aria-label="${escapeHtml(project.cardCta ?? common.viewProject)}: ${escapeHtml(project.name)}" aria-pressed="${index === 0 ? "true" : "false"}"><span>${project.code}</span></button>`).join("")}
        </div>
        <p class="deck-current"><strong data-deck-current>${escapeHtml(projects[0].shortName ?? projects[0].name)}</strong><span data-deck-counter>01 / ${String(projects.length).padStart(2, "0")}</span></p>
        <button class="deck-button" type="button" data-deck-next><span>${escapeHtml(common.next)}</span>${icon("arrowRight")}</button>
      </div>
      <p class="sr-only" aria-live="polite" data-deck-live></p>
      <noscript><p class="noscript-links">${escapeHtml(copy.noscript)} ${projects.map((project) => `<a href="${project.route}">${escapeHtml(project.name)}</a>`).join(" · ")}</p></noscript>
    </section>
    ${sitesDialog(locale)}
  </main>`;
  return layout({ locale, page, title: copy.title, description: copy.description, main, scripts: ["/assets/js/home.js", "/assets/js/sites.js"], bodyClass: "home-page" });
};

const aboutPage = (locale) => {
  const config = locales[locale];
  const copy = config.aboutPage;
  const page = { type: "about" };
  const projects = new Map(projectsByLocale[locale].map((project) => [project.slug, project]));
  const collectionCard = siteCollectionCard(locale);
  projects.set("sites", collectionCard);
  const catalogCards = copy.catalogs.map(([key, title, slugs], categoryIndex) => {
    const items = slugs.map((slug) => projects.get(slug)).filter(Boolean);
    const panelId = `context-${locale.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${key}`;
    const count = key === "websites"
      ? collectionCard.status
      : items.length === 1 ? copy.catalogSingle : `${items.length} ${copy.catalogMultiple}`;
    const accent = items[0]?.accent || "#a9ed34";
    return `
        <article class="context-catalog-card" data-context-card data-category="${key}" style="--context-accent:${accent};--context-order:${categoryIndex}">
          <button type="button" data-context-trigger aria-expanded="false" aria-controls="${panelId}">
            <span class="context-catalog-index">${String(categoryIndex + 1).padStart(2, "0")}</span>
            <span class="context-catalog-title"><strong>${escapeHtml(title)}</strong><small>${escapeHtml(count)}</small></span>
            ${icon("chevron")}
          </button>
          <div class="context-catalog-panel" id="${panelId}" data-context-panel hidden>
            <ul>${items.map((project) => `<li><a href="${project.route}" style="--item-accent:${project.accent}">${projectIcon(project)}<span><strong>${escapeHtml(project.name)}</strong><small>${escapeHtml(project.summary)}</small></span>${icon("arrowRight")}</a></li>`).join("")}</ul>
          </div>
        </article>`;
  }).join("");
  const main = `
  <main class="content-main about-main" id="content">
    <section class="content-hero">
      <p class="eyebrow">${escapeHtml(copy.eyebrow)}</p>
      <h1>${escapeHtml(copy.heading)}</h1>
      <p>${escapeHtml(copy.lead)}</p>
      <div class="button-row"><a class="button primary" href="${config.home}#projects">${escapeHtml(copy.primaryAction)}</a><a class="button secondary" href="https://github.com/gmdr2022" target="_blank" rel="noopener noreferrer">${escapeHtml(copy.secondaryAction)} ${icon("external")}<span class="sr-only"> (${escapeHtml(config.common.external)})</span></a></div>
    </section>
    <figure class="landscape-map">
      <img src="/assets/img/gui/panorama-visao-produto.webp" alt="${escapeHtml(copy.landscapeAlt)}" width="1672" height="941">
      <div class="landscape-copy"><p class="eyebrow">${escapeHtml(copy.landscapeKicker)}</p><h2>${escapeHtml(copy.landscapeTitle)}</h2><p>${escapeHtml(copy.landscapeBody)}</p></div>
      <section class="context-catalog" aria-labelledby="context-catalog-title">
        <header class="context-catalog-heading"><p class="eyebrow" id="context-catalog-title">${escapeHtml(copy.catalogKicker)}</p><p id="context-catalog-hint">${escapeHtml(copy.catalogHint)}</p></header>
        <div class="context-catalog-grid" data-context-catalogs aria-describedby="context-catalog-hint">${catalogCards}</div>
      </section>
      <figcaption>${escapeHtml(copy.landscapeCaption)}</figcaption>
    </figure>
    <section class="method-section" aria-labelledby="method-title">
      <p class="eyebrow">${escapeHtml(copy.methodTitle)}</p>
      <h2 id="method-title">${escapeHtml(copy.methodTitle)}</h2>
      <div class="method-grid">${copy.method.map(([number, title, body]) => `<article><span>${number}</span><h3>${escapeHtml(title)}</h3><p>${escapeHtml(body)}</p></article>`).join("")}</div>
    </section>
  </main>`;
  return layout({ locale, page, title: copy.title, description: copy.description, main, scripts: ["/assets/js/about.js"], bodyClass: "content-page" });
};

const contactPage = (locale) => {
  const config = locales[locale];
  const copy = config.contactPage;
  const page = { type: "contact" };
  const main = `
  <main class="content-main contact-main" id="content">
    <section class="content-hero">
      <p class="eyebrow">${escapeHtml(copy.eyebrow)}</p>
      <h1>${escapeHtml(copy.heading)}</h1>
      <p data-contact-lead>${escapeHtml(copy.lead)}</p>
    </section>
    <section class="contact-grid" aria-label="${escapeHtml(config.common.contact)}">
      <a class="contact-card whatsapp" href="https://wa.me/message/ACPGLFOEHUC7F1" target="_blank" rel="noopener noreferrer">${icon("whatsapp")}<span><strong>${escapeHtml(copy.whatsapp)}</strong><small>${escapeHtml(copy.whatsappDetail)}</small><span class="sr-only"> (${escapeHtml(config.common.external)})</span></span>${icon("external")}</a>
      <a class="contact-card email" data-email-link href="mailto:suporte.clubal@gmail.com">${icon("mail")}<span><strong>${escapeHtml(config.common.email)}</strong><small>suporte.clubal@gmail.com</small></span>${icon("arrowRight")}</a>
      <a class="contact-card github" href="https://github.com/gmdr2022" target="_blank" rel="noopener noreferrer">${icon("github")}<span><strong>GitHub</strong><small>${escapeHtml(copy.githubDetail)}</small><span class="sr-only"> (${escapeHtml(config.common.external)})</span></span>${icon("external")}</a>
    </section>
  </main>`;
  return layout({ locale, page, title: copy.title, description: copy.description, main, scripts: ["/assets/js/contact.js"], bodyClass: "content-page" });
};

const privacyPage = (locale) => {
  const config = locales[locale];
  const copy = config.privacyPage;
  const page = { type: "privacy" };
  const main = `
  <main class="content-main privacy-main" id="content">
    <section class="content-hero">
      <p class="eyebrow">${escapeHtml(copy.eyebrow)}</p>
      <h1>${escapeHtml(copy.heading)}</h1>
      <p>${escapeHtml(copy.lead)}</p>
      <small>${escapeHtml(copy.updated)}</small>
    </section>
    <div class="privacy-layout">
      <nav class="privacy-index" aria-label="${escapeHtml(copy.indexTitle)}"><strong>${escapeHtml(copy.indexTitle)}</strong>${copy.sections.map((section) => `<a href="#${section.id}">${escapeHtml(section.title)}</a>`).join("")}</nav>
      <div class="privacy-copy">${copy.sections.map((section) => `<section id="${section.id}"><h2>${escapeHtml(section.title)}</h2><p>${escapeHtml(section.body)}</p></section>`).join("")}</div>
    </div>
  </main>`;
  return layout({ locale, page, title: copy.title, description: copy.description, main, bodyClass: "content-page" });
};

const sitesPage = (locale) => {
  const { collection } = siteContentByLocale[locale];
  const page = { type: "sites" };
  const main = `
  <main class="sites-page-main" id="content">
    ${siteCollectionMarkup(locale)}
  </main>`;
  return layout({
    locale,
    page,
    title: collection.title,
    description: collection.description,
    main,
    scripts: ["/assets/js/sites.js"],
    bodyClass: "sites-page",
    ogImage: collection.image,
  });
};

const siteCaseNavigation = (locale, activeSlug) => {
  const { collection, sites } = siteContentByLocale[locale];
  const activeIndex = sites.findIndex((site) => site.slug === activeSlug);
  if (activeIndex < 0 || sites.length < 2) return "";
  const previous = sites[(activeIndex - 1 + sites.length) % sites.length];
  const next = sites[(activeIndex + 1) % sites.length];
  const position = locale === "en"
    ? `${activeIndex + 1} of ${sites.length}`
    : `${activeIndex + 1} de ${sites.length}`;
  return `
        <nav class="site-case-navigation" aria-label="${escapeHtml(collection.catalogLabel)}">
          <a class="site-case-previous" href="${previous.route}" rel="prev">${icon("arrowLeft")}<span><small>${escapeHtml(collection.previous)}</small><strong>${escapeHtml(previous.name)}</strong></span></a>
          <div><a href="${collection.route}">${escapeHtml(collection.all)}</a><span>${position}</span></div>
          <a class="site-case-next" href="${next.route}" rel="next"><span><small>${escapeHtml(collection.next)}</small><strong>${escapeHtml(next.name)}</strong></span>${icon("arrowRight")}</a>
        </nav>`;
};

const projectPage = (locale, project, index) => {
  const config = locales[locale];
  const common = config.common;
  const projects = projectsByLocale[locale];
  const next = projects[(index + 1) % projects.length];
  const page = { type: "project", slug: project.slug };
  const gallery = project.gallery?.length ? project.gallery : [{
    src: project.image,
    alt: project.imageAlt,
    label: project.visualLabel,
    width: project.imageWidth,
    height: project.imageHeight,
  }];
  const imageWidth = safeDimension(gallery[0].width ?? project.imageWidth, 1600);
  const imageHeight = safeDimension(gallery[0].height ?? project.imageHeight, 900);
  const frameWidth = safeDimension(gallery[0].frameWidth ?? imageWidth, imageWidth);
  const frameHeight = safeDimension(gallery[0].frameHeight ?? imageHeight, imageHeight);
  const faq = project.faq?.items?.length ? `
    <section class="project-faq" aria-labelledby="faq-title-${project.slug}">
      <header class="project-faq-heading">
        <div>
          <p class="eyebrow">${escapeHtml(project.faq.eyebrow)}</p>
          <h2 id="faq-title-${project.slug}">${escapeHtml(project.faq.title)}</h2>
        </div>
        <p>${escapeHtml(project.faq.intro)}</p>
      </header>
      <div class="project-faq-list">
        ${project.faq.items.map((item, itemIndex) => `<details${itemIndex === 0 ? " open" : ""}><summary><span class="project-faq-index" aria-hidden="true">${String(itemIndex + 1).padStart(2, "0")}</span><span>${escapeHtml(item.question)}</span></summary><p>${escapeHtml(item.answer)}</p></details>`).join("")}
      </div>
      ${project.faq.closing && project.faq.closingLabel && project.faq.closingHref ? `<footer class="project-faq-closing"><p>${escapeHtml(project.faq.closing)}</p><a href="${project.faq.closingHref}">${escapeHtml(project.faq.closingLabel)}${icon("arrowRight")}</a></footer>` : ""}
    </section>` : "";
  const main = `
  <main class="project-main" id="content">
    <article class="project-shell" data-project-shell style="--project-accent:${project.accent};--project-accent-rgb:${project.accentRgb}">
      <div class="project-content">
        <a class="project-breadcrumb" href="${config.home}#projects">${icon("arrowLeft")}<span>${escapeHtml(common.backToProjects)}</span></a>
        <header class="project-heading">
          <p class="project-number">${project.code} · ${escapeHtml(project.kicker)}</p>
          <span class="status-pill" data-tone="${project.statusTone}">${escapeHtml(project.status)}</span>
          <div class="project-heading-title">${projectIcon(project, { eager: true })}<h1>${escapeHtml(project.name)}</h1></div>
          <p class="project-promise">${escapeHtml(project.promise)}</p>
          <p class="project-summary">${escapeHtml(project.summary)}</p>
          <ul class="project-facts" aria-label="${escapeHtml(project.name)}">${project.facts.map((fact) => `<li>${escapeHtml(fact)}</li>`).join("")}</ul>
          ${project.faq?.jumpLabel ? `<a class="project-more-link" href="#faq-title-${project.slug}"><span>${escapeHtml(project.faq.jumpLabel)}</span>${icon("arrowDown")}</a>` : ""}
        </header>
        <section class="project-explorer" aria-label="${escapeHtml(common.detailsLabel)}">
          <div class="project-tabs" role="tablist" aria-label="${escapeHtml(common.detailsLabel)}">
            ${project.tabs.map((tab, tabIndex) => `<button type="button" role="tab" id="tab-${tab.id}" data-project-tab="${tab.id}" aria-controls="panel-${tab.id}" aria-selected="${tabIndex === 0 ? "true" : "false"}" tabindex="${tabIndex === 0 ? "0" : "-1"}">${escapeHtml(tab.label)}</button>`).join("")}
          </div>
          <div class="project-panels">
            ${project.tabs.map((tab, tabIndex) => `<section class="project-tab-panel" id="panel-${tab.id}" role="tabpanel" aria-labelledby="tab-${tab.id}"${tabIndex === 0 ? "" : " hidden"}><h2>${escapeHtml(tab.title)}</h2><p>${escapeHtml(tab.body)}</p><ul>${tab.points.map((point) => `<li>${escapeHtml(point)}</li>`).join("")}</ul></section>`).join("")}
          </div>
          <div class="project-actions">${project.links.map((link) => {
            const external = link.href.startsWith("http");
            return `<a class="button ${link.kind === "primary" ? "primary" : "secondary"}" href="${link.href}"${external ? ' target="_blank" rel="noopener noreferrer"' : ""}>${escapeHtml(link.label)}${external ? `${icon("external")}<span class="sr-only"> (${escapeHtml(common.external)})</span>` : ""}</a>`;
          }).join("")}</div>
        </section>
      </div>
      <div class="project-visual-column">
        <figure class="project-visual" data-kind="${project.imageKind}" style="--gallery-ratio:${frameWidth} / ${frameHeight}"${gallery.length > 1 ? ` data-project-gallery tabindex="0" aria-label="${escapeHtml(common.galleryLabel)}"` : ""}>
          <div class="project-image-frame">
            <img data-project-image src="${gallery[0].src}" alt="${escapeHtml(gallery[0].alt)}" width="${imageWidth}" height="${imageHeight}">
            <span class="visual-label" data-visual-label>${escapeHtml(gallery[0].label)}</span>
          </div>
          <div class="gallery-controls"${gallery.length < 2 ? " hidden" : ""} aria-label="${escapeHtml(common.galleryLabel)}">
            <button type="button" data-gallery-previous aria-label="${escapeHtml(common.galleryPrevious)}">${icon("arrowLeft")}<span>${escapeHtml(common.galleryPrevious)}</span></button>
            <p><strong data-gallery-current>1</strong><span>/ ${gallery.length}</span></p>
            <button type="button" data-gallery-next aria-label="${escapeHtml(common.galleryNext)}"><span>${escapeHtml(common.galleryNext)}</span>${icon("arrowRight")}</button>
          </div>
          <template data-gallery-data>${JSON.stringify(gallery).replaceAll("<", "\\u003c")}</template>
          <p class="sr-only" aria-live="polite" data-gallery-live></p>
          ${project.galleryNote ? `<figcaption class="gallery-note">${escapeHtml(project.galleryNote)}</figcaption>` : ""}
        </figure>
        ${project.slug === "demonyza" ? siteCaseNavigation(locale, project.slug) : ""}
        <a class="next-project" href="${next.route}" style="--next-accent:${next.accent}"><span>${escapeHtml(common.nextProject)}</span><strong>${escapeHtml(next.name)}</strong>${icon("arrowRight")}</a>
      </div>
    </article>
    ${faq}
  </main>`;
  return layout({
    locale,
    page,
    title: `${project.name} — Gui Rocha`,
    description: project.summary,
    main,
    scripts: ["/assets/js/project.js"],
    bodyClass: `project-page project-${project.slug}`,
    ogImage: project.image,
  });
};

const siteCasePage = (locale, site) => {
  const config = locales[locale];
  const common = config.common;
  const { collection } = siteContentByLocale[locale];
  const details = site.case;
  if (!details) throw new Error(`Missing case content for ${locale}:${site.slug}`);
  const page = { type: "site", slug: site.slug };
  const gallery = site.gallery?.length ? site.gallery : [site.cover];
  const imageWidth = safeDimension(gallery[0].width, 1600);
  const imageHeight = safeDimension(gallery[0].height, 1000);
  const frameWidth = safeDimension(gallery[0].frameWidth ?? imageWidth, imageWidth);
  const frameHeight = safeDimension(gallery[0].frameHeight ?? imageHeight, imageHeight);
  const accent = site.accent || "#25c997";
  const accentRgb = site.accentRgb || "37 201 151";
  const siteIconMarkup = `<span class="project-icon"><img src="${site.icon}" alt="" width="${safeDimension(site.iconWidth, 96)}" height="${safeDimension(site.iconHeight, 96)}" decoding="async" aria-hidden="true"></span>`;
  const main = `
  <main class="project-main" id="content">
    <article class="project-shell" data-project-shell style="--project-accent:${accent};--project-accent-rgb:${accentRgb}">
      <div class="project-content">
        <a class="project-breadcrumb" href="${collection.route}">${icon("arrowLeft")}<span>${escapeHtml(collection.all)}</span></a>
        <header class="project-heading">
          <p class="project-number">${escapeHtml(details.code)} · ${escapeHtml(details.kicker)}</p>
          <span class="status-pill" data-tone="${details.statusTone}">${escapeHtml(details.status)}</span>
          <div class="project-heading-title">${siteIconMarkup}<h1>${escapeHtml(site.name)}</h1></div>
          <p class="project-promise">${escapeHtml(details.promise)}</p>
          <p class="project-summary">${escapeHtml(details.summary)}</p>
          <ul class="project-facts" aria-label="${escapeHtml(site.name)}">${details.facts.map((fact) => `<li>${escapeHtml(fact)}</li>`).join("")}</ul>
        </header>
        <section class="project-explorer" aria-label="${escapeHtml(common.detailsLabel)}">
          <div class="project-tabs" role="tablist" aria-label="${escapeHtml(common.detailsLabel)}">
            ${details.tabs.map((tab, tabIndex) => `<button type="button" role="tab" id="tab-${tab.id}" data-project-tab="${tab.id}" aria-controls="panel-${tab.id}" aria-selected="${tabIndex === 0 ? "true" : "false"}" tabindex="${tabIndex === 0 ? "0" : "-1"}">${escapeHtml(tab.label)}</button>`).join("")}
          </div>
          <div class="project-panels">
            ${details.tabs.map((tab, tabIndex) => `<section class="project-tab-panel" id="panel-${tab.id}" role="tabpanel" aria-labelledby="tab-${tab.id}"${tabIndex === 0 ? "" : " hidden"}><h2>${escapeHtml(tab.title)}</h2><p>${escapeHtml(tab.body)}</p><ul>${tab.points.map((point) => `<li>${escapeHtml(point)}</li>`).join("")}</ul></section>`).join("")}
          </div>
          <div class="project-actions">${details.links.map((link) => {
            const external = link.href.startsWith("http");
            return `<a class="button ${link.kind === "primary" ? "primary" : "secondary"}" href="${link.href}"${external ? ' target="_blank" rel="noopener noreferrer"' : ""}>${escapeHtml(link.label)}${external ? `${icon("external")}<span class="sr-only"> (${escapeHtml(common.external)})</span>` : ""}</a>`;
          }).join("")}</div>
        </section>
      </div>
      <div class="project-visual-column">
        <figure class="project-visual" data-kind="website" style="--gallery-ratio:${frameWidth} / ${frameHeight}"${gallery.length > 1 ? ` data-project-gallery tabindex="0" aria-label="${escapeHtml(common.galleryLabel)}"` : ""}>
          <div class="project-image-frame">
            <img data-project-image src="${gallery[0].src}" alt="${escapeHtml(gallery[0].alt)}" width="${imageWidth}" height="${imageHeight}">
            <span class="visual-label" data-visual-label>${escapeHtml(gallery[0].label)}</span>
          </div>
          <div class="gallery-controls"${gallery.length < 2 ? " hidden" : ""} aria-label="${escapeHtml(common.galleryLabel)}">
            <button type="button" data-gallery-previous aria-label="${escapeHtml(common.galleryPrevious)}">${icon("arrowLeft")}<span>${escapeHtml(common.galleryPrevious)}</span></button>
            <p><strong data-gallery-current>1</strong><span>/ ${gallery.length}</span></p>
            <button type="button" data-gallery-next aria-label="${escapeHtml(common.galleryNext)}"><span>${escapeHtml(common.galleryNext)}</span>${icon("arrowRight")}</button>
          </div>
          <template data-gallery-data>${JSON.stringify(gallery).replaceAll("<", "\\u003c")}</template>
          <p class="sr-only" aria-live="polite" data-gallery-live></p>
          ${details.galleryNote ? `<figcaption class="gallery-note">${escapeHtml(details.galleryNote)}</figcaption>` : ""}
        </figure>
        ${siteCaseNavigation(locale, site.slug)}
      </div>
    </article>
  </main>`;
  return layout({
    locale,
    page,
    title: `${site.name} — ${collection.heading} — Gui Rocha`,
    description: site.summary,
    main,
    scripts: ["/assets/js/project.js"],
    bodyClass: `project-page site-case-page site-case-${site.slug}`,
    ogImage: site.cover.src,
  });
};

const notFoundPage = () => {
  const locale = "pt-BR";
  const config = locales[locale];
  const copy = config.notFoundPage;
  const page = { type: "home" };
  const main = `
  <main class="content-main not-found-main" id="content">
    <section class="content-hero">
      <p class="eyebrow">${escapeHtml(copy.eyebrow)}</p>
      <h1>${escapeHtml(copy.heading)}</h1>
      <p>${escapeHtml(copy.lead)}</p>
      <div class="button-row"><a class="button primary" href="${config.home}">${escapeHtml(copy.primaryAction)}</a><a class="button secondary" href="${config.routes.contact}">${escapeHtml(copy.secondaryAction)}</a></div>
    </section>
  </main>`;
  return layout({ locale, page, title: copy.title, description: copy.lead, main, bodyClass: "content-page", robots: "noindex" });
};

for (const localizedDirectory of ["en", "es", "sites"]) {
  const target = join(root, localizedDirectory);
  if (!target.startsWith(`${root}${sep}`)) throw new Error(`Unsafe locale target: ${target}`);
  await rm(target, { recursive: true, force: true });
}

for (const locale of localeOrder) {
  await writePage(routeFor(locale, { type: "home" }), homePage(locale));
  await writePage(routeFor(locale, { type: "about" }), aboutPage(locale));
  await writePage(routeFor(locale, { type: "contact" }), contactPage(locale));
  await writePage(routeFor(locale, { type: "privacy" }), privacyPage(locale));
  await writePage(routeFor(locale, { type: "sites" }), sitesPage(locale));
  for (const [index, project] of projectsByLocale[locale].entries()) {
    await writePage(routeFor(locale, { type: "project", slug: project.slug }), projectPage(locale, project, index));
  }
  for (const site of siteContentByLocale[locale].sites.filter((item) => item.case)) {
    await writePage(routeFor(locale, { type: "site", slug: site.slug }), siteCasePage(locale, site));
  }
}

const localizedManifests = {
  en: {
    name: "Gui Rocha — Local software, games and tools",
    short_name: "Gui Rocha",
    description: "Guilherme Rocha's portfolio and product catalog.",
    lang: "en",
    start_url: "/en/",
    scope: "/en/",
  },
  es: {
    name: "Gui Rocha — Software local, juegos y herramientas",
    short_name: "Gui Rocha",
    description: "Portafolio y catálogo de productos de Guilherme Rocha.",
    lang: "es",
    start_url: "/es/",
    scope: "/es/",
  },
};
for (const [locale, manifest] of Object.entries(localizedManifests)) {
  await writeFile(join(root, locale, "manifest.webmanifest"), `${JSON.stringify({
    ...manifest,
    display: "standalone",
    background_color: "#07100f",
    theme_color: "#07100f",
    icons: [
      { src: "/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/assets/img/brand/favicon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
    ],
  }, null, 2)}\n`, "utf8");
}

await writeFile(join(root, "404.html"), notFoundPage(), "utf8");

const sitemapUrls = [];
for (const locale of localeOrder) {
  for (const type of ["home", "about", "contact", "privacy", "sites"]) sitemapUrls.push(`${origin}${routeFor(locale, { type })}`);
  for (const project of projectsByLocale[locale]) sitemapUrls.push(`${origin}${routeFor(locale, { type: "project", slug: project.slug })}`);
  for (const site of siteContentByLocale[locale].sites.filter((item) => item.case)) {
    sitemapUrls.push(`${origin}${routeFor(locale, { type: "site", slug: site.slug })}`);
  }
}
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls.map((url) => `  <url><loc>${url}</loc></url>`).join("\n")}\n</urlset>\n`;
await writeFile(join(root, "sitemap.xml"), sitemap, "utf8");

const generatedPageCount = localeOrder.reduce((total, locale) => (
  total + 5 + projectsByLocale[locale].length + siteContentByLocale[locale].sites.filter((site) => site.case).length
), 0) + 1;
process.stdout.write(`Generated ${generatedPageCount} localized pages and sitemap.xml.\n`);
