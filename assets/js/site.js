const root = document.documentElement;
root.classList.remove("no-js");
root.classList.add("js");

const locale = document.body.dataset.locale || "pt-BR";
const CONSENT_COOKIE = "gui_consent";
const CONSENT_MAX_AGE = 60 * 60 * 24 * 180;
const PREFERENCE_KEY = "gui_preferences_v2";
const THEME_SEQUENCE = ["system", "dark", "light"];

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
      title: "Este site usa somente o necessário.",
      body: "Não há publicidade nem rastreamento. Um cookie registra sua escolha; preferências visuais só ficam salvas se você permitir.",
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
      title: "This site uses only what is necessary.",
      body: "There is no advertising or tracking. One cookie records your choice; visual preferences are saved only when you allow them.",
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
      title: "Este sitio usa solo lo necesario.",
      body: "No hay publicidad ni seguimiento. Una cookie registra su elección; las preferencias visuales solo se guardan con su permiso.",
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

const savePreferences = () => writeStorage(preferenceStorageName(), PREFERENCE_KEY, JSON.stringify(preferences));

const applyPreferences = () => {
  root.dataset.theme = preferences.theme;
  root.dataset.textScale = preferences.textScale;
  root.dataset.contrast = preferences.contrast ? "high" : "normal";
  root.dataset.motion = preferences.reduceMotion ? "reduced" : "standard";
  root.dataset.font = preferences.readableFont ? "readable" : "default";
  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    button.dataset.activeTheme = preferences.theme;
    button.setAttribute("aria-label", `${ui.theme[preferences.theme]}. ${ui.theme.action}.`);
    button.title = ui.theme[preferences.theme];
    const label = button.querySelector("[data-theme-label]");
    if (label) label.textContent = ui.theme[preferences.theme];
  });
};

const cycleTheme = () => {
  const index = THEME_SEQUENCE.indexOf(preferences.theme);
  preferences.theme = THEME_SEQUENCE[(index + 1) % THEME_SEQUENCE.length];
  savePreferences();
  applyPreferences();
};

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
    <div class="cookie-actions"><button class="button secondary compact" type="button" data-consent="essential">${ui.cookies.essential}</button><button class="button primary compact" type="button" data-consent="preferences">${ui.cookies.preferences}</button><button class="text-button" type="button" data-open-cookie>${ui.cookies.details}</button></div>
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

const closeDialog = (dialog) => {
  if (dialog?.open) dialog.close();
};

const syncPreferenceControls = () => {
  document.querySelectorAll("[data-text-scale]").forEach((button) => {
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

document.addEventListener("click", (event) => {
  if (event.target.closest("[data-theme-toggle]")) cycleTheme();

  if (event.target.closest("[data-open-accessibility]")) {
    syncPreferenceControls();
    accessibilityDialog.showModal();
  }
  if (event.target.closest("[data-open-cookie]")) {
    syncPreferenceControls();
    cookieDialog.showModal();
  }

  const consentButton = event.target.closest("[data-consent]");
  if (consentButton) setConsent(consentButton.dataset.consent);

  const textScaleButton = event.target.closest("[data-text-scale]");
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
});

applyPreferences();
syncPreferenceControls();

if (!consentLevel()) {
  cookieBanner.hidden = false;
}

const page = document.body.dataset.page;
const activeNav = page === "project" ? "home" : page;
document.querySelector(`[data-site-nav="${activeNav}"]`)?.setAttribute("aria-current", "page");

document.querySelectorAll("[data-current-year]").forEach((element) => {
  element.textContent = String(new Date().getFullYear());
});

if ("serviceWorker" in navigator && location.protocol === "https:") {
  window.addEventListener("load", () => navigator.serviceWorker.register("/service-worker.js").catch(() => {}));
}
