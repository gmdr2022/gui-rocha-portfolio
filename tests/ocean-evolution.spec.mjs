import { expect, test } from "@playwright/test";

const preferences = async (page, theme = "dark", reduceMotion = false) => {
  await page.addInitScript(({ theme, reduceMotion }) => {
    sessionStorage.setItem("gui_preferences_v2", JSON.stringify({ theme, reduceMotion }));
    document.cookie = "gui_consent=essential; Path=/; SameSite=Lax";
  }, { theme, reduceMotion });
};

const settlePointerTarget = (target) => target.evaluate((element) => {
  element.scrollIntoView({ behavior: "instant", block: "center" });
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
});

const ambientState = (page) => page.evaluate(() => {
  const root = document.documentElement;
  const style = root.style;
  return {
    depth: root.dataset.depth,
    source: root.dataset.ambientSource,
    id: root.dataset.ambientId || "",
    color: ["--ambient-r", "--ambient-g", "--ambient-b"].map((name) => style.getPropertyValue(name)).join(","),
    x: style.getPropertyValue("--ambient-pointer-x"),
    y: style.getPropertyValue("--ambient-pointer-y"),
    gain: Number(getComputedStyle(root).getPropertyValue("--ambient-gain")),
  };
});

test("ocean atmosphere follows visible sections and bounded pointer input in both themes", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  for (const theme of ["light", "dark"]) {
    await preferences(page, theme);
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-depth", "surface");
    expect((await ambientState(page)).id).not.toBe("method-step-01");
    expect((await ambientState(page)).gain).toBe(theme === "dark" ? 1.85 : 1);
    if (process.env.PORTAL_CAPTURE_DESIGN === "1") {
      await page.evaluate(() => Promise.all(document.documentElement.getAnimations().map((animation) => animation.finished.catch(() => {}))));
      await page.screenshot({ path: `output/playwright/ocean-${testInfo.project.name}-${theme}-surface.png` });
    }
    await page.mouse.move(30, 210);
    await expect.poll(async () => (await ambientState(page)).x).not.toBe("0.00%");
    const left = await ambientState(page);
    await page.mouse.move(1400, 210);
    await expect.poll(async () => (await ambientState(page)).x).not.toBe(left.x);
    expect(Math.abs(parseFloat((await ambientState(page)).x))).toBeLessThanOrEqual(4);
    await page.locator(".method-section").scrollIntoViewIfNeeded();
    await expect(page.locator("html")).toHaveAttribute("data-depth", "mid");
    await page.locator("[data-decision-step] a").last().focus();
    await expect(page.locator("html")).toHaveAttribute("data-ambient-source", "decision");
    const valid = await ambientState(page);
    await page.evaluate(() => window.dispatchEvent(new CustomEvent("portal:ambientchange", {
      detail: { source: "decision", id: "invalid", index: 0, accentRgb: "NaN 1 2" },
    })));
    expect((await ambientState(page)).color).toBe(valid.color);
  }
});

test("ocean pointer settles and respects system and in-page motion preferences", async ({ page }) => {
  await preferences(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await page.mouse.move(30, 200);
  await expect.poll(async () => (await ambientState(page)).x).not.toBe("0.00%");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect.poll(async () => (await ambientState(page)).x).toBe("0.00%");
  await page.mouse.move(800, 250);
  expect((await ambientState(page)).x).toBe("0.00%");
  await page.emulateMedia({ reducedMotion: "no-preference", forcedColors: "active" });
  await page.mouse.move(30, 200);
  expect((await ambientState(page)).x).toBe("0.00%");
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.body, "::before").display)).toBe("none");
  await page.emulateMedia({ forcedColors: "none" });
  await preferences(page, "dark", true);
  await page.reload();
  await page.mouse.move(50, 200);
  await expect.poll(async () => (await ambientState(page)).x).toBe("0.00%");
});

test("decision current and project orbit retain single keyboard state and shortest rotation", async ({ page }) => {
  await preferences(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const steps = page.locator("[data-decision-step] a");
  await steps.first().focus();
  await page.keyboard.press("End");
  await expect(steps.last()).toBeFocused();
  await expect(steps.last()).toHaveAttribute("aria-current", "step");
  await expect(page.locator('[data-decision-step] a[aria-current="step"]')).toHaveCount(1);
  await expect(page.locator("[data-decision-flow]")).toHaveCSS("--method-progress", "87.5");
  await page.keyboard.press("Home");
  await expect(steps.first()).toHaveAttribute("aria-current", "step");
  await page.goto("/projetos/");
  const dots = page.locator("[data-deck-dot]");
  await dots.first().focus();
  await page.keyboard.press("End");
  await expect(dots.last()).toBeFocused();
  await expect(dots.last()).toHaveAttribute("aria-pressed", "true");
  const rotation = await page.locator("[data-project-orbit]").evaluate((node) => parseFloat(node.style.getPropertyValue("--orbit-rotation")));
  expect(Math.abs(rotation)).toBeLessThan(180);
  await page.keyboard.press("Home");
  await expect(dots.first()).toHaveAttribute("aria-pressed", "true");
  await expect(page).toHaveURL(/project=clubal/);
  await expect(page.locator('[data-deck-dot][aria-pressed="true"]')).toHaveCount(1);
  await expect(page.locator("[data-deck-energy-canvas]")).toHaveCount(2);
  await expect(page.locator("[data-project-orbit]")).toHaveCSS("position", "relative");
});

test("compact mobile consent keeps both choices and details available in every language", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 568 });
  for (const route of ["/", "/en/", "/es/"]) {
    await page.context().clearCookies();
    await page.goto(route);
    const banner = page.locator("[data-cookie-banner]");
    await expect(banner).toBeVisible();
    const bounds = await banner.boundingBox();
    expect(bounds.height).toBeLessThan(240);
    if (process.env.PORTAL_CAPTURE_DESIGN === "1" && route === "/") {
      await page.screenshot({ path: `output/playwright/consent-${testInfo.project.name}-320.png` });
    }
    for (const selector of ['[data-consent="essential"]', '[data-consent="preferences"]', '[data-open-cookie]']) {
      await banner.locator(selector).click({ trial: true });
    }
    await banner.locator("[data-open-cookie]").click();
    await expect(page.locator("#cookie-panel")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(banner.locator("[data-open-cookie]")).toBeFocused();
    await banner.locator('[data-consent="essential"]').click();
    await expect(banner).toBeHidden();
    await page.reload();
    await expect(banner).toBeHidden();
    expect((await page.context().cookies()).find((cookie) => cookie.name === "gui_consent")?.value).toBe("essential");
  }
});

test("evolution layouts preserve viewport bounds and optional design captures", async ({ page }, testInfo) => {
  await preferences(page);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const width of [320, 375, 768, 1440, 1920]) {
    await page.setViewportSize({ width, height: width < 400 ? 667 : 900 });
    for (const route of ["/", "/projetos/", "/projetos/clubal/", "/contato/"]) {
      await page.goto(route);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
      const target = page.locator(route === "/" ? ".method-section" : route === "/projetos/" ? ".deck-controls" : route.includes("clubal") ? ".project-explorer" : "main");
      await target.scrollIntoViewIfNeeded();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
      if (route === "/projetos/") {
        await expect(page.locator("[data-deck-dot]:visible")).toHaveCount(7);
        await expect(page.locator("[data-deck-current]")).toBeVisible();
        await expect(page.locator("[data-deck-counter]")).toBeVisible();
      }
      if (process.env.PORTAL_CAPTURE_DESIGN === "1" && [375, 1440].includes(width)) {
        await page.locator("img").evaluateAll((images) => Promise.all(images.filter((image) => image.complete && image.currentSrc).map((image) => image.decode().catch(() => {}))));
        await page.screenshot({ path: `output/playwright/evolution-${testInfo.project.name}-${width}-${route.replaceAll("/", "_") || "home"}.png` });
      }
    }
  }
  expect(errors).toEqual([]);
});

test("reading lens links only explicit editorial sources and keeps the gallery independent", async ({ page }) => {
  await preferences(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const route of ["/projetos/clubal/", "/projetos/demonyza/", "/sites/clubal/", "/projetos/maeve/"]) {
    await page.goto(route);
    const tabs = page.locator("[data-project-tab]");
    await expect(page.locator(".project-tabs")).toHaveAttribute("aria-orientation", "vertical");
    const image = page.locator("[data-project-image]");
    const interactiveGallery = await image.count() > 0;
    const initialImage = interactiveGallery ? await image.getAttribute("src") : null;
    const sourceLink = page.locator("[data-case-tab]").first();
    const source = await sourceLink.getAttribute("data-case-tab");
    await sourceLink.click();
    await expect(page).toHaveURL(new RegExp(`#panel-${source}$`));
    await expect(page.locator(`[data-project-tab="${source}"]`)).toHaveAttribute("aria-selected", "true");
    await expect(page.locator(`[data-case-source="tab:${source}"]`)).toHaveAttribute("data-case-active", "true");
    if (interactiveGallery) await expect(image).toHaveAttribute("src", initialImage);
    await tabs.last().evaluate((button) => button.focus({ preventScroll: true }));
    await page.keyboard.press("Home");
    await expect(tabs.first()).toHaveAttribute("aria-selected", "true");
    await expect(page.locator('[role="tabpanel"]:visible')).toHaveCount(1);
    const selectedTab = await tabs.first().getAttribute("data-project-tab");
    if (interactiveGallery) {
      const next = page.locator("[data-gallery-next]");
      await settlePointerTarget(next);
      await next.click();
      await expect(image).not.toHaveAttribute("src", initialImage);
      await image.evaluate((element) => element.decode());
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await expect(page.locator("html")).toHaveAttribute("data-ambient-source", "evidence");
      await expect(page.locator("html")).toHaveAttribute("data-ambient-id", "gallery-1");
    } else {
      await expect(page.locator("[data-gallery-next]")).toHaveCount(0);
    }
    await expect(tabs.first()).toHaveAttribute("aria-selected", "true");
    await page.evaluate((id) => { location.hash = `panel-${id}`; }, selectedTab);
    await expect(page.locator(`#panel-${selectedTab}`)).toBeVisible();
    const columns = await page.evaluate(() => {
      const tabs = document.querySelector(".project-tabs").getBoundingClientRect();
      const panels = document.querySelector(".project-panels").getBoundingClientRect();
      return { tabsRight: tabs.right, panelsLeft: panels.left, tabsTop: tabs.top, panelsTop: panels.top };
    });
    expect(columns.panelsLeft).toBeGreaterThan(columns.tabsRight);
    expect(Math.abs(columns.panelsTop - columns.tabsTop)).toBeLessThan(2);
  }
  await page.setViewportSize({ width: 375, height: 667 });
  await expect(page.locator(".project-tabs")).toHaveAttribute("aria-orientation", "horizontal");
});

test("contact signals preserve direct destinations and scoped subject", async ({ page }) => {
  await preferences(page);
  for (const query of ["", "?assunto=clubal", "?assunto=unknown"]) {
    await page.goto(`/contato/${query}`);
    const personal = page.locator("[data-email-link]");
    const clubal = page.locator("[data-clubal-email-link]");
    const original = await personal.getAttribute("href");
    // Separate focus and scroll setup so WebKit computes hover coordinates after scrolling.
    await personal.evaluate((link) => link.focus({ preventScroll: true }));
    await expect(personal).toHaveAttribute("data-signal-active", "true");
    await expect(personal).toHaveAttribute("href", original);
    await clubal.evaluate((link) => link.focus({ preventScroll: true }));
    await expect(clubal).toHaveAttribute("data-signal-active", "true");
    await expect(personal).toHaveAttribute("data-signal-active", "false");
    if (query.includes("clubal")) {
      await expect(clubal).toHaveAttribute("data-context-channel", "true");
      expect(new URL(await clubal.getAttribute("href")).searchParams.get("subject")).toContain("ClubAL");
    }
    await settlePointerTarget(clubal);
    await clubal.hover();
    await expect.poll(() => clubal.evaluate((link) => link.matches(":hover"))).toBe(true);
    await clubal.evaluate((link) => link.blur());
    await expect(clubal).toHaveAttribute("data-signal-active", "true");
    await page.mouse.move(1, 1);
    await page.locator("[data-theme-toggle]").evaluate((button) => button.focus({ preventScroll: true }));
    await expect(clubal).toHaveAttribute("data-signal-active", "false");
    expect(await page.locator(".contact-main").evaluate((node) => node.style.getPropertyValue("--contact-accent-rgb")))
      .toBe(query.includes("clubal") ? "37 201 151" : "76 164 214");
  }
});

test("explicit gallery atmosphere survives layout resize until subsequent scroll", async ({ page }) => {
  await preferences(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/projetos/clubal/");
  const image = page.locator("[data-project-image]");
  await image.evaluate((element) => element.decode());
  const next = page.locator("[data-gallery-next]");
  await settlePointerTarget(next);
  const scrollBefore = await page.evaluate(() => scrollY);
  await next.click();
  await expect(page.locator("[data-gallery-current]")).toHaveText("2");
  await image.evaluate((element) => element.decode());
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  expect(await page.evaluate(() => scrollY)).toBe(scrollBefore);
  await expect(page.locator("html")).toHaveAttribute("data-ambient-id", "gallery-1");
  await expect(page.locator("html")).toHaveAttribute("data-depth", "mid");
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await expect(page.locator("html")).toHaveAttribute("data-ambient-source", "scroll");
  await expect(page.locator("html")).toHaveAttribute("data-depth", "surface");
});

test("no-JavaScript current and reading-lens links remain useful", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 375, height: 667 } });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.locator("[data-decision-step] a")).toHaveCount(4);
  await expect(page.locator(".work-map-particle")).toHaveCount(7);
  await page.goto("/projetos/clubal/");
  const link = page.locator("[data-case-tab]").first();
  const href = await link.getAttribute("href");
  await link.click();
  await expect(page.locator(href)).toBeVisible();
  await context.close();
});

test("ocean input has no idle frame loop and enlarged text preserves navigation", async ({ page }, testInfo) => {
  await preferences(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => {
    window.__oceanMetrics = { frames: 0, layoutShift: 0, longTasks: [] };
    const requestFrame = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (callback) => {
      if (callback.name === "renderAmbientInput") window.__oceanMetrics.frames += 1;
      return requestFrame(callback);
    };
    if (PerformanceObserver.supportedEntryTypes.includes("layout-shift")) {
      new PerformanceObserver((list) => list.getEntries().forEach((entry) => {
        if (!entry.hadRecentInput) window.__oceanMetrics.layoutShift += entry.value;
      })).observe({ type: "layout-shift", buffered: true });
    }
    if (PerformanceObserver.supportedEntryTypes.includes("longtask")) {
      new PerformanceObserver((list) => list.getEntries().forEach((entry) => window.__oceanMetrics.longTasks.push(entry.duration)))
        .observe({ type: "longtask", buffered: true });
    }
  });
  await page.goto("/");
  await page.mouse.move(30, 200);
  await expect.poll(async () => (await ambientState(page)).x).not.toBe("0.00%");
  const idle = await page.evaluate(async () => {
    await new Promise((resolve) => setTimeout(resolve, 750));
    const before = window.__oceanMetrics.frames;
    await new Promise((resolve) => setTimeout(resolve, 750));
    return { before, after: window.__oceanMetrics.frames, ...window.__oceanMetrics };
  });
  expect(idle.after).toBe(idle.before);
  await testInfo.attach("ocean-local-performance-sample", { body: JSON.stringify(idle, null, 2), contentType: "application/json" });
  await page.setViewportSize({ width: 1280, height: 900 });
  for (const route of ["/", "/projetos/", "/projetos/clubal/", "/contato/"]) {
    await page.goto(route);
    await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    await expect(page.locator(".site-nav")).toBeVisible();
  }
});

test("touch pointer stays static and theme transitions preserve the system choice", async ({ browser, baseURL, browserName }) => {
  const context = await browser.newContext({ baseURL, hasTouch: true, isMobile: browserName !== "firefox", viewport: { width: 375, height: 667 }, reducedMotion: "no-preference" });
  const page = await context.newPage();
  await page.addInitScript(() => {
    sessionStorage.setItem("gui_preferences_v2", JSON.stringify({ theme: "system" }));
    document.cookie = "gui_consent=essential; Path=/; SameSite=Lax";
  });
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-resolved-theme", "light");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-resolved-theme", "dark");
  await page.mouse.move(30, 200);
  await expect.poll(async () => (await ambientState(page)).x).toBe("0.00%");
  const toggle = page.locator("[data-theme-toggle]");
  await toggle.click();
  await expect(toggle).not.toHaveAttribute("aria-busy", "true");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await toggle.click();
  await expect(page.locator("html")).toHaveAttribute("data-resolved-theme", "light");
  await context.close();
});
