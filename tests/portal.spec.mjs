import { errors, expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const coreRoutes = [
  "/",
  "/projetos/",
  "/projetos/clubal/",
  "/projetos/demonyza/",
  "/contato/",
  "/en/",
  "/es/",
];

const mobileRoutes = [
  "/",
  "/projetos/",
  "/projetos/clubal/",
  "/sites/",
  "/contato/",
  "/en/",
  "/es/",
];

const workMapViewports = [
  { width: 320, height: 568 },
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 844, height: 390 },
  { width: 1024, height: 768 },
  { width: 1280, height: 900 },
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1536, height: 864 },
];
const workMapLabels = {
  "/": ["Operações institucionais", "Presença digital", "Ferramentas de trabalho", "Métodos de desenvolvimento", "Projetos autorais"],
  "/en/": ["Institutional operations", "Digital presence", "Work tools", "Development methods", "Original projects"],
  "/es/": ["Operaciones institucionales", "Presencia digital", "Herramientas de trabajo", "Métodos de desarrollo", "Proyectos propios"],
};

const nestedWorkMapFixture = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="/assets/css/styles.css">
  <style>
    body { margin: 0; min-height: 100vh; background: #06111b; }
    .fixture-main { width: min(100% - 16px, 1320px); margin: 8px auto; }
  </style>
  <script src="/assets/js/about.js" defer></script>
  <title>Fixture de mapa recursivo</title>
</head>
<body>
  <main class="fixture-main">
    <section class="landscape-map work-map" data-work-map aria-labelledby="fixture-work-map-title">
      <h1 class="sr-only" id="fixture-work-map-title">Mapa recursivo</h1>
      <div class="work-map-visual" data-work-map-visual>
        <picture class="work-map-media">
          <img src="/assets/img/gui/mapa-do-trabalho-1280.webp" alt="" width="1672" height="941">
        </picture>
        <svg class="work-map-hotspots" data-work-map-hotspots viewBox="0 0 1672 941" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
          <defs><clipPath id="work-map-clip-fixture-clubal-suite" clipPathUnits="userSpaceOnUse"><rect x="700" y="250" width="320" height="360" rx="24"></rect></clipPath></defs>
          <image class="work-map-focus-image" data-work-map-focus-image data-active="false" href="/assets/img/gui/mapa-do-trabalho-1280.webp" x="0" y="0" width="1672" height="941" preserveAspectRatio="xMidYMid slice"></image>
          <g class="work-map-hotspot" data-work-map-hotspot="clubal-suite" data-work-map-effect="screen" data-work-map-clip="url(#work-map-clip-fixture-clubal-suite)" data-focus-x="860" data-focus-y="430" style="--work-map-hotspot-rgb:37 201 151">
            <rect class="work-map-hotspot-aura-shape" x="700" y="250" width="320" height="360" rx="24"></rect>
          </g>
        </svg>
        <div class="work-map-effects" data-work-map-effects aria-hidden="true"></div>
      </div>
      <nav class="work-map-nav" aria-labelledby="fixture-work-map-title" data-work-map-nav>
        <ol class="work-map-root" data-work-map-root>
          <li class="work-map-node work-map-branch" data-work-map-node data-work-map-depth="0" data-work-map-id="root-group" data-work-map-target="clubal-suite" data-category="root-group" data-index="0" data-accent-rgb="37 201 151" style="--work-map-accent:#25c997;--work-map-accent-rgb:37 201 151">
            <button class="work-map-trigger" type="button" id="fixture-root-trigger" data-work-map-trigger aria-expanded="false" aria-controls="fixture-root-panel">
              <span class="work-map-index">01</span><span class="work-map-label"><strong>Grupo raiz</strong><small>1 grupo</small></span><span class="work-map-chevron" aria-hidden="true"></span>
            </button>
            <div class="work-map-panel" id="fixture-root-panel" data-work-map-panel data-work-map-level="1" role="region" aria-labelledby="fixture-root-trigger" hidden>
              <div class="work-map-panel-heading"><button type="button" class="work-map-back" data-work-map-back>Voltar</button><strong>Grupo raiz</strong></div>
              <ul tabindex="-1">
                <li class="work-map-node work-map-branch" data-work-map-node data-work-map-depth="1" data-work-map-id="nested-group" data-work-map-target="clubal-suite" data-category="nested-group" data-index="0" data-accent-rgb="37 201 151" style="--work-map-accent:#25c997;--work-map-accent-rgb:37 201 151">
                  <button class="work-map-trigger" type="button" id="fixture-nested-trigger" data-work-map-trigger aria-expanded="false" aria-controls="fixture-nested-panel">
                    <span class="work-map-label"><strong>Subgrupo</strong><small>1 destino</small></span><span class="work-map-chevron" aria-hidden="true"></span>
                  </button>
                  <div class="work-map-panel" id="fixture-nested-panel" data-work-map-panel data-work-map-level="2" role="region" aria-labelledby="fixture-nested-trigger" hidden>
                    <div class="work-map-panel-heading"><button type="button" class="work-map-back" data-work-map-back>Voltar</button><strong>Subgrupo</strong></div>
                    <ul tabindex="-1">
                      <li class="work-map-node work-map-leaf" data-work-map-node data-work-map-depth="2" data-work-map-id="deep-leaf" data-work-map-target="clubal-suite" style="--work-map-accent:#25c997;--work-map-accent-rgb:37 201 151">
                        <a class="work-map-link" href="/projetos/clubal/" data-work-map-link><span class="work-map-label"><strong>Destino profundo</strong><small>Terceiro nível</small></span></a>
                      </li>
                    </ul>
                  </div>
                </li>
              </ul>
            </div>
          </li>
        </ol>
      </nav>
    </section>
  </main>
</body>
</html>`;

const growthWorkMapFixture = (count, locale) => {
  const language = locale === "es" ? "es" : "en";
  const density = count >= 10 ? "dense" : count >= 6 ? "many" : "standard";
  const copy = language === "es"
    ? {
      title: "Coordinación institucional ampliada",
      count: `${count} ${count === 1 ? "destino" : "destinos"}`,
      item: (index) => `Coordinación institucional segura ${index}`,
      kicker: "Navegador, tableta y móvil",
      back: "Volver",
    }
    : {
      title: "Expanded institutional coordination",
      count: `${count} ${count === 1 ? "destination" : "destinations"}`,
      item: (index) => `Operational evidence workspace ${index}`,
      kicker: "Browser, tablet and mobile",
      back: "Back",
    };
  const leaves = Array.from({ length: count }, (_, index) => `
              <li class="work-map-node work-map-leaf" data-work-map-node data-work-map-depth="1" data-work-map-id="growth-leaf-${index + 1}" data-work-map-target="clubal-suite" style="--work-map-accent:#25c997;--work-map-accent-rgb:37 201 151">
                <a class="work-map-link" href="/projetos/clubal/?growth=${index + 1}" data-work-map-link>
                  <span class="project-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 5h14v14H5z"></path></svg></span>
                  <span class="work-map-label"><strong>${copy.item(index + 1)}</strong><small>${copy.kicker}</small></span>
                  <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m9 5 7 7-7 7"></path></svg>
                </a>
              </li>`).join("");

  return `<!doctype html>
<html lang="${language}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="/assets/css/styles.css">
  <style>
    body { margin: 0; min-height: 100vh; background: #06111b; }
    .fixture-main { width: min(100% - 16px, 1320px); margin: 8px auto; }
  </style>
  <script src="/assets/js/about.js" defer></script>
  <title>Work map growth fixture</title>
</head>
<body>
  <main class="fixture-main">
    <section class="landscape-map work-map" data-work-map aria-labelledby="growth-map-title">
      <h1 class="sr-only" id="growth-map-title">${copy.title}</h1>
      <div class="work-map-visual" data-work-map-visual>
        <picture class="work-map-media"><img src="/assets/img/gui/mapa-do-trabalho-1280.webp" alt="" width="1672" height="941"></picture>
        <svg class="work-map-hotspots" data-work-map-hotspots viewBox="0 0 1672 941" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
          <defs><clipPath id="work-map-clip-growth-clubal-suite" clipPathUnits="userSpaceOnUse"><rect x="700" y="250" width="320" height="360" rx="24"></rect></clipPath></defs>
          <image class="work-map-focus-image" data-work-map-focus-image data-active="false" href="/assets/img/gui/mapa-do-trabalho-1280.webp" x="0" y="0" width="1672" height="941" preserveAspectRatio="xMidYMid slice"></image>
          <g class="work-map-hotspot" data-work-map-hotspot="clubal-suite" data-work-map-effect="screen" data-work-map-clip="url(#work-map-clip-growth-clubal-suite)" data-focus-x="860" data-focus-y="430" style="--work-map-hotspot-rgb:37 201 151"><rect class="work-map-hotspot-aura-shape" x="700" y="250" width="320" height="360" rx="24"></rect></g>
        </svg>
        <div class="work-map-effects" data-work-map-effects aria-hidden="true"></div>
      </div>
      <nav class="work-map-nav" aria-labelledby="growth-map-title" data-work-map-nav>
        <ol class="work-map-root" data-work-map-root>
          <li class="work-map-node work-map-branch" data-work-map-node data-work-map-depth="0" data-work-map-id="growth-root" data-work-map-target="clubal-suite" data-category="growth-root" data-index="0" data-accent-rgb="37 201 151" style="--work-map-accent:#25c997;--work-map-accent-rgb:37 201 151">
            <button class="work-map-trigger" type="button" id="growth-root-trigger" data-work-map-trigger aria-expanded="false" aria-controls="growth-root-panel">
              <span class="work-map-index">01</span><span class="work-map-label"><strong>${copy.title}</strong><small>${copy.count}</small></span><span class="work-map-chevron" aria-hidden="true"></span>
            </button>
            <div class="work-map-panel" id="growth-root-panel" data-work-map-panel data-work-map-level="1" data-work-map-child-count="${count}" data-work-map-density="${density}" role="region" aria-labelledby="growth-root-trigger" hidden>
              <div class="work-map-panel-heading"><button type="button" class="work-map-back" data-work-map-back>${copy.back}</button><strong>${copy.title}</strong></div>
              <ul tabindex="-1">${leaves}
              </ul>
            </div>
          </li>
        </ol>
        <p class="sr-only" aria-live="polite" data-work-map-live></p>
      </nav>
    </section>
  </main>
</body>
</html>`;
};

const growthPanelMetrics = async (page) => page.evaluate(() => {
  const map = document.querySelector("[data-work-map]");
  const panel = document.querySelector("[data-work-map-panel]");
  const list = panel.querySelector(":scope > ul");
  const links = [...list.querySelectorAll(":scope > [data-work-map-node] > [data-work-map-link]")];
  const rectangle = (element) => {
    const bounds = element.getBoundingClientRect();
    return { left: bounds.left, top: bounds.top, right: bounds.right, bottom: bounds.bottom, width: bounds.width, height: bounds.height };
  };
  const linkMetrics = links.map((link) => {
    const label = link.querySelector(".work-map-label");
    const strong = label.querySelector("strong");
    const small = label.querySelector("small");
    return {
      link: rectangle(link),
      label: rectangle(label),
      clientHeight: link.clientHeight,
      scrollHeight: link.scrollHeight,
      strongClientHeight: strong.clientHeight,
      strongScrollHeight: strong.scrollHeight,
      smallClientHeight: small.clientHeight,
      smallScrollHeight: small.scrollHeight,
    };
  });
  return {
    map: rectangle(map),
    panel: rectangle(panel),
    list: rectangle(list),
    listClientHeight: list.clientHeight,
    listScrollHeight: list.scrollHeight,
    pageOverflow: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - innerWidth,
    columns: new Set(linkMetrics.map(({ link }) => Math.round(link.left * 10) / 10)).size,
    linkMetrics,
  };
});

const localizedProjectRoutes = [
  "/projetos/clubal/",
  "/projetos/maeve/",
  "/projetos/demonyza/",
  "/projetos/codex-checkpoint/",
  "/projetos/nexus/",
  "/projetos/local-first-checklist/",
  "/projetos/c7-engineering-system/",
  "/sites/clubal/",
  "/en/projects/clubal/",
  "/en/projects/maeve/",
  "/en/projects/demonyza/",
  "/en/projects/codex-checkpoint/",
  "/en/projects/nexus/",
  "/en/projects/local-first-checklist/",
  "/en/projects/c7-engineering-system/",
  "/en/sites/clubal/",
  "/es/proyectos/clubal/",
  "/es/proyectos/maeve/",
  "/es/proyectos/demonyza/",
  "/es/proyectos/codex-checkpoint/",
  "/es/proyectos/nexus/",
  "/es/proyectos/local-first-checklist/",
  "/es/proyectos/c7-engineering-system/",
  "/es/sitios/clubal/",
];

const editorialTokens = (value) => new Set(value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .split(/[^a-z0-9]+/)
  .filter((token) => token.length >= 4));

const editorialSimilarity = (left, right) => {
  const leftTokens = editorialTokens(left);
  const rightTokens = editorialTokens(right);
  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const union = new Set([...leftTokens, ...rightTokens]).size;
  return union ? intersection / union : 0;
};

const acceptEssentialStorage = async (page) => {
  const button = page.locator('[data-cookie-banner] [data-consent="essential"]');
  if (await button.isVisible()) {
    await button.click();
    await expect(page.locator("[data-cookie-banner]")).toBeHidden();
  }
};

const navigationCommitTimeoutMs = 10_000;

const navigationTarget = (page, route) => {
  if (/^[a-z][a-z\d+.-]*:/i.test(route)) return new URL(route).href;
  const baseUrl = test.info().project.use.baseURL;
  if (!baseUrl) throw new Error(`Base URL ausente para navegar até ${route}`);
  return new URL(route, baseUrl).href;
};

const navigateWithVerifiedCommit = async (page, route, navigate) => {
  const expectedHref = navigationTarget(page, route);
  const previousTimeOrigin = await page.evaluate(() => performance.timeOrigin);
  let response;
  try {
    response = await navigate({ waitUntil: "commit", timeout: navigationCommitTimeoutMs });
  } catch (error) {
    if (!(error instanceof errors.TimeoutError)) throw error;
    const documentState = await page.evaluate(() => ({
      href: window.location.href,
      readyState: document.readyState,
      timeOrigin: performance.timeOrigin,
    }));
    if (
      documentState.href !== expectedHref
      || documentState.readyState !== "complete"
      || documentState.timeOrigin === previousTimeOrigin
    ) throw error;

    let synchronizedResponse;
    try {
      synchronizedResponse = await page.goto(expectedHref, {
        waitUntil: "commit",
        timeout: navigationCommitTimeoutMs,
      });
      if (!synchronizedResponse || synchronizedResponse.status() >= 400) throw error;
      await page.waitForFunction(() => document.readyState !== "loading");
      if (page.url() !== expectedHref) throw error;
      await page.locator("html").waitFor({ state: "attached", timeout: navigationCommitTimeoutMs });
    } catch {
      throw error;
    }
    console.warn(`[playwright] driver navigation resynchronized for ${expectedHref}`);
    return synchronizedResponse;
  }
  await page.waitForFunction(() => document.readyState !== "loading");
  if (page.url() !== expectedHref) {
    throw new Error(`Navegação terminou em ${page.url()}, esperado ${expectedHref}`);
  }
  return response;
};

const openRoute = async (page, route) => {
  return navigateWithVerifiedCommit(page, route, (options) => page.goto(route, options));
};

const reloadRoute = async (page) => {
  const route = await page.evaluate(() => window.location.href);
  return navigateWithVerifiedCommit(page, route, (options) => page.reload(options));
};

test("navigation helper resynchronizes a loaded document when the commit signal is lost", async ({ page }) => {
  const originalGoto = page.goto.bind(page);
  let navigationCount = 0;
  page.goto = async (route, options) => {
    navigationCount += 1;
    const response = await originalGoto(route, options);
    if (navigationCount === 1) {
      await page.waitForFunction(() => document.readyState === "complete");
      throw new errors.TimeoutError(`page.goto: Timeout ${navigationCommitTimeoutMs}ms exceeded.`);
    }
    return response;
  };
  try {
    const response = await openRoute(page, "/");
    expect(response?.status()).toBeLessThan(400);
    expect(navigationCount).toBe(2);
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator("h1")).toBeVisible();
  } finally {
    page.goto = originalGoto;
  }
});

test("all sitemap routes are healthy, singular and free of runtime errors", async ({ page }) => {
  const sitemapResponse = await page.request.get("/sitemap.xml");
  expect(sitemapResponse.status()).toBe(200);
  const sitemap = await sitemapResponse.text();
  const routes = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((match) => new URL(match[1]).pathname);
  expect(routes).toHaveLength(39);

  let errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push("console: " + message.text());
  });
  page.on("pageerror", (error) => errors.push("pageerror: " + error.message));

  for (const route of routes) {
    errors = [];
    const response = await openRoute(page, route);
    expect([200, 304], route).toContain(response?.status());
    expect(await page.locator("h1").count(), route).toBe(1);
    await expect(page.locator("html"), route).toHaveAttribute("lang", /^(?:pt-BR|en|es)$/);
    await expect(page.locator('meta[name="description"]'), route).toHaveCount(1);
    await expect(page.locator('meta[property="og:image"]'), route).toHaveCount(1);
    await expect(page.locator('meta[property="og:image:type"]'), route).toHaveCount(1);
    await expect(page.locator('meta[name="twitter:image"]'), route).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]'), route).toHaveCount(1);
    expect(errors, route + " emitted runtime errors").toEqual([]);
  }
});

test("security headers, permanent redirects and localized 404 work locally", async ({ request }) => {
  const response = await request.get("/");
  expect(response.status()).toBe(200);
  const headers = response.headers();
  expect(headers["content-security-policy"]).toContain("default-src 'self'");
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["cross-origin-opener-policy"]).toBe("same-origin");
  expect(headers["cross-origin-resource-policy"]).toBe("same-origin");
  expect(headers["permissions-policy"]).toContain("camera=()");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");

  const redirect = await request.get("/clubal?origem=qa", { maxRedirects: 0 });
  expect(redirect.status()).toBe(301);
  expect(redirect.headers().location).toBe("/projetos/clubal/?origem=qa");

  for (const route of ["/nao-existe-qa", "/en/not-found-qa", "/es/no-existe-qa"]) {
    const missing = await request.get(route);
    expect(missing.status(), route).toBe(404);
    expect(missing.headers()["cache-control"], route).toContain("no-store");
    const body = await missing.text();
    expect(body, route).toContain('name="robots" content="noindex');
    if (route.startsWith("/en/")) expect(body).toContain('<html lang="en"');
    if (route.startsWith("/es/")) expect(body).toContain('<html lang="es"');
  }
});

test("protected media blocks contextual extraction gestures without disabling the page context menu", async ({ page }) => {
  await openRoute(page, "/");
  const protectedImage = page.locator("img[data-protected-media]").first();
  await expect(protectedImage).toHaveAttribute("draggable", "false");
  await expect.poll(() => protectedImage.evaluate((image) => image.complete && image.naturalWidth > 0)).toBe(true);

  const mediaEvents = await protectedImage.evaluate((image) => ({
    contextMenuAllowed: image.dispatchEvent(new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
      button: 2,
    })),
    dragAllowed: image.dispatchEvent(new Event("dragstart", {
      bubbles: true,
      cancelable: true,
    })),
  }));
  expect(mediaEvents).toEqual({ contextMenuAllowed: false, dragAllowed: false });

  const pageContextMenuAllowed = await page.locator("h1").evaluate((heading) => heading.dispatchEvent(new MouseEvent("contextmenu", {
    bubbles: true,
    cancelable: true,
    button: 2,
  })));
  expect(pageContextMenuAllowed).toBe(true);
});

test("mobile layouts keep the header visible and actionable throughout scrolling", async ({ page }) => {
  test.setTimeout(120_000);
  const scenarios = [
    { viewport: { width: 320, height: 568 }, routes: mobileRoutes },
    { viewport: { width: 390, height: 844 }, routes: mobileRoutes },
    { viewport: { width: 844, height: 390 }, routes: ["/"] },
  ];
  let runtimeErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") runtimeErrors.push("console: " + message.text());
  });
  page.on("pageerror", (error) => runtimeErrors.push("pageerror: " + error.message));

  for (const { viewport, routes } of scenarios) {
    await page.setViewportSize(viewport);
    for (const route of routes) {
      runtimeErrors = [];
      await openRoute(page, route);
      await acceptEssentialStorage(page);

      const pageGeometry = await page.evaluate(() => ({
        scrollHeight: document.documentElement.scrollHeight,
        viewportHeight: innerHeight,
      }));
      expect(pageGeometry.scrollHeight, route + " should remain scrollable").toBeGreaterThan(pageGeometry.viewportHeight);

      const maxScroll = pageGeometry.scrollHeight - pageGeometry.viewportHeight;
      const positions = [...new Set([
        0,
        Math.min(maxScroll, pageGeometry.viewportHeight * 2),
        Math.round(maxScroll / 2),
        maxScroll,
      ])];

      for (const y of positions) {
        await page.evaluate((scrollY) => new Promise((resolve) => {
          window.scrollTo(0, scrollY);
          requestAnimationFrame(() => requestAnimationFrame(resolve));
        }), y);
        const header = await page.locator(".site-header").evaluate((element) => {
          const rectangle = element.getBoundingClientRect();
          const controls = [
            element.querySelector('[data-site-nav="projects"]'),
            element.querySelector(".language-switcher summary"),
            element.querySelector("[data-open-accessibility]"),
            element.querySelector("[data-theme-toggle]"),
          ].filter(Boolean);
          return {
            position: getComputedStyle(element).position,
            top: rectangle.top,
            bottom: rectangle.bottom,
            viewportHeight: innerHeight,
            controls: controls.map((control) => {
              const controlRectangle = control.getBoundingClientRect();
              const x = controlRectangle.left + controlRectangle.width / 2;
              const y = controlRectangle.top + controlRectangle.height / 2;
              return {
                insideViewport: x >= 0 && x <= innerWidth && y >= 0 && y <= innerHeight,
              };
            }),
          };
        });
        expect(header.position, `${route} at ${viewport.width}x${viewport.height}`).toBe("sticky");
        expect(header.top, `${route} at scroll ${y}`).toBeGreaterThanOrEqual(0);
        expect(header.top, `${route} at scroll ${y}`).toBeLessThanOrEqual(24);
        expect(header.bottom, `${route} header within viewport`).toBeLessThan(header.viewportHeight);
        expect(header.controls, `${route} controls at scroll ${y}`).toEqual([
          { insideViewport: true },
          { insideViewport: true },
          { insideViewport: true },
          { insideViewport: true },
        ]);
        for (const selector of [
          '[data-site-nav="projects"]',
          ".language-switcher summary",
          "[data-open-accessibility]",
          "[data-theme-toggle]",
        ]) {
          await page.locator(`.site-header ${selector}`).click({ trial: true });
        }
      }

      if (route === "/") {
        const themeBefore = await page.locator("html").getAttribute("data-theme");
        await page.locator("[data-theme-toggle]").click();
        await expect.poll(() => page.locator("html").getAttribute("data-theme")).not.toBe(themeBefore);

        const accessibilityButton = page.locator("[data-open-accessibility]");
        await accessibilityButton.click();
        await expect(page.locator("#accessibility-panel")).toHaveJSProperty("open", true);
        await page.keyboard.press("Escape");
        await expect(page.locator("#accessibility-panel")).toHaveJSProperty("open", false);
        await expect(accessibilityButton).toBeFocused();

        const languageSwitcher = page.locator(".language-switcher");
        await languageSwitcher.locator("summary").click();
        await expect(languageSwitcher).toHaveJSProperty("open", true);
        await page.keyboard.press("Escape");
        await expect(languageSwitcher).toHaveJSProperty("open", false);

        const navigation = page.locator('[data-site-nav="contact"]');
        const targetPath = new URL(String(await navigation.getAttribute("href")), page.url()).pathname;
        await navigation.click();
        await page.waitForFunction((path) => location.pathname === path, targetPath);
        expect(new URL(page.url()).pathname).toBe(targetPath);
      }
      expect(runtimeErrors, `${route} at ${viewport.width}x${viewport.height} emitted runtime errors`).toEqual([]);
    }
  }
});

test("work map supports hover tolerance, keyboard dismissal and focus return", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openRoute(page, "/");
  await acceptEssentialStorage(page);
  const map = page.locator("[data-work-map]");
  const trigger = page.locator("[data-work-map-trigger]").first();
  const panel = page.locator("[data-work-map-panel]").first();
  const effects = map.locator("[data-work-map-effects]");
  const hotspotLayer = map.locator("[data-work-map-hotspots]");
  const focusImage = hotspotLayer.locator("[data-work-map-focus-image]");
  await expect(effects).toHaveAttribute("aria-hidden", "true");
  await expect(effects.locator(".work-map-particle")).toHaveCount(7);
  await expect(hotspotLayer).toHaveAttribute("aria-hidden", "true");
  await expect(hotspotLayer).toHaveAttribute("focusable", "false");
  await expect(hotspotLayer).toHaveAttribute("viewBox", "0 0 1672 941");
  await expect(hotspotLayer).toHaveAttribute("preserveAspectRatio", "xMidYMid meet");
  await expect(focusImage).toHaveCount(1);
  await expect(focusImage).toHaveAttribute("data-active", "false");
  await expect(hotspotLayer.locator("clipPath")).toHaveCount(9);
  await expect(hotspotLayer.locator(".work-map-hotspot-orbit")).toHaveCount(10);
  expect((await hotspotLayer.locator("[data-work-map-hotspot]").evaluateAll((nodes) => (
    nodes.map((node) => node.getAttribute("data-work-map-hotspot")).sort()
  )))).toEqual([
    "c7-system-map",
    "clubal-suite",
    "codex-note",
    "engineering-notebooks",
    "local-first-notebook",
    "maeve-tablet",
    "nexus-note",
    "sites-note",
    "tooling-cluster",
  ]);
  await trigger.scrollIntoViewIfNeeded();
  const initialBox = await trigger.boundingBox();

  await trigger.hover();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(panel).toBeVisible();
  await expect(panel).not.toHaveAttribute("inert", "");
  await expect(map).toHaveAttribute("data-work-map-reactive", "true");
  await expect(map).toHaveAttribute("data-work-map-burst", "false");
  await expect(map).toHaveAttribute("data-work-map-target-active", "clubal-suite");
  await expect(map).toHaveAttribute("data-work-map-effect-active", "screen");
  await expect(hotspotLayer.locator('[data-work-map-hotspot="clubal-suite"]')).toHaveAttribute("data-active", "true");
  await expect(focusImage).toHaveAttribute("data-active", "true");
  await expect(focusImage).toHaveAttribute("data-work-map-effect", "screen");
  await expect(focusImage).toHaveAttribute("clip-path", "url(#work-map-clip-pt-br-clubal-suite)");
  expect(await page.evaluate(() => {
    const base = document.querySelector(".work-map-media img");
    const focus = document.querySelector("[data-work-map-focus-image]");
    return Boolean(base?.currentSrc && focus?.getAttribute("href") === base.currentSrc);
  })).toBe(true);
  await trigger.click();
  await expect(map).toHaveAttribute("data-work-map-burst", "true");
  await expect(map).toHaveCSS("--work-map-effect-rgb", "37 201 151");
  await expect(page.locator("html")).toHaveAttribute("data-ambient-source", "work-map");
  const activeBox = await trigger.boundingBox();
  expect(activeBox?.x).toBeCloseTo(initialBox?.x ?? 0, 1);
  expect(activeBox?.y).toBeCloseTo(initialBox?.y ?? 0, 1);
  expect(activeBox?.width).toBeCloseTo(initialBox?.width ?? 0, 1);
  expect(activeBox?.height).toBeCloseTo(initialBox?.height ?? 0, 1);

  const panelBox = await panel.boundingBox();
  const mapBox = await map.boundingBox();
  expect(panelBox?.x ?? -1).toBeGreaterThanOrEqual((mapBox?.x ?? 0) - 1);
  expect((panelBox?.x ?? 0) + (panelBox?.width ?? 0)).toBeLessThanOrEqual((mapBox?.x ?? 0) + (mapBox?.width ?? 0) + 1);

  await page.mouse.move(
    (panelBox?.x ?? 0) + ((panelBox?.width ?? 0) / 2),
    (panelBox?.y ?? 0) + ((panelBox?.height ?? 0) / 2),
  );
  await page.waitForTimeout(400);
  await expect(trigger).toHaveAttribute("aria-expanded", "true");

  const secondTrigger = page.locator("[data-work-map-trigger]").nth(1);
  await secondTrigger.hover();
  await expect(secondTrigger).toHaveAttribute("aria-expanded", "true");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator('[data-work-map-trigger][aria-expanded="true"]')).toHaveCount(1);
  await page.waitForTimeout(50);
  await expect(map).toHaveAttribute("data-work-map-reactive", "true");
  await expect(map).toHaveCSS("--work-map-effect-rgb", "79 140 255");
  await expect(map).toHaveAttribute("data-work-map-target-active", "sites-note");
  await expect(map).toHaveAttribute("data-work-map-effect-active", "ink");
  await expect(hotspotLayer.locator('[data-work-map-hotspot="sites-note"]')).toHaveAttribute("data-active", "true");
  await expect(focusImage).toHaveAttribute("data-work-map-effect", "ink");
  await expect(focusImage).toHaveAttribute("clip-path", "url(#work-map-clip-pt-br-sites-note)");

  const secondBox = await secondTrigger.boundingBox();
  await page.mouse.move((secondBox?.x ?? 0) + (secondBox?.width ?? 0) / 2, (secondBox?.y ?? 0) + (secondBox?.height ?? 0) + 30);
  await page.waitForTimeout(600);
  await expect(secondTrigger).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("[data-work-map-panel]").nth(1)).toBeHidden();

  const keyboardTrigger = page.locator("[data-work-map-trigger]").nth(2);
  await keyboardTrigger.focus();
  const keyboardPanel = page.locator("[data-work-map-panel]").nth(2);
  await expect(keyboardTrigger).toHaveAttribute("aria-expanded", "true");
  await expect(keyboardPanel).toBeVisible();
  const firstPanelLink = keyboardPanel.locator("a").first();
  if (testInfo.project.name === "webkit") {
    expect(await firstPanelLink.evaluate((link) => {
      link.focus();
      return document.activeElement === link;
    })).toBe(true);
  } else {
    await page.keyboard.press("Tab");
    await expect(firstPanelLink).toBeFocused();
  }
  await page.waitForTimeout(120);
  await expect(map).toHaveAttribute("data-work-map-target-active", "nexus-note");
  await expect(map).toHaveAttribute("data-work-map-effect-active", "ink");
  await expect(hotspotLayer.locator('[data-work-map-hotspot="nexus-note"]')).toHaveAttribute("data-active", "true");
  await expect(focusImage).toHaveAttribute("clip-path", "url(#work-map-clip-pt-br-nexus-note)");
  await page.keyboard.press("Escape");
  await expect(keyboardTrigger).toHaveAttribute("aria-expanded", "false");
  await expect(keyboardPanel).toHaveAttribute("inert", "");
  await expect(keyboardTrigger).toBeFocused();
  await keyboardTrigger.press("Enter");
  await expect(keyboardTrigger).toHaveAttribute("aria-expanded", "true");
  await keyboardTrigger.press("Space");
  await expect(keyboardTrigger).toHaveAttribute("aria-expanded", "false");
  await keyboardTrigger.press("ArrowRight");
  await expect(keyboardTrigger).toHaveAttribute("aria-expanded", "true");
  await expect(firstPanelLink).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(keyboardTrigger).toHaveAttribute("aria-expanded", "false");
  await expect(keyboardTrigger).toBeFocused();

  const maeveTrigger = page.locator("[data-work-map-trigger]").nth(4);
  await maeveTrigger.hover();
  await expect(maeveTrigger).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator('[data-work-map-trigger][aria-expanded="true"]')).toHaveCount(1);
  await expect(map).toHaveAttribute("data-work-map-target-active", "maeve-tablet");
  await expect(map).toHaveAttribute("data-work-map-effect-active", "screen");
  await expect(hotspotLayer.locator('[data-work-map-hotspot="maeve-tablet"]')).toHaveAttribute("data-active", "true");
  await expect(focusImage).toHaveAttribute("data-work-map-effect", "screen");
  await expect(focusImage).toHaveAttribute("clip-path", "url(#work-map-clip-pt-br-maeve-tablet)");
});

test("work map preserves keyboard intent across synthetic hover after reflow", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openRoute(page, "/");
  const institutionalBranch = page.locator('[data-work-map-depth="0"]').first();
  const institutionalTrigger = institutionalBranch.locator(":scope > [data-work-map-trigger]");
  const toolingTrigger = page.locator("[data-work-map-trigger]").nth(2);
  const maeveTrigger = page.locator("[data-work-map-trigger]").nth(4);
  const institutionalBox = await institutionalBranch.boundingBox();
  const syntheticPointer = {
    x: (institutionalBox?.x ?? 0) + 1,
    y: (institutionalBox?.y ?? 0) + 1,
  };

  await toolingTrigger.evaluate((trigger, pointer) => {
    trigger.focus();
    trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }));
    const sibling = document.querySelector('[data-work-map-depth="0"]');
    sibling?.dispatchEvent(new PointerEvent("pointerenter", {
      pointerType: "mouse",
      clientX: pointer.x,
      clientY: pointer.y,
    }));
  }, syntheticPointer);
  await expect(toolingTrigger).toHaveAttribute("aria-expanded", "true");
  await expect(institutionalTrigger).toHaveAttribute("aria-expanded", "false");

  await maeveTrigger.hover();
  await expect(maeveTrigger).toHaveAttribute("aria-expanded", "true");
  await expect(toolingTrigger).toHaveAttribute("aria-expanded", "false");
});

test("work map bounds screen awakening and circular ink motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await openRoute(page, "/");
  await acceptEssentialStorage(page);
  const map = page.locator("[data-work-map]");
  await map.scrollIntoViewIfNeeded();

  const toolingTrigger = map.locator("[data-work-map-trigger]").nth(2);
  const orbit = map.locator('[data-work-map-hotspot="tooling-cluster"] .work-map-hotspot-orbit-primary .work-map-hotspot-orbit-shape').first();
  await orbit.evaluate((shape) => {
    globalThis.__workMapOrbitOffsets = [];
    globalThis.__workMapOrbitObserver = new MutationObserver(() => {
      const offset = shape.style.strokeDashoffset;
      if (offset) globalThis.__workMapOrbitOffsets.push(offset);
    });
    globalThis.__workMapOrbitObserver.observe(shape, { attributes: true, attributeFilter: ["style"] });
  });
  await toolingTrigger.click();
  await expect(map).toHaveAttribute("data-work-map-effect-active", "ink");
  await expect(orbit).not.toHaveAttribute("transform", /^rotate\(/);
  await expect.poll(() => page.evaluate(() => new Set(globalThis.__workMapOrbitOffsets).size)).toBeGreaterThan(1);
  await page.waitForTimeout(900);
  await expect(map).toHaveAttribute("data-work-map-burst", "false");
  await expect.poll(() => orbit.evaluate((shape) => shape.style.strokeDashoffset)).toBe("");
  await page.evaluate(() => {
    globalThis.__workMapOrbitObserver?.disconnect();
    delete globalThis.__workMapOrbitObserver;
    delete globalThis.__workMapOrbitOffsets;
  });

  const maeveTrigger = map.locator("[data-work-map-trigger]").nth(4);
  await maeveTrigger.click();
  const focusImage = map.locator("[data-work-map-focus-image]");
  await expect(map).toHaveAttribute("data-work-map-effect-active", "screen");
  await expect(focusImage).toHaveAttribute("clip-path", "url(#work-map-clip-pt-br-maeve-tablet)");
  await expect(focusImage).toHaveCSS("animation-name", "work-map-screen-awaken");
  await page.waitForTimeout(1100);
  await expect(map).toHaveAttribute("data-work-map-burst", "false");
  await expect(focusImage).toHaveCSS("animation-name", "none");

  await page.setViewportSize({ width: 390, height: 844 });
  const compactToolingTrigger = map.locator("[data-work-map-trigger]").nth(2);
  await compactToolingTrigger.click();
  await expect(map).toHaveAttribute("data-work-map-effect-active", "ink");
  await expect(map.locator("[data-work-map-focus-image]")).toHaveCSS("opacity", "0.18");
  await expect(map.locator(".work-map-hotspot-orbit-primary").first()).toHaveCSS("display", "none");
  await expect(map.locator(".work-map-hotspot-orbit-secondary").first()).toHaveCSS("display", "none");
});

test("work map supports first tap, second tap and outside dismissal", async ({ browser }) => {
  const baseURL = String(test.info().project.use.baseURL);
  const context = await browser.newContext({
    baseURL,
    hasTouch: true,
    viewport: { width: 390, height: 844 },
  });
  try {
    const page = await context.newPage();
    await openRoute(page, "/");
    await acceptEssentialStorage(page);
    const trigger = page.locator("[data-work-map-trigger]").first();
    await trigger.tap();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await trigger.tap();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await trigger.tap();
    const secondTrigger = page.locator("[data-work-map-trigger]").nth(1);
    await secondTrigger.tap();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(secondTrigger).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator('[data-work-map-trigger][aria-expanded="true"]')).toHaveCount(1);
    await secondTrigger.tap();
    await expect(secondTrigger).toHaveAttribute("aria-expanded", "false");
    await trigger.dispatchEvent("pointerdown", { pointerType: "pen", clientX: 24, clientY: 24 });
    await trigger.dispatchEvent("click", { detail: 1 });
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await trigger.dispatchEvent("pointerdown", { pointerType: "pen", clientX: 24, clientY: 24 });
    await trigger.dispatchEvent("click", { detail: 1 });
    await expect(trigger).toHaveAttribute("aria-expanded", "false");

    await page.evaluate(() => {
      const [firstTrigger, secondMapTrigger] = document.querySelectorAll("[data-work-map-trigger]");
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Shift", bubbles: true }));
      firstTrigger.focus();
      secondMapTrigger.focus();
      secondMapTrigger.click();
      firstTrigger.dispatchEvent(new PointerEvent("pointerdown", {
        pointerType: "pen",
        clientX: 24,
        clientY: 24,
        bubbles: true,
      }));
      firstTrigger.dispatchEvent(new MouseEvent("click", { detail: 1, bubbles: true }));
    });
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await page.waitForTimeout(400);
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await trigger.tap();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");

    await trigger.tap();
    await page.locator("h1").tap();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await trigger.tap();
    await page.locator("[data-work-map-panel]").first().locator("a").tap();
    await expect(page).toHaveURL(/\/projetos\/clubal\/$/);
  } finally {
    await context.close();
  }

  const hybridContext = await browser.newContext({
    baseURL,
    viewport: { width: 1440, height: 900 },
  });
  try {
    const hybridPage = await hybridContext.newPage();
    await openRoute(hybridPage, "/");
    await acceptEssentialStorage(hybridPage);
    const penTrigger = hybridPage.locator("[data-work-map-trigger]").first();
    await penTrigger.dispatchEvent("pointerdown", { pointerType: "pen", clientX: 48, clientY: 48 });
    await penTrigger.focus();
    await expect(penTrigger).toHaveAttribute("aria-expanded", "false");
    await penTrigger.dispatchEvent("click", { detail: 1 });
    await expect(penTrigger).toHaveAttribute("aria-expanded", "true");
    await penTrigger.dispatchEvent("pointerdown", { pointerType: "pen", clientX: 48, clientY: 48 });
    await penTrigger.dispatchEvent("pointermove", { pointerType: "mouse", clientX: 48, clientY: 48 });
    await penTrigger.dispatchEvent("pointerenter", { pointerType: "mouse", clientX: 48, clientY: 48 });
    await expect(penTrigger).toHaveAttribute("aria-expanded", "true");
    await hybridPage.locator("body").dispatchEvent("pointermove", {
      pointerType: "mouse",
      clientX: 96,
      clientY: 96,
    });
    await penTrigger.dispatchEvent("click", { detail: 1 });
    await expect(penTrigger).toHaveAttribute("aria-expanded", "false");

    const retargetedTouchTrigger = hybridPage.locator("[data-work-map-trigger]").nth(1);
    await retargetedTouchTrigger.dispatchEvent("pointerdown", {
      pointerType: "touch",
      pointerId: 17,
      clientX: 128,
      clientY: 128,
    });
    await retargetedTouchTrigger.dispatchEvent("pointerup", {
      pointerType: "touch",
      pointerId: 17,
      clientX: 128,
      clientY: 128,
    });
    await penTrigger.evaluate((trigger) => trigger.dispatchEvent(new PointerEvent("click", {
      pointerType: "touch",
      detail: 1,
      bubbles: true,
      cancelable: true,
    })));
    await expect(retargetedTouchTrigger).toHaveAttribute("aria-expanded", "true");
    await expect(penTrigger).toHaveAttribute("aria-expanded", "false");
  } finally {
    await hybridContext.close();
  }
});

test("work map keeps its mobile fallback without ResizeObserver or container queries", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "A ausência das APIs é simulada uma vez no Chromium.");
  const runtimeErrors = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(window, "ResizeObserver", { configurable: true, value: undefined });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await openRoute(page, "/");
  await page.locator(".landscape-map").evaluate((element) => {
    element.style.setProperty("container-type", "normal", "important");
  });
  await acceptEssentialStorage(page);
  const map = page.locator("[data-work-map]");
  const nav = map.locator("[data-work-map-nav]");
  await expect(map).toHaveAttribute("data-work-map-mode", "mobile");
  const [mapBox, navBox] = await Promise.all([map.boundingBox(), nav.boundingBox()]);
  expect(navBox?.width ?? Infinity).toBeLessThanOrEqual((mapBox?.width ?? 0) + 1);
  const trigger = map.locator("[data-work-map-trigger]").first();
  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(map.locator("[data-work-map-panel]").first()).toBeVisible();
  expect(runtimeErrors).toEqual([]);
});

test("work map keeps dense desktop destinations reachable without container queries, dvh or ResizeObserver", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "O fallback de CSS legado é simulado uma vez no Chromium.");
  await page.addInitScript(() => {
    Object.defineProperty(window, "ResizeObserver", { configurable: true, value: undefined });
  });
  await page.route("**/assets/css/styles.css", async (route) => {
    const response = await route.fetch();
    const cssWithoutDynamicViewportUnits = (await response.text()).replace(
      /^\s*max-height:\s*min\([^;\n]*dvh[^;\n]*;\s*$/gim,
      "",
    );
    await route.fulfill({ response, body: cssWithoutDynamicViewportUnits });
  });
  await page.route("**/work-map-old-browser.html", (route) => route.fulfill({
    status: 200,
    contentType: "text/html; charset=utf-8",
    body: growthWorkMapFixture(12, "en"),
  }));
  await page.setViewportSize({ width: 1440, height: 900 });
  await openRoute(page, "/work-map-old-browser.html");
  await page.addStyleTag({ content: ".landscape-map { container-type: normal !important; }" });
  const trigger = page.locator("#growth-root-trigger");
  const panel = page.locator("#growth-root-panel");
  const list = panel.locator(":scope > ul");
  const links = list.locator(":scope > [data-work-map-node] > [data-work-map-link]");
  await trigger.click();
  await expect(panel).toBeVisible();
  await expect(list).toHaveCSS("max-height", "340px");
  const metrics = await growthPanelMetrics(page);
  expect(metrics.columns, "legacy desktop keeps the safe single-column fallback").toBe(1);
  expect(metrics.listScrollHeight, "legacy desktop uses internal scrolling").toBeGreaterThan(metrics.listClientHeight + 1);
  expect(metrics.panel.bottom, "legacy desktop panel remains inside the mural").toBeLessThanOrEqual(metrics.map.bottom + 1);
  expect(metrics.pageOverflow, "legacy desktop has no horizontal overflow").toBeLessThanOrEqual(1);
  const lastLink = links.last();
  await lastLink.scrollIntoViewIfNeeded();
  const lastAccess = await lastLink.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const listBounds = element.closest("ul").getBoundingClientRect();
    return bounds.top >= listBounds.top - 1 && bounds.bottom <= listBounds.bottom + 1;
  });
  expect(lastAccess, "legacy desktop can reach the twelfth destination").toBe(true);
});

test("work map stays aligned and contained across the required viewport matrix", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "A matriz geométrica é coberta no Chromium; os fluxos rodam nos três motores.");
  test.setTimeout(120_000);

  for (const viewport of workMapViewports) {
    const { width, height } = viewport;
    await page.setViewportSize(viewport);
    await openRoute(page, "/");
    await acceptEssentialStorage(page);
    const map = page.locator("[data-work-map]");
    await map.scrollIntoViewIfNeeded();
    await expect(map).toHaveAttribute("data-work-map-mode", /^(?:wide|compact|mobile)$/);
    const mode = await map.getAttribute("data-work-map-mode");
    const overflow = await page.evaluate(() => Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - innerWidth);
    expect(overflow, `${width}x${height} horizontal overflow`).toBeLessThanOrEqual(1);
    const image = map.locator(".work-map-media img");
    await expect(image).toHaveAttribute("width", "1672");
    await expect(image).toHaveAttribute("height", "941");
    expect(await image.evaluate((element) => element.currentSrc)).toContain("/assets/img/gui/mapa-do-trabalho-");

    const geometry = await page.locator("[data-work-map-trigger]").evaluateAll((buttons) => buttons.map((button) => {
      const box = button.getBoundingClientRect();
      return { x: box.x, y: box.y, width: box.width, height: box.height };
    }));
    expect(geometry).toHaveLength(5);
    expect(Math.max(...geometry.map((item) => item.x)) - Math.min(...geometry.map((item) => item.x)), `${width}px root column axis`).toBeLessThanOrEqual(1);
    expect(Math.max(...geometry.map((item) => item.height)) - Math.min(...geometry.map((item) => item.height)), `${width}px root button height harmony`).toBeLessThanOrEqual(1);
    for (let index = 1; index < geometry.length; index += 1) {
      expect(geometry[index].y, `${width}px root order`).toBeGreaterThan(geometry[index - 1].y);
    }

    for (let index = 0; index < 5; index += 1) {
      const trigger = page.locator("[data-work-map-trigger]").nth(index);
      const panel = page.locator("[data-work-map-panel]").nth(index);
      const initialTriggerBox = await trigger.boundingBox();
      if (mode === "mobile") await trigger.click();
      else await trigger.hover();
      await expect(trigger).toHaveAttribute("aria-expanded", "true");
      await expect(panel).toBeVisible();
      const openTriggerBox = await trigger.boundingBox();
      expect(openTriggerBox?.x, `${width}px trigger ${index} x`).toBeCloseTo(initialTriggerBox?.x ?? 0, 1);
      expect(openTriggerBox?.width, `${width}px trigger ${index} width`).toBeCloseTo(initialTriggerBox?.width ?? 0, 1);
      expect(openTriggerBox?.height, `${width}px trigger ${index} height`).toBeCloseTo(initialTriggerBox?.height ?? 0, 1);

      const mapBox = await map.boundingBox();
      const panelBox = await panel.boundingBox();
      expect(panelBox?.x ?? -1, `${width}px panel ${index} left`).toBeGreaterThanOrEqual((mapBox?.x ?? 0) - 1);
      expect(panelBox?.y ?? -1, `${width}px panel ${index} top`).toBeGreaterThanOrEqual((mapBox?.y ?? 0) - 1);
      expect((panelBox?.x ?? 0) + (panelBox?.width ?? 0), `${width}px panel ${index} right`).toBeLessThanOrEqual((mapBox?.x ?? 0) + (mapBox?.width ?? 0) + 1);
      expect((panelBox?.y ?? 0) + (panelBox?.height ?? 0), `${width}px panel ${index} bottom`).toBeLessThanOrEqual((mapBox?.y ?? 0) + (mapBox?.height ?? 0) + 1);

      const panelButtonHeights = await panel.locator(":scope > ul > [data-work-map-node] > :is([data-work-map-trigger], [data-work-map-link])").evaluateAll((buttons) => buttons.map((button) => button.getBoundingClientRect().height));
      if (panelButtonHeights.length > 1) {
        expect(Math.max(...panelButtonHeights) - Math.min(...panelButtonHeights), `${width}px panel ${index} button height harmony`).toBeLessThanOrEqual(1);
      }

      if (mode !== "mobile") {
        expect(panelBox?.x ?? 0, `${width}px branch ${index} opens right`).toBeGreaterThanOrEqual((openTriggerBox?.x ?? 0) + (openTriggerBox?.width ?? 0) - 1);
        if (mode === "wide") {
          expect((panelBox?.x ?? 0) + (panelBox?.width ?? 0), `${width}px Maeve reserve`).toBeLessThanOrEqual((mapBox?.x ?? 0) + ((mapBox?.width ?? 0) * .7));
        }
        if (index === 0) await expect(panel).toHaveAttribute("data-work-map-direction", "down");
        if (index === 4) await expect(panel).toHaveAttribute("data-work-map-direction", "up");
      } else {
        expect(panelBox?.y ?? 0, `${width}px mobile accordion`).toBeGreaterThanOrEqual((openTriggerBox?.y ?? 0) + (openTriggerBox?.height ?? 0) - 1);
      }
      await page.keyboard.press("Escape");
      await expect(trigger).toHaveAttribute("aria-expanded", "false");
      await expect(panel).toBeHidden();
    }
  }
});

test("recursive work map keeps a three-level drilldown inside its coordinate system", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "A regressão geométrica recursiva é determinística no Chromium.");
  test.setTimeout(60_000);
  await page.route("**/work-map-fixture.html", (route) => route.fulfill({
    status: 200,
    contentType: "text/html; charset=utf-8",
    body: nestedWorkMapFixture,
  }));

  for (const viewport of [{ width: 844, height: 390 }, { width: 1280, height: 900 }]) {
    await page.setViewportSize(viewport);
    await openRoute(page, "/work-map-fixture.html");
    const map = page.locator("[data-work-map]");
    const rootTrigger = page.locator("#fixture-root-trigger");
    const rootPanel = page.locator("#fixture-root-panel");
    const nestedTrigger = page.locator("#fixture-nested-trigger");
    const nestedPanel = page.locator("#fixture-nested-panel");

    await expect(map).toHaveAttribute("data-work-map-mode", viewport.width >= 1100 ? "wide" : "compact");
    await rootTrigger.click();
    await expect(rootTrigger).toHaveAttribute("aria-expanded", "true");
    await expect(rootPanel).toBeVisible();
    await expect(rootPanel).toHaveAttribute("data-work-map-presentation", "branch");

    await nestedTrigger.click();
    await expect(nestedTrigger).toHaveAttribute("aria-expanded", "true");
    await expect(nestedPanel).toBeVisible();
    await expect(nestedPanel).toHaveAttribute("data-work-map-presentation", "drilldown");
    await expect(nestedPanel.locator('[data-work-map-depth="2"]')).toBeVisible();

    const geometry = await page.evaluate(() => {
      const rectangle = (selector) => {
        const bounds = document.querySelector(selector).getBoundingClientRect();
        return { left: bounds.left, top: bounds.top, right: bounds.right, bottom: bounds.bottom };
      };
      return {
        map: rectangle("[data-work-map]"),
        rootPanel: rectangle("#fixture-root-panel"),
        nestedPanel: rectangle("#fixture-nested-panel"),
      };
    });
    for (const [label, panel] of [["root", geometry.rootPanel], ["nested", geometry.nestedPanel]]) {
      expect(panel.left, `${viewport.width}px ${label} panel left`).toBeGreaterThanOrEqual(geometry.map.left - 1);
      expect(panel.top, `${viewport.width}px ${label} panel top`).toBeGreaterThanOrEqual(geometry.map.top - 1);
      expect(panel.right, `${viewport.width}px ${label} panel right`).toBeLessThanOrEqual(geometry.map.right + 1);
      expect(panel.bottom, `${viewport.width}px ${label} panel bottom`).toBeLessThanOrEqual(geometry.map.bottom + 1);
    }

    await page.keyboard.press("Escape");
    await expect(nestedTrigger).toHaveAttribute("aria-expanded", "false");
    await expect(rootTrigger).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Escape");
    await expect(rootTrigger).toHaveAttribute("aria-expanded", "false");
  }
});

test("work map growth renders 1, 2, 6 and 12 long localized destinations without clipping", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "A matriz de crescimento geométrico é coberta no Chromium.");
  test.setTimeout(90_000);
  await page.route("**/work-map-growth-*.html", (route) => {
    const match = new URL(route.request().url()).pathname.match(/work-map-growth-(\d+)-(en|es)\.html$/);
    if (!match) return route.fallback();
    return route.fulfill({
      status: 200,
      contentType: "text/html; charset=utf-8",
      body: growthWorkMapFixture(Number(match[1]), match[2]),
    });
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  for (const locale of ["en", "es"]) {
    for (const count of [1, 2, 6, 12]) {
      await openRoute(page, `/work-map-growth-${count}-${locale}.html`);
      const map = page.locator("[data-work-map]");
      const trigger = page.locator("#growth-root-trigger");
      const panel = page.locator("#growth-root-panel");
      const list = panel.locator(":scope > ul");
      const links = list.locator(":scope > [data-work-map-node] > [data-work-map-link]");
      const expectedDensity = count >= 10 ? "dense" : count >= 6 ? "many" : "standard";

      await expect(map).toHaveAttribute("data-work-map-mode", "wide");
      await trigger.click();
      await expect(panel).toBeVisible();
      await expect(panel).toHaveAttribute("data-work-map-child-count", String(count));
      await expect(panel).toHaveAttribute("data-work-map-density", expectedDensity);
      await expect(links).toHaveCount(count);

      const metrics = await growthPanelMetrics(page);
      expect(metrics.columns, `${locale}/${count} desktop columns`).toBe(count >= 6 ? 2 : 1);
      expect(metrics.pageOverflow, `${locale}/${count} desktop horizontal overflow`).toBeLessThanOrEqual(1);
      expect(metrics.panel.left, `${locale}/${count} panel left`).toBeGreaterThanOrEqual(metrics.map.left - 1);
      expect(metrics.panel.top, `${locale}/${count} panel top`).toBeGreaterThanOrEqual(metrics.map.top - 1);
      expect(metrics.panel.right, `${locale}/${count} panel right`).toBeLessThanOrEqual(metrics.map.right + 1);
      expect(metrics.panel.bottom, `${locale}/${count} panel bottom`).toBeLessThanOrEqual(metrics.map.bottom + 1);
      const heights = metrics.linkMetrics.map(({ link }) => link.height);
      expect(Math.max(...heights) - Math.min(...heights), `${locale}/${count} button height harmony`).toBeLessThanOrEqual(1);
      for (const [index, item] of metrics.linkMetrics.entries()) {
        expect(item.label.top, `${locale}/${count} label ${index + 1} top`).toBeGreaterThanOrEqual(item.link.top - 1);
        expect(item.label.bottom, `${locale}/${count} label ${index + 1} bottom`).toBeLessThanOrEqual(item.link.bottom + 1);
        expect(item.scrollHeight, `${locale}/${count} link ${index + 1} clipping`).toBeLessThanOrEqual(item.clientHeight + 2);
        expect(item.strongScrollHeight, `${locale}/${count} title ${index + 1} clipping`).toBeLessThanOrEqual(item.strongClientHeight + 1);
        expect(item.smallScrollHeight, `${locale}/${count} kicker ${index + 1} clipping`).toBeLessThanOrEqual(item.smallClientHeight + 1);
      }
      if (count <= 6) expect(metrics.listScrollHeight, `${locale}/${count} avoids premature scrolling`).toBeLessThanOrEqual(metrics.listClientHeight + 1);
      else expect(metrics.listScrollHeight, `${locale}/${count} uses scrolling as the dense fallback`).toBeGreaterThan(metrics.listClientHeight + 1);

      const lastLink = links.last();
      await lastLink.scrollIntoViewIfNeeded();
      const lastAccess = await lastLink.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        const listBounds = element.closest("ul").getBoundingClientRect();
        return {
          insideList: bounds.top >= listBounds.top - 1 && bounds.bottom <= listBounds.bottom + 1,
          insideViewport: bounds.top >= -1 && bounds.bottom <= innerHeight + 1,
        };
      });
      expect(lastAccess.insideList, `${locale}/${count} last destination inside list`).toBe(true);
      expect(lastAccess.insideViewport, `${locale}/${count} last destination reachable`).toBe(true);
    }
  }

  for (const responsiveCase of [
    { viewport: { width: 844, height: 900 }, locale: "es", mode: "compact" },
    { viewport: { width: 390, height: 844 }, locale: "en", mode: "mobile" },
  ]) {
    await page.setViewportSize(responsiveCase.viewport);
    await openRoute(page, `/work-map-growth-12-${responsiveCase.locale}.html`);
    const map = page.locator("[data-work-map]");
    const panel = page.locator("#growth-root-panel");
    const links = panel.locator(":scope > ul > [data-work-map-node] > [data-work-map-link]");
    await expect(map).toHaveAttribute("data-work-map-mode", responsiveCase.mode);
    await page.locator("#growth-root-trigger").click();
    await expect(panel).toBeVisible();
    const metrics = await growthPanelMetrics(page);
    expect(metrics.columns, `${responsiveCase.mode} keeps one column`).toBe(1);
    expect(metrics.pageOverflow, `${responsiveCase.mode} horizontal overflow`).toBeLessThanOrEqual(1);
    const heights = metrics.linkMetrics.map(({ link }) => link.height);
    expect(Math.max(...heights) - Math.min(...heights), `${responsiveCase.mode} button height harmony`).toBeLessThanOrEqual(1);
    for (const [index, item] of metrics.linkMetrics.entries()) {
      expect(item.label.bottom, `${responsiveCase.mode} label ${index + 1} bottom`).toBeLessThanOrEqual(item.link.bottom + 1);
      expect(item.scrollHeight, `${responsiveCase.mode} link ${index + 1} clipping`).toBeLessThanOrEqual(item.clientHeight + 2);
    }
    const lastLink = links.last();
    await lastLink.scrollIntoViewIfNeeded();
    await expect(lastLink).toBeInViewport();
  }
});

test("work map labels, media and preferences remain coherent", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  for (const [route, labels] of Object.entries(workMapLabels)) {
    const response = await page.request.get(route);
    expect(response.status(), route).toBe(200);
    await openRoute(page, route);
    await expect(page.locator('[data-work-map-depth="0"] > [data-work-map-trigger] .work-map-label strong')).toHaveText(labels);
    await expect(page.locator(".work-map > h2.sr-only")).toHaveCount(1);
    await expect(page.locator(".landscape-copy, .work-map figcaption")).toHaveCount(0);
    await expect(page.locator("[data-work-map-link]")).toHaveCount(7);
    await expect(page.locator('.work-map-media img[src="/assets/img/gui/mapa-do-trabalho-1280.webp"]')).toHaveCount(1);
  }

  await page.emulateMedia({ reducedMotion: "reduce" });
  await openRoute(page, "/");
  await expect(page.locator("h1")).toBeVisible();
  const trigger = page.locator("[data-work-map-trigger]").first();
  await trigger.focus();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("[data-work-map-panel]").first()).toHaveCSS("transform", "none");
  await expect(page.locator(".work-map-particle").first()).toHaveCSS("display", "none");
  await expect(page.locator("[data-work-map-focus-image]")).toHaveCSS("animation-name", "none");
  await expect(page.locator(".work-map-hotspot-orbit-primary .work-map-hotspot-orbit-shape").first()).toHaveCSS("animation-name", "none");
  const reducedMotionTooling = page.locator("[data-work-map-trigger]").nth(2);
  await reducedMotionTooling.click();
  await expect.poll(() => page.locator('[data-work-map-hotspot="tooling-cluster"] .work-map-hotspot-orbit-shape').first().evaluate((shape) => shape.style.strokeDashoffset)).toBe("");

  await page.locator("html").evaluate((root) => {
    root.dataset.contrast = "high";
    root.dataset.textScale = "xlarge";
    root.dataset.font = "readable";
    root.dataset.motion = "reduced";
  });
  await expect(page.locator("html")).toHaveCSS("transition-property", "none");
  await expect(page.locator("[data-work-map-hotspots]")).toHaveCSS("display", "none");
  await page.setViewportSize({ width: 1024, height: 768 });
  const scaledMap = page.locator("[data-work-map]");
  const scaledPanel = page.locator("[data-work-map-panel]").nth(2);
  await reducedMotionTooling.focus();
  await reducedMotionTooling.press("ArrowRight");
  await expect(reducedMotionTooling).toHaveAttribute("aria-expanded", "true");
  await expect(scaledPanel).toBeVisible();
  const scaledGeometry = await Promise.all([scaledMap.boundingBox(), scaledPanel.boundingBox()]);
  const [scaledMapBox, scaledPanelBox] = scaledGeometry;
  expect(scaledPanelBox?.x ?? -1, "xlarge panel left containment").toBeGreaterThanOrEqual((scaledMapBox?.x ?? 0) - 1);
  expect(scaledPanelBox?.y ?? -1, "xlarge panel top containment").toBeGreaterThanOrEqual((scaledMapBox?.y ?? 0) - 1);
  expect((scaledPanelBox?.x ?? 0) + (scaledPanelBox?.width ?? 0), "xlarge panel right containment").toBeLessThanOrEqual((scaledMapBox?.x ?? 0) + (scaledMapBox?.width ?? 0) + 1);
  expect((scaledPanelBox?.y ?? 0) + (scaledPanelBox?.height ?? 0), "xlarge panel bottom containment").toBeLessThanOrEqual((scaledMapBox?.y ?? 0) + (scaledMapBox?.height ?? 0) + 1);
  await page.setViewportSize({ width: 640, height: 900 });
  const overflow = await page.evaluate(() => Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - innerWidth);
  expect(overflow, "200% browser zoom proxy with xlarge text horizontal overflow").toBeLessThanOrEqual(1);

  if (testInfo.project.name === "chromium") {
    await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
    await trigger.focus();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(trigger).toHaveCSS("outline-style", "solid");
  }

});

test("language, theme and contact state stay coherent", async ({ page }) => {
  await openRoute(page, "/contato/?projeto=clubal&origem=qa");
  const email = page.locator("[data-email-link]");
  const clubalEmail = page.locator("[data-clubal-email-link]");
  await expect(page.locator("[data-email-address]")).toContainText("gmdr2014@gmail.com");
  await expect(email).toHaveAttribute("href", "mailto:gmdr2014@gmail.com");
  await expect(page.locator("[data-clubal-email-address]")).toContainText("suporte.clubal@gmail.com");
  await expect(clubalEmail).toHaveAttribute("href", /^mailto:suporte\.clubal@gmail\.com\?subject=/);
  await expect(page.locator("[data-clubal-contact]")).toHaveAttribute("data-context-active", "true");

  const language = page.locator(".language-switcher");
  const summary = language.locator("summary");
  await summary.click();
  await expect(language).toHaveAttribute("open", "");
  const englishHref = await language.locator('[data-language-link="en"]').getAttribute("href");
  const localized = new URL(englishHref, "http://local.test");
  expect(localized.pathname).toBe("/en/contact/");
  expect(localized.searchParams.get("subject")).toBe("clubal");
  expect(localized.searchParams.get("origem")).toBe("qa");
  await page.keyboard.press("Escape");
  await expect(language).not.toHaveAttribute("open", "");
  await expect(summary).toBeFocused();

  await openRoute(page, "/");
  const toggle = page.locator("[data-theme-toggle]");
  await toggle.click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", /^(?:light|dark)$/);
  const selectedTheme = await page.locator("html").getAttribute("data-theme");
  expect(["light", "dark"]).toContain(selectedTheme);
  const savedTheme = await page.evaluate(() => JSON.parse(sessionStorage.getItem("gui_preferences_v2") || "{}").theme);
  expect(savedTheme).toBe(selectedTheme);
  await reloadRoute(page);
  await expect(page.locator("html")).toHaveAttribute("data-theme", selectedTheme);

  for (const contactRoute of ["/contato/", "/en/contact/", "/es/contacto/"]) {
    await openRoute(page, contactRoute);
    await expect(page.locator("[data-email-address]"), contactRoute).toContainText("gmdr2014@gmail.com");
    await expect(page.locator("[data-clubal-email-address]"), contactRoute).toContainText("suporte.clubal@gmail.com");
  }

  await openRoute(page, "/contato/?projeto=maeve");
  await expect(page.locator("[data-email-link]")).toHaveAttribute("href", /^mailto:gmdr2014@gmail\.com\?subject=/);
  await expect(page.locator("[data-clubal-contact]")).toHaveAttribute("data-context-active", "false");
});

test("single-image cases stay static while multi-image galleries remain operable", async ({ page }) => {
  const singleImageResponse = await page.request.get("/projetos/demonyza/");
  expect(singleImageResponse.status()).toBe(200);
  await openRoute(page, "/projetos/demonyza/");
  await expect(page.getByRole("heading", { level: 1, name: "Demonyza" })).toBeVisible();
  await expect(page.locator(".project-visual")).toHaveCount(1);
  await expect(page.locator("[data-project-gallery]")).toHaveCount(0);
  await expect(page.locator("[data-gallery-previous], [data-gallery-next], [data-gallery-data], [data-gallery-live]")).toHaveCount(0);

  const galleryResponse = await page.request.get("/projetos/clubal/");
  expect(galleryResponse.status()).toBe(200);
  await openRoute(page, "/projetos/clubal/");
  await expect(page.getByRole("heading", { level: 1, name: "ClubAL" })).toBeVisible();
  await expect(page.locator("[data-project-gallery]")).toHaveCount(1);
  const image = page.locator("[data-project-image]");
  const initialSource = await image.getAttribute("src");
  await page.locator("[data-gallery-next]").click();
  await expect(page.locator("[data-gallery-current]")).toHaveText("2");
  await expect(image).not.toHaveAttribute("src", initialSource);
});

test("project cases keep distinct editorial blocks, commercial first reads and one shared alignment axis", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "A matriz editorial e geométrica é coberta no Chromium; a suíte completa percorre os três motores.");
  test.setTimeout(180_000);

  const bannedFirstRead = /\b(?:local-first|offline-first|flet|wpf|python cli|cloudflare pages|unreal engine|technical gates|human gameplay validation|gates técnicos|validación humana)\b/i;
  const bannedCaseCopy = /technical gates|human gameplay validation|gates técnicos|validação humana|validación humana|necessita validação humana/i;
  const viewportMatrix = [
    { width: 320, height: 720, label: "mobile-320" },
    { width: 390, height: 844, label: "mobile-390" },
    { width: 640, height: 900, label: "zoom-200-proxy" },
    { width: 768, height: 1024, label: "tablet" },
    { width: 1366, height: 900, label: "desktop" },
  ];

  for (const viewport of viewportMatrix) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    for (const route of localizedProjectRoutes) {
      await openRoute(page, route);
      await acceptEssentialStorage(page);

      const firstRead = await page.locator(".project-number, .project-heading > .status-pill, .project-promise, .project-summary, .project-facts").allTextContents();
      expect(firstRead.join(" "), `${route} ${viewport.label} first read`).not.toMatch(bannedFirstRead);

      const caseBlocks = await page.locator(".project-case-summary dd").allTextContents();
      expect(caseBlocks.length, `${route} ${viewport.label} substantive case blocks`).toBeGreaterThanOrEqual(4);
      expect(caseBlocks.length, `${route} ${viewport.label} case blocks without filler`).toBeLessThanOrEqual(5);
      expect(caseBlocks.join(" "), `${route} ${viewport.label} case language`).not.toMatch(bannedCaseCopy);
      for (let left = 0; left < caseBlocks.length; left += 1) {
        for (let right = left + 1; right < caseBlocks.length; right += 1) {
          expect(
            editorialSimilarity(caseBlocks[left], caseBlocks[right]),
            `${route} ${viewport.label} blocks ${left + 1} and ${right + 1} repeat the same idea`,
          ).toBeLessThan(0.65);
        }
      }

      const geometry = await page.evaluate(() => {
        const box = (selector) => document.querySelector(selector)?.getBoundingClientRect();
        const breadcrumb = box(".project-breadcrumb");
        const breadcrumbText = box(".project-breadcrumb span");
        const number = box(".project-number");
        const title = box(".project-heading-title");
        const summary = box(".project-summary");
        return {
          overflow: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - innerWidth,
          breadcrumbBottom: breadcrumb?.bottom ?? -1,
          breadcrumbTextX: breadcrumbText?.x ?? -1,
          numberTop: number?.top ?? -1,
          numberX: number?.x ?? -1,
          titleX: title?.x ?? -1,
          summaryX: summary?.x ?? -1,
        };
      });
      expect(geometry.overflow, `${route} ${viewport.label} horizontal overflow`).toBeLessThanOrEqual(1);
      expect(Math.abs(geometry.breadcrumbTextX - geometry.numberX), `${route} ${viewport.label} breadcrumb axis`).toBeLessThanOrEqual(1);
      expect(Math.abs(geometry.titleX - geometry.numberX), `${route} ${viewport.label} title axis`).toBeLessThanOrEqual(1);
      expect(Math.abs(geometry.summaryX - geometry.numberX), `${route} ${viewport.label} content axis`).toBeLessThanOrEqual(1);
      expect(geometry.numberTop - geometry.breadcrumbBottom, `${route} ${viewport.label} vertical rhythm`).toBeGreaterThanOrEqual(16);
      expect(geometry.numberTop - geometry.breadcrumbBottom, `${route} ${viewport.label} vertical rhythm`).toBeLessThanOrEqual(36);
    }
  }

  const clubalCopy = [
    ["/projetos/clubal/", "Plataforma para organizar operações institucionais", "Em evolução · Nova versão web"],
    ["/en/projects/clubal/", "Platform for organizing institutional operations", "Evolving · New web version"],
    ["/es/proyectos/clubal/", "Plataforma para organizar operaciones institucionales", "En evolución · Nueva versión web"],
  ];
  for (const [route, kicker, status] of clubalCopy) {
    await openRoute(page, route);
    await expect(page.locator(".project-number"), route).toContainText(kicker);
    await expect(page.locator(".project-heading > .status-pill"), route).toHaveText(status);
  }
});

test("core journeys have no automated WCAG A/AA violations in light and dark themes", async ({ page }) => {
  test.setTimeout(90_000);
  for (const route of coreRoutes) {
    const response = await page.request.get(route);
    expect(response.status(), route).toBe(200);
    await openRoute(page, route);
    await expect(page.locator("h1"), route).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations, route + " accessibility violations").toEqual([]);
  }

  await openRoute(page, "/");
  await expect(page.locator("h1")).toBeVisible();
  await page.evaluate(() => sessionStorage.setItem("gui_preferences_v2", JSON.stringify({ theme: "dark" })));
  await reloadRoute(page);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const darkResults = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(darkResults.violations, "dark theme accessibility violations").toEqual([]);

  await page.evaluate(() => sessionStorage.removeItem("gui_preferences_v2"));
  await page.emulateMedia({ colorScheme: "dark" });
  await openRoute(page, "/projetos/clubal/");
  await expect(page.locator("h1")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "system");
  await expect(page.locator("html")).toHaveAttribute("data-resolved-theme", "dark");
  await acceptEssentialStorage(page);
  await page.waitForTimeout(260);
  const systemDarkResults = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(systemDarkResults.violations, "system dark accessibility violations").toEqual([]);
});

test("work map no-JS fallback remains navigable and unclipped at 320px", async ({ browser }) => {
  const baseURL = String(test.info().project.use.baseURL);
  const noJsContext = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 320, height: 568 } });
  try {
    const noJsPage = await noJsContext.newPage();
    await openRoute(noJsPage, "/");
    const noJsMap = noJsPage.locator("[data-work-map]");
    const noJsPanels = noJsMap.locator("[data-work-map-panel]");
    const noJsLinks = noJsMap.locator("[data-work-map-panel] a");
    await expect(noJsPanels).toHaveCount(5);
    for (const panel of await noJsPanels.all()) await expect(panel).toBeVisible();
    await expect(noJsMap.locator("[data-work-map-panel][inert]")).toHaveCount(0);
    await expect(noJsLinks).toHaveCount(7);
    await expect(noJsMap.locator(".work-map-media img")).toHaveAttribute("width", "1672");

    const noJsGeometry = await noJsMap.evaluate((element) => {
      const mapRectangle = element.getBoundingClientRect();
      const links = [...element.querySelectorAll("[data-work-map-panel] a")].map((link, index) => {
        const rectangle = link.getBoundingClientRect();
        const labelRectangle = link.querySelector(".work-map-label")?.getBoundingClientRect();
        return {
          index,
          left: rectangle.left,
          top: rectangle.top,
          right: rectangle.right,
          bottom: rectangle.bottom,
          clientHeight: link.clientHeight,
          scrollHeight: link.scrollHeight,
          labelTop: labelRectangle?.top ?? rectangle.top,
          labelBottom: labelRectangle?.bottom ?? rectangle.bottom,
        };
      });
      const overlaps = [];
      for (let left = 0; left < links.length; left += 1) {
        for (let right = left + 1; right < links.length; right += 1) {
          const overlapWidth = Math.min(links[left].right, links[right].right) - Math.max(links[left].left, links[right].left);
          const overlapHeight = Math.min(links[left].bottom, links[right].bottom) - Math.max(links[left].top, links[right].top);
          if (overlapWidth > 1 && overlapHeight > 1) overlaps.push([left, right]);
        }
      }
      return {
        map: {
          left: mapRectangle.left,
          top: mapRectangle.top,
          right: mapRectangle.right,
          bottom: mapRectangle.bottom,
        },
        links,
        overlaps,
      };
    });
    expect(noJsGeometry.overlaps, "no-JS links must not overlap at 320px").toEqual([]);
    for (const link of noJsGeometry.links) {
      expect(link.left, `no-JS link ${link.index} left containment`).toBeGreaterThanOrEqual(noJsGeometry.map.left - 1);
      expect(link.top, `no-JS link ${link.index} top containment`).toBeGreaterThanOrEqual(noJsGeometry.map.top - 1);
      expect(link.right, `no-JS link ${link.index} right containment`).toBeLessThanOrEqual(noJsGeometry.map.right + 1);
      expect(link.bottom, `no-JS link ${link.index} bottom containment`).toBeLessThanOrEqual(noJsGeometry.map.bottom + 1);
      expect(link.labelTop, `no-JS link ${link.index} label top`).toBeGreaterThanOrEqual(link.top - 1);
      expect(link.labelBottom, `no-JS link ${link.index} label bottom`).toBeLessThanOrEqual(link.bottom + 1);
      expect(link.scrollHeight, `no-JS link ${link.index} scroll overflow`).toBeLessThanOrEqual(link.clientHeight + 2);
    }

    await noJsLinks.first().click();
    await noJsPage.waitForURL(/\/projetos\/clubal\/$/);
    expect(new URL(noJsPage.url()).pathname).toBe("/projetos/clubal/");
  } finally {
    await noJsContext.close();
  }
});
