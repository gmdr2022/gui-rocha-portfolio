const root = document.documentElement;
root.classList.remove("no-js");
root.classList.add("js");

const locale = document.body.dataset.locale || "pt-BR";
const CONSENT_COOKIE = "gui_consent";
const CONSENT_MAX_AGE = 60 * 60 * 24 * 180;
const PREFERENCE_KEY = "gui_preferences_v2";
const THEME_SEQUENCE = ["system", "dark", "light"];
const PROTECTED_MEDIA_SELECTOR = "[data-protected-media]";

const ui = {
  "pt-BR": {
    theme: { system: "Tema: sistema", dark: "Tema: escuro", light: "Tema: claro", action: "Alterar tema" },
    accessibility: {
      open: "Abrir opções de acessibilidade",
      kicker: "Experiência",
      title: "Acessibilidade",
      close: "Fechar opções de acessibilidade",
      textSize: "Tamanho do texto",
      normal: "Padrão",
      large: "Grande",
      xlarge: "Maior",
      contrast: "Alto contraste",
      contrastHelp: "Reforça bordas e separação visual.",
      motion: "Reduzir movimento",
      motionHelp: "Remove transições e profundidade animada.",
      font: "Fonte de leitura simples",
      fontHelp: "Usa formas abertas e espaçamento maior.",
      reset: "Restaurar padrão",
      done: "Concluir",
    },
    cookies: {
      label: "Preferências de cookies",
      kicker: "Privacidade",
      title: "Somente o necessário.",
      body: "Sem publicidade ou rastreamento. Salvar preferências permite lembrar tema e acessibilidade.",
      essential: "Somente essenciais",
      preferences: "Salvar preferências",
      details: "Detalhes",
      dialogKicker: "Controle local",
      dialogTitle: "Cookies e armazenamento",
      close: "Fechar preferências de cookies",
      essentialTitle: "Essencial",
      essentialHelp: "Guarda sua escolha de privacidade por 180 dias.",
      always: "Sempre ativo",
      preferencesTitle: "Preferências",
      preferencesHelp: "Salva tema e ajustes de acessibilidade neste navegador.",
      allowPreferences: "Permitir preferências",
      analyticsTitle: "Analytics e marketing",
      analyticsHelp: "Nenhum script dessa categoria é carregado.",
      unused: "Não usado",
      fine: "Links externos só recebem uma navegação quando você decide abri-los.",
      privacy: "Política de privacidade",
      privacyHref: "/privacidade/",
      save: "Salvar escolha",
    },
  },
  en: {
    theme: { system: "Theme: system", dark: "Theme: dark", light: "Theme: light", action: "Change theme" },
    accessibility: {
      open: "Open accessibility options",
      kicker: "Experience",
      title: "Accessibility",
      close: "Close accessibility options",
      textSize: "Text size",
      normal: "Default",
      large: "Large",
      xlarge: "Larger",
      contrast: "High contrast",
      contrastHelp: "Strengthens borders and visual separation.",
      motion: "Reduce motion",
      motionHelp: "Removes transitions and depth effects.",
      font: "Simple reading font",
      fontHelp: "Uses open letterforms and more spacing.",
      reset: "Restore defaults",
      done: "Done",
    },
    cookies: {
      label: "Cookie preferences",
      kicker: "Privacy",
      title: "Only what is necessary.",
      body: "No advertising or tracking. Save preferences to remember your theme and accessibility settings.",
      essential: "Essential only",
      preferences: "Save preferences",
      details: "Details",
      dialogKicker: "Local control",
      dialogTitle: "Cookies and storage",
      close: "Close cookie preferences",
      essentialTitle: "Essential",
      essentialHelp: "Stores your privacy choice for 180 days.",
      always: "Always active",
      preferencesTitle: "Preferences",
      preferencesHelp: "Saves theme and accessibility settings in this browser.",
      allowPreferences: "Allow preferences",
      analyticsTitle: "Analytics and marketing",
      analyticsHelp: "No script in this category is loaded.",
      unused: "Not used",
      fine: "External links receive a navigation only when you choose to open them.",
      privacy: "Privacy policy",
      privacyHref: "/en/privacy/",
      save: "Save choice",
    },
  },
  es: {
    theme: { system: "Tema: sistema", dark: "Tema: oscuro", light: "Tema: claro", action: "Cambiar tema" },
    accessibility: {
      open: "Abrir opciones de accesibilidad",
      kicker: "Experiencia",
      title: "Accesibilidad",
      close: "Cerrar opciones de accesibilidad",
      textSize: "Tamaño del texto",
      normal: "Predeterminado",
      large: "Grande",
      xlarge: "Mayor",
      contrast: "Alto contraste",
      contrastHelp: "Refuerza bordes y separación visual.",
      motion: "Reducir movimiento",
      motionHelp: "Elimina transiciones y efectos de profundidad.",
      font: "Fuente de lectura sencilla",
      fontHelp: "Usa formas abiertas y más espacio.",
      reset: "Restaurar valores",
      done: "Terminar",
    },
    cookies: {
      label: "Preferencias de cookies",
      kicker: "Privacidad",
      title: "Solo lo necesario.",
      body: "Sin publicidad ni seguimiento. Guardar preferencias permite recordar el tema y la accesibilidad.",
      essential: "Solo esenciales",
      preferences: "Guardar preferencias",
      details: "Detalles",
      dialogKicker: "Control local",
      dialogTitle: "Cookies y almacenamiento",
      close: "Cerrar preferencias de cookies",
      essentialTitle: "Esencial",
      essentialHelp: "Guarda su elección de privacidad durante 180 días.",
      always: "Siempre activo",
      preferencesTitle: "Preferencias",
      preferencesHelp: "Guarda tema y ajustes de accesibilidad en este navegador.",
      allowPreferences: "Permitir preferencias",
      analyticsTitle: "Analítica y marketing",
      analyticsHelp: "No se carga ningún script de esta categoría.",
      unused: "No utilizado",
      fine: "Los enlaces externos solo reciben una navegación cuando usted decide abrirlos.",
      privacy: "Política de privacidad",
      privacyHref: "/es/privacidad/",
      save: "Guardar elección",
    },
  },
}[locale] || null;

const safeJsonParse = (value, fallback = {}) => {
  try {
    return JSON.parse(value) ?? fallback;
  } catch {
    return fallback;
  }
};

const storageArea = (name) => {
  try {
    return window[name];
  } catch {
    return null;
  }
};

const readStorage = (name, key) => {
  try {
    return storageArea(name)?.getItem(key) ?? null;
  } catch {
    return null;
  }
};

const writeStorage = (name, key, value) => {
  try {
    storageArea(name)?.setItem(key, value);
  } catch {
    // Preferences remain active for the current page when storage is unavailable.
  }
};

const removeStorage = (name, key) => {
  try {
    storageArea(name)?.removeItem(key);
  } catch {
    // A blocked storage area is equivalent to an already-removed preference.
  }
};

const readCookie = (name) => {
  try {
    const prefix = `${encodeURIComponent(name)}=`;
    const item = document.cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(prefix));
    return item ? decodeURIComponent(item.slice(prefix.length)) : null;
  } catch {
    return null;
  }
};

const writeConsent = (value) => {
  try {
    const secure = location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${encodeURIComponent(CONSENT_COOKIE)}=${encodeURIComponent(value)}; Max-Age=${CONSENT_MAX_AGE}; Path=/; SameSite=Lax${secure}`;
  } catch {
    // The interface still works for the current page when cookies are blocked.
  }
};

const consentLevel = () => readCookie(CONSENT_COOKIE);
const preferenceStorageName = () => (consentLevel() === "preferences" ? "localStorage" : "sessionStorage");
const storedPreferences = consentLevel() === "preferences"
  ? safeJsonParse(readStorage("localStorage", PREFERENCE_KEY), {})
  : safeJsonParse(readStorage("sessionStorage", PREFERENCE_KEY), {});

let preferences = {
  theme: "system",
  textScale: "normal",
  contrast: false,
  reduceMotion: false,
  readableFont: false,
  ...storedPreferences,
};
if (!THEME_SEQUENCE.includes(preferences.theme)) preferences.theme = "system";

const savePreferences = () => writeStorage(preferenceStorageName(), PREFERENCE_KEY, JSON.stringify(preferences));

const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
const systemReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const usesFirefoxThemeFallback = /firefox\//i.test(navigator.userAgent);
const resolvedTheme = () => (
  preferences.theme === "system" ? (systemTheme.matches ? "dark" : "light") : preferences.theme
);

const syncThemeDocument = () => {
  const resolved = resolvedTheme();
  root.dataset.resolvedTheme = resolved;
  root.style.colorScheme = resolved;
  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) themeColor.content = resolved === "dark" ? "#071725" : "#f4f9fc";
};

const applyPreferences = () => {
  root.dataset.theme = preferences.theme;
  root.dataset.textScale = preferences.textScale;
  root.dataset.contrast = preferences.contrast ? "high" : "normal";
  root.dataset.motion = preferences.reduceMotion ? "reduced" : "standard";
  root.dataset.font = preferences.readableFont ? "readable" : "default";
  syncThemeDocument();
  window.dispatchEvent(new Event("portal:preferenceschange"));
  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    button.dataset.activeTheme = preferences.theme;
    button.setAttribute("aria-label", `${ui.theme[preferences.theme]}. ${ui.theme.action}.`);
    button.title = ui.theme[preferences.theme];
    const label = button.querySelector("[data-theme-label]");
    if (label) label.textContent = ui.theme[preferences.theme];
  });
};

let themeTransitionActive = false;

const cycleTheme = async (button) => {
  if (themeTransitionActive) return;
  const index = THEME_SEQUENCE.indexOf(preferences.theme);
  const nextTheme = THEME_SEQUENCE[(index + 1) % THEME_SEQUENCE.length];
  const applyNextTheme = () => {
    preferences.theme = nextTheme;
    savePreferences();
    applyPreferences();
  };
  const reduceMotion = preferences.reduceMotion || systemReducedMotion.matches;
  if (!document.startViewTransition || usesFirefoxThemeFallback || reduceMotion || !button) {
    applyNextTheme();
    return;
  }

  const bounds = button.getBoundingClientRect();
  const originX = bounds.left + bounds.width / 2;
  const originY = bounds.top + bounds.height / 2;
  const radius = Math.hypot(
    Math.max(originX, window.innerWidth - originX),
    Math.max(originY, window.innerHeight - originY),
  );
  root.style.setProperty("--theme-origin-x", `${originX}px`);
  root.style.setProperty("--theme-origin-y", `${originY}px`);
  root.style.setProperty("--theme-radius", `${radius}px`);
  themeTransitionActive = true;
  button.setAttribute("aria-busy", "true");
  try {
    const transition = document.startViewTransition(applyNextTheme);
    await transition.ready;
    const animation = root.animate(
      {
        clipPath: [
          `circle(0 at ${originX}px ${originY}px)`,
          `circle(${radius}px at ${originX}px ${originY}px)`,
        ],
      },
      {
        duration: 420,
        easing: "cubic-bezier(.2,.8,.2,1)",
        pseudoElement: "::view-transition-new(root)",
      },
    );
    await Promise.allSettled([animation.finished, transition.finished]);
  } catch {
    if (preferences.theme !== nextTheme) applyNextTheme();
  } finally {
    themeTransitionActive = false;
    button.removeAttribute("aria-busy");
  }
};

const handleSystemThemeChange = () => {
  if (preferences.theme === "system") syncThemeDocument();
};
if (systemTheme.addEventListener) systemTheme.addEventListener("change", handleSystemThemeChange);
else systemTheme.addListener?.(handleSystemThemeChange);

const ambientOceanBase = [76, 164, 214];
const ambientDepths = {
  surface: { y: "24%", strength: 0.16, color: [76, 164, 214] },
  mid: { y: "46%", strength: 0.19, color: [48, 170, 184] },
  deep: { y: "64%", strength: 0.22, color: [88, 132, 209] },
  footer: { y: "76%", strength: 0.18, color: [63, 157, 180] },
};
let ambientColor = [...ambientOceanBase];
let ambientIndex = 0;
let ambientDepth = "surface";
let ambientSection = null;
const ambientSelections = new WeakMap();
let ambientFrame = 0;
let ambientPointer = { x: 0, y: 0 };
let ambientNeedsDepth = true;
const ambientPointerMedia = window.matchMedia("(hover: hover) and (pointer: fine)");
const ambientForcedColors = window.matchMedia("(forced-colors: active)");
const depthElements = [...document.querySelectorAll("[data-depth]")];

const parseAmbientRgb = (value) => {
  const parts = Array.isArray(value) ? value : String(value ?? "").trim().split(/[\s,]+/);
  if (parts.length !== 3) return null;
  const channels = parts.map((part) => Number(part));
  if (channels.some((channel) => !Number.isFinite(channel) || channel < 0 || channel > 255)) return null;
  return channels;
};

const applyAmbientState = () => {
  const depth = ambientDepths[ambientDepth] || ambientDepths.surface;
  const position = 22 + ((ambientIndex % 7) / 6) * 56;
  root.style.setProperty("--ambient-r", String(ambientColor[0]));
  root.style.setProperty("--ambient-g", String(ambientColor[1]));
  root.style.setProperty("--ambient-b", String(ambientColor[2]));
  root.style.setProperty("--ambient-x", `${position.toFixed(2)}%`);
  root.style.setProperty("--ambient-y", depth.y);
  root.style.setProperty("--ambient-strength", String(depth.strength));
  root.dataset.depth = ambientDepth;
};

window.addEventListener("portal:ambientchange", (event) => {
  const detail = event instanceof CustomEvent ? event.detail : null;
  const rgb = parseAmbientRgb(detail?.accentRgb);
  const index = Number(detail?.index);
  if (!rgb || !Number.isInteger(index) || index < 0 || index > 999) return;
  if (typeof detail?.id !== "string" || !detail.id.trim() || !["project", "context", "decision", "work-map", "contact", "evidence"].includes(detail?.source)) return;
  const color = rgb.map((channel, channelIndex) => Math.round(
    ambientOceanBase[channelIndex] * 0.22 + channel * 0.78,
  ));
  const section = detail.element instanceof Element ? detail.element.closest("[data-depth]") : null;
  if (section && depthElements.includes(section)) {
    ambientSelections.set(section, { color, index, id: detail.id.slice(0, 64), source: detail.source });
    if (section !== ambientSection) {
      const bounds = section.getBoundingClientRect();
      if (!detail.interactive || bounds.bottom <= 0 || bounds.top >= window.innerHeight) return;
      // Explicit input in a visible neighboring section takes precedence until the next scroll.
      ambientSection = section;
      ambientDepth = section.dataset.depth;
    }
  }
  ambientColor = color;
  ambientIndex = index;
  root.dataset.ambientId = detail.id.slice(0, 64);
  root.dataset.ambientSource = detail.source;
  applyAmbientState();
});

const ambientPointerEnabled = () => ambientPointerMedia.matches
  && !preferences.reduceMotion && !systemReducedMotion.matches
  && !ambientForcedColors.matches && !document.hidden;

const updateAmbientDepth = () => {
  // Compare distance to the reading line, not ratios of differently sized sections.
  const readingLine = window.innerHeight * 0.46;
  let closest = null;
  let closestDistance = Infinity;
  depthElements.forEach((element) => {
    const bounds = element.getBoundingClientRect();
    if (bounds.bottom <= 0 || bounds.top >= window.innerHeight || !bounds.height) return;
    const distance = Math.max(bounds.top - readingLine, readingLine - bounds.bottom, 0);
    if (distance < closestDistance) {
      closest = element;
      closestDistance = distance;
    }
  });
  if (!closest || closest === ambientSection || !ambientDepths[closest.dataset.depth]) return;
  ambientSection = closest;
  ambientDepth = closest.dataset.depth;
  const selection = ambientSelections.get(closest);
  ambientColor = selection?.color || [...ambientDepths[ambientDepth].color];
  ambientIndex = selection?.index || 0;
  if (selection) root.dataset.ambientId = selection.id;
  else delete root.dataset.ambientId;
  root.dataset.ambientSource = selection?.source || "scroll";
  applyAmbientState();
};

const renderAmbientInput = () => {
  ambientFrame = 0;
  if (document.hidden) return;
  if (ambientNeedsDepth) {
    updateAmbientDepth();
    ambientNeedsDepth = false;
  }
  const pointer = ambientPointerEnabled() ? ambientPointer : { x: 0, y: 0 };
  root.style.setProperty("--ambient-pointer-x", `${pointer.x.toFixed(2)}%`);
  root.style.setProperty("--ambient-pointer-y", `${pointer.y.toFixed(2)}%`);
};

const scheduleAmbientInput = () => {
  if (!ambientFrame && !document.hidden) ambientFrame = window.requestAnimationFrame(renderAmbientInput);
};
const resetAmbientPointer = () => {
  ambientPointer = { x: 0, y: 0 };
  scheduleAmbientInput();
};
const scheduleAmbientDepth = () => {
  ambientNeedsDepth = true;
  scheduleAmbientInput();
};

// Input schedules one frame; CSS settles the light without an idle animation loop.
window.addEventListener("pointermove", (event) => {
  if (event.pointerType !== "mouse" || !ambientPointerEnabled()) return;
  ambientPointer = {
    x: (Math.max(0, Math.min(1, event.clientX / window.innerWidth)) - 0.5) * 8,
    y: (Math.max(0, Math.min(1, event.clientY / window.innerHeight)) - 0.5) * 6,
  };
  scheduleAmbientInput();
}, { passive: true });
document.documentElement.addEventListener("pointerleave", resetAmbientPointer);
window.addEventListener("blur", resetAmbientPointer);
window.addEventListener("scroll", scheduleAmbientDepth, { passive: true });
window.addEventListener("resize", scheduleAmbientDepth, { passive: true });
window.addEventListener("pageshow", scheduleAmbientDepth);
window.addEventListener("portal:preferenceschange", resetAmbientPointer);
ambientPointerMedia.addEventListener?.("change", resetAmbientPointer);
ambientForcedColors.addEventListener?.("change", resetAmbientPointer);
systemReducedMotion.addEventListener?.("change", resetAmbientPointer);
document.addEventListener("visibilitychange", () => {
  if (ambientFrame) window.cancelAnimationFrame(ambientFrame);
  ambientFrame = 0;
  ambientPointer = { x: 0, y: 0 };
  scheduleAmbientDepth();
});
applyAmbientState();
updateAmbientDepth();

if (typeof window.ResizeObserver === "function") {
  const ambientResizeObserver = new ResizeObserver(scheduleAmbientDepth);
  depthElements.forEach((element) => ambientResizeObserver.observe(element));
}

const globalUi = document.createElement("div");
globalUi.className = "global-utilities";
globalUi.innerHTML = `
  <button class="icon-button accessibility-button" type="button" data-open-accessibility aria-haspopup="dialog" aria-controls="accessibility-panel">
    <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="4.5" r="2.2"></circle><path d="M4.5 8.1c4.7 1.9 10.3 1.9 15 0M12 9.4v10.1M8.2 21l3.8-6.2 3.8 6.2"></path></svg>
    <span class="sr-only">${ui.accessibility.open}</span>
  </button>

  <dialog class="utility-dialog" id="accessibility-panel" aria-labelledby="accessibility-title">
    <form method="dialog" class="dialog-card">
      <header class="dialog-header">
        <div><span class="dialog-kicker">${ui.accessibility.kicker}</span><h2 id="accessibility-title">${ui.accessibility.title}</h2></div>
        <button class="dialog-close" value="close" aria-label="${ui.accessibility.close}">×</button>
      </header>
      <div class="dialog-body">
        <fieldset class="preference-group">
          <legend>${ui.accessibility.textSize}</legend>
          <div class="segmented-control">
            <button type="button" data-text-scale="normal">${ui.accessibility.normal}</button>
            <button type="button" data-text-scale="large">${ui.accessibility.large}</button>
            <button type="button" data-text-scale="xlarge">${ui.accessibility.xlarge}</button>
          </div>
        </fieldset>
        <label class="switch-row"><span><strong>${ui.accessibility.contrast}</strong><small>${ui.accessibility.contrastHelp}</small></span><input type="checkbox" data-pref="contrast"><i aria-hidden="true"></i></label>
        <label class="switch-row"><span><strong>${ui.accessibility.motion}</strong><small>${ui.accessibility.motionHelp}</small></span><input type="checkbox" data-pref="reduceMotion"><i aria-hidden="true"></i></label>
        <label class="switch-row"><span><strong>${ui.accessibility.font}</strong><small>${ui.accessibility.fontHelp}</small></span><input type="checkbox" data-pref="readableFont"><i aria-hidden="true"></i></label>
      </div>
      <footer class="dialog-footer"><button class="text-button" type="button" data-reset-accessibility>${ui.accessibility.reset}</button><button class="button primary compact" value="close">${ui.accessibility.done}</button></footer>
    </form>
  </dialog>

  <section class="cookie-banner" data-cookie-banner hidden aria-label="${ui.cookies.label}">
    <div><span class="dialog-kicker">${ui.cookies.kicker}</span><h2>${ui.cookies.title}</h2><p>${ui.cookies.body}</p></div>
    <div class="cookie-actions"><button class="button secondary compact" type="button" data-consent="essential">${ui.cookies.essential}</button><button class="button secondary compact" type="button" data-consent="preferences">${ui.cookies.preferences}</button><button class="text-button" type="button" data-open-cookie>${ui.cookies.details}</button></div>
  </section>

  <dialog class="utility-dialog" id="cookie-panel" aria-labelledby="cookie-title">
    <form method="dialog" class="dialog-card">
      <header class="dialog-header"><div><span class="dialog-kicker">${ui.cookies.dialogKicker}</span><h2 id="cookie-title">${ui.cookies.dialogTitle}</h2></div><button class="dialog-close" value="close" aria-label="${ui.cookies.close}">×</button></header>
      <div class="dialog-body">
        <div class="consent-row"><span><strong>${ui.cookies.essentialTitle}</strong><small>${ui.cookies.essentialHelp}</small></span><b>${ui.cookies.always}</b></div>
        <div class="consent-row"><span><strong>${ui.cookies.preferencesTitle}</strong><small>${ui.cookies.preferencesHelp}</small></span><label class="mini-switch"><input type="checkbox" data-cookie-preferences><i aria-hidden="true"></i><span class="sr-only">${ui.cookies.allowPreferences}</span></label></div>
        <div class="consent-row is-muted"><span><strong>${ui.cookies.analyticsTitle}</strong><small>${ui.cookies.analyticsHelp}</small></span><b>${ui.cookies.unused}</b></div>
        <p class="fine-print">${ui.cookies.fine} <a href="${ui.cookies.privacyHref}">${ui.cookies.privacy}</a>.</p>
      </div>
      <footer class="dialog-footer"><button class="button secondary compact" type="button" data-consent="essential">${ui.cookies.essential}</button><button class="button primary compact" type="button" data-save-cookie>${ui.cookies.save}</button></footer>
    </form>
  </dialog>
`;
document.body.prepend(globalUi);
const accessibilityButton = globalUi.querySelector("[data-open-accessibility]");
const themeButton = document.querySelector("[data-theme-toggle]");
themeButton?.before(accessibilityButton);

const accessibilityDialog = document.querySelector("#accessibility-panel");
const cookieDialog = document.querySelector("#cookie-panel");
const cookieBanner = document.querySelector("[data-cookie-banner]");
const dialogOpeners = new WeakMap();

const openDialog = (dialog, opener) => {
  if (!dialog || dialog.open) return;
  if (opener) dialogOpeners.set(dialog, opener);
  dialog.showModal();
};

const closeDialog = (dialog) => {
  if (dialog?.open) dialog.close();
};

const syncPreferenceControls = () => {
  globalUi.querySelectorAll("button[data-text-scale]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.textScale === preferences.textScale));
  });
  document.querySelectorAll("[data-pref]").forEach((input) => {
    input.checked = Boolean(preferences[input.dataset.pref]);
  });
  const cookiePreferences = document.querySelector("[data-cookie-preferences]");
  if (cookiePreferences) cookiePreferences.checked = consentLevel() === "preferences";
};

const setConsent = (level) => {
  writeConsent(level);
  if (level === "preferences") {
    writeStorage("localStorage", PREFERENCE_KEY, JSON.stringify(preferences));
    removeStorage("sessionStorage", PREFERENCE_KEY);
  } else {
    removeStorage("localStorage", PREFERENCE_KEY);
    writeStorage("sessionStorage", PREFERENCE_KEY, JSON.stringify(preferences));
  }
  cookieBanner.hidden = true;
  closeDialog(cookieDialog);
  syncPreferenceControls();
};

const eventTargetsProtectedMedia = (event) => event.composedPath().some((node) => (
  node instanceof Element && node.matches(PROTECTED_MEDIA_SELECTOR)
));

const preventProtectedMediaAction = (event) => {
  if (eventTargetsProtectedMedia(event)) event.preventDefault();
};

document.addEventListener("contextmenu", preventProtectedMediaAction, { capture: true });
document.addEventListener("dragstart", preventProtectedMediaAction, { capture: true });

const languageSwitchers = [...document.querySelectorAll(".language-switcher")];

const closeLanguageSwitchers = (except = null) => {
  languageSwitchers.forEach((switcher) => {
    if (switcher !== except) switcher.removeAttribute("open");
  });
};

languageSwitchers.forEach((switcher) => {
  switcher.addEventListener("toggle", () => {
    if (switcher.open) closeLanguageSwitchers(switcher);
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  const openSwitcher = languageSwitchers.find((switcher) => switcher.open);
  if (!openSwitcher) return;
  event.preventDefault();
  openSwitcher.removeAttribute("open");
  openSwitcher.querySelector("summary")?.focus();
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".language-switcher")) closeLanguageSwitchers();
  const clickedThemeButton = event.target.closest("[data-theme-toggle]");
  if (clickedThemeButton) void cycleTheme(clickedThemeButton);

  const accessibilityOpener = event.target.closest("[data-open-accessibility]");
  if (accessibilityOpener) {
    syncPreferenceControls();
    openDialog(accessibilityDialog, accessibilityOpener);
  }
  const cookieOpener = event.target.closest("[data-open-cookie]");
  if (cookieOpener) {
    syncPreferenceControls();
    openDialog(cookieDialog, cookieOpener);
  }

  const consentButton = event.target.closest("[data-consent]");
  if (consentButton) setConsent(consentButton.dataset.consent);

  const textScaleButton = event.target.closest("button[data-text-scale]");
  if (textScaleButton) {
    preferences.textScale = textScaleButton.dataset.textScale;
    savePreferences();
    applyPreferences();
    syncPreferenceControls();
  }

  if (event.target.closest("[data-reset-accessibility]")) {
    preferences = { ...preferences, textScale: "normal", contrast: false, reduceMotion: false, readableFont: false };
    savePreferences();
    applyPreferences();
    syncPreferenceControls();
  }
});

document.addEventListener("change", (event) => {
  const input = event.target.closest("[data-pref]");
  if (!input) return;
  preferences[input.dataset.pref] = input.checked;
  savePreferences();
  applyPreferences();
});

document.querySelector("[data-save-cookie]")?.addEventListener("click", () => {
  const allowPreferences = document.querySelector("[data-cookie-preferences]")?.checked;
  setConsent(allowPreferences ? "preferences" : "essential");
});

document.querySelectorAll("dialog").forEach((dialog) => {
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) closeDialog(dialog);
  });
  dialog.addEventListener("close", () => {
    const opener = dialogOpeners.get(dialog);
    dialogOpeners.delete(dialog);
    if (opener?.isConnected) opener.focus({ preventScroll: true });
  });
});

applyPreferences();
syncPreferenceControls();

if (!consentLevel()) {
  cookieBanner.hidden = false;
}

document.querySelectorAll("[data-current-year]").forEach((element) => {
  element.textContent = String(new Date().getFullYear());
});

const scrollProgress = document.querySelector("[data-scroll-progress]");
const scrollProgressTrack = scrollProgress?.closest(".site-scroll-progress");
let scrollProgressFrame = 0;

const updateScrollProgress = () => {
  if (!scrollProgress || !scrollProgressTrack) return;
  const range = Math.max(root.scrollHeight - window.innerHeight, 0);
  const ratio = range > 0 ? Math.min(Math.max(window.scrollY / range, 0), 1) : 0;
  scrollProgressTrack.hidden = range < 4;
  scrollProgress.style.transform = `scaleX(${ratio.toFixed(4)})`;
  scrollProgressFrame = 0;
};

const requestScrollProgress = () => {
  if (scrollProgressFrame) return;
  scrollProgressFrame = window.requestAnimationFrame(updateScrollProgress);
};

if (scrollProgress) {
  updateScrollProgress();
  window.addEventListener("scroll", requestScrollProgress, { passive: true });
  window.addEventListener("resize", requestScrollProgress);
  window.addEventListener("load", requestScrollProgress);
  if (typeof window.ResizeObserver === "function") {
    new window.ResizeObserver(requestScrollProgress).observe(document.body);
  }
}

const retireLegacyServiceWorker = async () => {
  const wasControlled = Boolean(navigator.serviceWorker.controller);
  const registrations = await navigator.serviceWorker.getRegistrations();
  const localRegistrations = registrations.filter((registration) => (
    registration.scope === `${location.origin}/`
  ));

  await Promise.all(localRegistrations.map((registration) => registration.unregister()));

  if ("caches" in window) {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter((name) => name.startsWith("gui-rocha-"))
        .map((name) => caches.delete(name)),
    );
  }

  if (wasControlled && localRegistrations.length && !sessionStorage.getItem("gui-sw-retired")) {
    sessionStorage.setItem("gui-sw-retired", "1");
    location.reload();
  }
};

if ("serviceWorker" in navigator && location.protocol === "https:") {
  window.addEventListener("load", () => {
    retireLegacyServiceWorker().catch(() => {});
  });
}
