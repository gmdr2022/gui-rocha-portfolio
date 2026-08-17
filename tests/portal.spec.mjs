import { expect, test } from "@playwright/test";
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

const contextViewports = [320, 360, 375, 390, 430, 768, 1024, 1280, 1366, 1440, 1536];
const contextLabels = {
  "/": ["Operações institucionais", "Presença digital", "Ferramentas de trabalho", "Métodos de desenvolvimento", "Projetos autorais"],
  "/en/": ["Institutional operations", "Digital presence", "Work tools", "Development methods", "Original projects"],
  "/es/": ["Operaciones institucionales", "Presencia digital", "Herramientas de trabajo", "Métodos de desarrollo", "Proyectos propios"],
};

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
  if (await button.isVisible()) await button.click();
};

const openRoute = async (page, route) => {
  const response = await page.goto(route, { waitUntil: "commit" });
  await page.waitForFunction(() => document.readyState !== "loading");
  return response;
};

const reloadRoute = async (page) => {
  const response = await page.reload({ waitUntil: "commit" });
  await page.waitForFunction(() => document.readyState !== "loading");
  return response;
};

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
    expect(response?.status(), route).toBe(200);
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

test("mobile layouts keep the header visible and actionable throughout scrolling", async ({ page }) => {
  test.setTimeout(90_000);
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
        await page.evaluate((scrollY) => window.scrollTo(0, scrollY), y);
        await page.waitForTimeout(60);
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
              const hit = document.elementFromPoint(x, y);
              return {
                insideViewport: x >= 0 && x <= innerWidth && y >= 0 && y <= innerHeight,
                unobscured: hit === control || control.contains(hit),
              };
            }),
          };
        });
        expect(header.position, `${route} at ${viewport.width}x${viewport.height}`).toBe("sticky");
        expect(header.top, `${route} at scroll ${y}`).toBeGreaterThanOrEqual(0);
        expect(header.top, `${route} at scroll ${y}`).toBeLessThanOrEqual(24);
        expect(header.bottom, `${route} header within viewport`).toBeLessThan(header.viewportHeight);
        expect(header.controls, `${route} controls at scroll ${y}`).toEqual([
          { insideViewport: true, unobscured: true },
          { insideViewport: true, unobscured: true },
          { insideViewport: true, unobscured: true },
          { insideViewport: true, unobscured: true },
        ]);
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

test("context cards support hover tolerance, keyboard dismissal and focus return", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openRoute(page, "/");
  await acceptEssentialStorage(page);
  const trigger = page.locator("[data-context-trigger]").first();
  const panel = page.locator("[data-context-panel]").first();
  await trigger.scrollIntoViewIfNeeded();
  const initialBox = await trigger.boundingBox();

  await trigger.hover();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(panel).toBeVisible();
  await expect(panel).not.toHaveAttribute("inert", "");
  const activeBox = await trigger.boundingBox();
  expect(activeBox?.x).toBeCloseTo(initialBox?.x ?? 0, 1);
  expect(activeBox?.y).toBeCloseTo(initialBox?.y ?? 0, 1);
  expect(activeBox?.width).toBeCloseTo(initialBox?.width ?? 0, 1);
  expect(activeBox?.height).toBeCloseTo(initialBox?.height ?? 0, 1);

  const panelBox = await panel.boundingBox();
  expect(panelBox?.x ?? -1).toBeGreaterThanOrEqual(0);
  expect((panelBox?.x ?? 0) + (panelBox?.width ?? 0)).toBeLessThanOrEqual(1440);

  await panel.hover();
  await page.waitForTimeout(400);
  await expect(trigger).toHaveAttribute("aria-expanded", "true");

  const secondTrigger = page.locator("[data-context-trigger]").nth(1);
  await secondTrigger.hover();
  await expect(secondTrigger).toHaveAttribute("aria-expanded", "true");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator('[data-context-trigger][aria-expanded="true"]')).toHaveCount(1);

  const secondBox = await secondTrigger.boundingBox();
  await page.mouse.move((secondBox?.x ?? 0) + (secondBox?.width ?? 0) / 2, (secondBox?.y ?? 0) + (secondBox?.height ?? 0) + 30);
  if (testInfo.project.name !== "webkit") {
    await page.waitForTimeout(200);
    await expect(page.locator("[data-context-panel]").nth(1)).toBeVisible();
  }
  await page.waitForTimeout(600);
  await expect(secondTrigger).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("[data-context-panel]").nth(1)).toBeHidden();

  const keyboardTrigger = page.locator("[data-context-trigger]").nth(2);
  await keyboardTrigger.focus();
  const keyboardPanel = page.locator("[data-context-panel]").nth(2);
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
  await page.keyboard.press("Escape");
  await expect(keyboardTrigger).toHaveAttribute("aria-expanded", "false");
  await expect(keyboardPanel).toHaveAttribute("inert", "");
  await expect(keyboardTrigger).toBeFocused();
  await keyboardTrigger.press("Enter");
  await expect(keyboardTrigger).toHaveAttribute("aria-expanded", "true");
  await keyboardTrigger.press("Space");
  await expect(keyboardTrigger).toHaveAttribute("aria-expanded", "false");
});

test("context cards support first tap, second tap and outside dismissal", async ({ browser }) => {
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
    const trigger = page.locator("[data-context-trigger]").first();
    await trigger.tap();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await trigger.tap();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await trigger.tap();
    const secondTrigger = page.locator("[data-context-trigger]").nth(1);
    await secondTrigger.tap();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(secondTrigger).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator('[data-context-trigger][aria-expanded="true"]')).toHaveCount(1);
    await secondTrigger.tap();
    await expect(secondTrigger).toHaveAttribute("aria-expanded", "false");
    await trigger.tap();
    await page.locator("h1").tap();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await trigger.tap();
    await page.locator("[data-context-panel]").first().locator("a").tap();
    await expect(page).toHaveURL(/\/projetos\/clubal\/$/);
  } finally {
    await context.close();
  }
});

test("context catalog stays aligned and contained across the required viewport matrix", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "A matriz geométrica é coberta no Chromium; os fluxos rodam nos três motores.");
  test.setTimeout(90_000);

  for (const width of contextViewports) {
    await page.setViewportSize({ width, height: width <= 430 ? 844 : 900 });
    await openRoute(page, "/");
    await acceptEssentialStorage(page);
    const overflow = await page.evaluate(() => Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - innerWidth);
    expect(overflow, `${width}px horizontal overflow`).toBeLessThanOrEqual(1);

    const geometry = await page.locator("[data-context-trigger]").evaluateAll((buttons) => buttons.map((button) => {
      const box = button.getBoundingClientRect();
      const count = button.querySelector("small")?.getBoundingClientRect();
      return { x: box.x, y: box.y, width: box.width, height: box.height, countY: count?.y ?? -1 };
    }));
    expect(geometry).toHaveLength(5);
    const rows = Map.groupBy(geometry, (item) => Math.round(item.y));
    const expectedColumns = width <= 760 ? 1 : width <= 1280 ? 3 : 5;
    expect(Math.max(...[...rows.values()].map((row) => row.length)), `${width}px column count`).toBe(expectedColumns);
    for (const row of rows.values()) {
      expect(Math.max(...row.map((item) => item.height)) - Math.min(...row.map((item) => item.height)), `${width}px card heights`).toBeLessThanOrEqual(1);
      expect(Math.max(...row.map((item) => item.countY)) - Math.min(...row.map((item) => item.countY)), `${width}px count alignment`).toBeLessThanOrEqual(1);
    }

    if ([320, 768, 1024, 1440].includes(width)) {
      const lastTrigger = page.locator("[data-context-trigger]").last();
      if (width <= 760) await lastTrigger.click(); else await lastTrigger.hover();
      await expect(lastTrigger).toHaveAttribute("aria-expanded", "true");
      const panel = page.locator("[data-context-panel]").last();
      const box = await panel.boundingBox();
      expect(box?.x ?? -1, `${width}px panel left`).toBeGreaterThanOrEqual(0);
      expect((box?.x ?? 0) + (box?.width ?? 0), `${width}px panel right`).toBeLessThanOrEqual(width + 1);
      if (width === 1024) {
        const firstTrigger = page.locator("[data-context-trigger]").first();
        await firstTrigger.hover();
        await expect(firstTrigger).toHaveAttribute("aria-expanded", "true");
        await expect(lastTrigger).toHaveAttribute("aria-expanded", "false");
        await expect(page.locator('[data-context-trigger][aria-expanded="true"]')).toHaveCount(1);
      }
    }
  }
});

test("context labels, reduced motion, contrast preferences and no-JS fallback remain coherent", async ({ page, browser }, testInfo) => {
  for (const [route, labels] of Object.entries(contextLabels)) {
    const response = await page.request.get(route);
    expect(response.status(), route).toBe(200);
    await openRoute(page, route);
    await expect(page.locator(".context-catalog-title strong")).toHaveText(labels);
  }

  await page.emulateMedia({ reducedMotion: "reduce" });
  await openRoute(page, "/");
  await expect(page.locator("h1")).toBeVisible();
  const trigger = page.locator("[data-context-trigger]").first();
  await trigger.focus();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("[data-context-panel]").first()).toHaveCSS("transform", "none");

  await page.locator("html").evaluate((root) => {
    root.dataset.contrast = "high";
    root.dataset.textScale = "xlarge";
    root.dataset.font = "readable";
  });
  await page.setViewportSize({ width: 640, height: 900 });
  const overflow = await page.evaluate(() => Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - innerWidth);
  expect(overflow, "200% browser zoom proxy with xlarge text horizontal overflow").toBeLessThanOrEqual(1);

  if (testInfo.project.name === "chromium") {
    await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
    await expect(trigger).toHaveCSS("outline-style", "solid");
  }

  const baseURL = String(test.info().project.use.baseURL);
  const noJsContext = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  try {
    const noJsPage = await noJsContext.newPage();
    await noJsPage.goto("/", { waitUntil: "commit" });
    await expect(noJsPage.locator("[data-context-panel]")).toHaveCount(5);
    for (const panel of await noJsPage.locator("[data-context-panel]").all()) await expect(panel).toBeVisible();
    await expect(noJsPage.locator("[data-context-panel] a")).toHaveCount(7);
  } finally {
    await noJsContext.close();
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
