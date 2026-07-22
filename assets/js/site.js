const root = document.documentElement;
root.classList.remove("no-js");
root.classList.add("js");

const CONSENT_COOKIE = "gui_consent";
const CONSENT_MAX_AGE = 60 * 60 * 24 * 180;
const PREFERENCE_KEY = "gui_preferences_v1";
const THEME_SEQUENCE = ["system", "dark", "light"];

const safeJsonParse = (value, fallback = {}) => {
  try {
    return JSON.parse(value) ?? fallback;
  } catch {
    return fallback;
  }
};

const readCookie = (name) => {
  const prefix = `${encodeURIComponent(name)}=`;
  const item = document.cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(prefix));
  return item ? decodeURIComponent(item.slice(prefix.length)) : null;
};

const writeConsent = (value) => {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${encodeURIComponent(CONSENT_COOKIE)}=${encodeURIComponent(value)}; Max-Age=${CONSENT_MAX_AGE}; Path=/; SameSite=Lax${secure}`;
};

const consentLevel = () => readCookie(CONSENT_COOKIE);
const preferenceStorage = () => (consentLevel() === "preferences" ? localStorage : sessionStorage);

const loadPreferences = () => {
  const persistent = safeJsonParse(localStorage.getItem(PREFERENCE_KEY), {});
  const session = safeJsonParse(sessionStorage.getItem(PREFERENCE_KEY), {});
  return consentLevel() === "preferences" ? persistent : session;
};

const storedPreferences = loadPreferences();
let preferences = {
  theme: document.body.dataset.defaultTheme || "system",
  themeExplicit: false,
  textScale: "normal",
  contrast: false,
  reduceMotion: false,
  readableFont: false,
  ...storedPreferences,
};
if (!storedPreferences.themeExplicit) preferences.theme = document.body.dataset.defaultTheme || "system";

const savePreferences = () => {
  const storage = preferenceStorage();
  storage.setItem(PREFERENCE_KEY, JSON.stringify(preferences));
  if (storage === localStorage) sessionStorage.removeItem(PREFERENCE_KEY);
};

const applyPreferences = () => {
  root.dataset.theme = preferences.theme;
  root.dataset.textScale = preferences.textScale;
  root.dataset.contrast = preferences.contrast ? "high" : "normal";
  root.dataset.motion = preferences.reduceMotion ? "reduced" : "standard";
  root.dataset.font = preferences.readableFont ? "readable" : "default";

  document.querySelectorAll("[data-theme-label]").forEach((element) => {
    const labels = { system: "Tema do sistema", dark: "Tema escuro", light: "Tema claro" };
    element.textContent = labels[preferences.theme];
  });
  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    const labels = { system: "Usando tema do sistema", dark: "Usando tema escuro", light: "Usando tema claro" };
    button.setAttribute("aria-label", `${labels[preferences.theme]}. Alterar tema.`);
    button.dataset.activeTheme = preferences.theme;
  });
};

const cycleTheme = () => {
  const currentIndex = THEME_SEQUENCE.indexOf(preferences.theme);
  preferences.theme = THEME_SEQUENCE[(currentIndex + 1) % THEME_SEQUENCE.length];
  preferences.themeExplicit = true;
  savePreferences();
  applyPreferences();
};

const closeDialog = (dialog) => {
  if (dialog?.open) dialog.close();
};

const globalUi = document.createElement("div");
globalUi.innerHTML = `
  <button class="accessibility-fab" type="button" data-open-accessibility aria-haspopup="dialog" aria-controls="accessibility-panel">
    <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="4.5" r="2.2"></circle><path d="M4.5 8.1c4.7 1.9 10.3 1.9 15 0M12 9.4v10.1M8.2 21l3.8-6.2 3.8 6.2"></path></svg>
    <span class="sr-only">Abrir opções de acessibilidade</span>
  </button>

  <dialog class="utility-dialog accessibility-dialog" id="accessibility-panel" aria-labelledby="accessibility-title">
    <form method="dialog" class="dialog-card">
      <header class="dialog-header">
        <div><span class="dialog-kicker">Experiência</span><h2 id="accessibility-title">Acessibilidade</h2></div>
        <button class="icon-button" value="close" aria-label="Fechar opções de acessibilidade">×</button>
      </header>
      <div class="dialog-body">
        <fieldset class="preference-group">
          <legend>Tamanho do texto</legend>
          <div class="segmented-control" data-text-scale-control>
            <button type="button" data-text-scale="normal">Padrão</button>
            <button type="button" data-text-scale="large">Grande</button>
            <button type="button" data-text-scale="xlarge">Maior</button>
          </div>
        </fieldset>
        <label class="switch-row"><span><strong>Alto contraste</strong><small>Reforça bordas e separação visual.</small></span><input type="checkbox" data-pref="contrast"><i aria-hidden="true"></i></label>
        <label class="switch-row"><span><strong>Reduzir movimento</strong><small>Remove transições e profundidade animada.</small></span><input type="checkbox" data-pref="reduceMotion"><i aria-hidden="true"></i></label>
        <label class="switch-row"><span><strong>Fonte de leitura simples</strong><small>Usa formas mais abertas e espaçamento maior.</small></span><input type="checkbox" data-pref="readableFont"><i aria-hidden="true"></i></label>
      </div>
      <footer class="dialog-footer"><button class="text-button" type="button" data-reset-accessibility>Restaurar padrão</button><button class="button primary compact" value="close">Concluir</button></footer>
    </form>
  </dialog>

  <section class="cookie-banner" data-cookie-banner hidden aria-label="Preferências de cookies">
    <div><span class="dialog-kicker">Privacidade primeiro</span><h2>Este site usa o mínimo necessário.</h2><p>Não há publicidade nem rastreamento. Um cookie registra sua escolha; preferências visuais só ficam salvas se você permitir.</p></div>
    <div class="cookie-actions"><button class="button ghost compact" type="button" data-consent="essential">Somente essenciais</button><button class="button primary compact" type="button" data-consent="preferences">Salvar preferências</button><button class="text-button" type="button" data-open-cookie>Detalhes</button></div>
  </section>

  <dialog class="utility-dialog cookie-dialog" id="cookie-panel" aria-labelledby="cookie-title">
    <form method="dialog" class="dialog-card">
      <header class="dialog-header"><div><span class="dialog-kicker">Controle local</span><h2 id="cookie-title">Cookies e armazenamento</h2></div><button class="icon-button" value="close" aria-label="Fechar preferências de cookies">×</button></header>
      <div class="dialog-body">
        <div class="consent-row"><span><strong>Essencial</strong><small>Guarda a escolha de privacidade por 180 dias.</small></span><b>Sempre ativo</b></div>
        <div class="consent-row"><span><strong>Preferências</strong><small>Salva tema e ajustes de acessibilidade neste navegador.</small></span><label class="mini-switch"><input type="checkbox" data-cookie-preferences><i aria-hidden="true"></i><span class="sr-only">Permitir preferências</span></label></div>
        <div class="consent-row is-muted"><span><strong>Analytics e marketing</strong><small>Nenhum script dessa categoria é carregado.</small></span><b>Não usado</b></div>
        <p class="fine-print">Links externos, como WhatsApp e GitHub, só recebem dados quando você decide abri-los. Consulte a <a href="/privacidade/">política de privacidade</a>.</p>
      </div>
      <footer class="dialog-footer"><button class="button ghost compact" type="button" data-consent="essential">Usar apenas o essencial</button><button class="button primary compact" type="button" data-save-cookie>Salvar escolha</button></footer>
    </form>
  </dialog>
`;
document.body.append(globalUi);

const accessibilityDialog = document.querySelector("#accessibility-panel");
const cookieDialog = document.querySelector("#cookie-panel");
const cookieBanner = document.querySelector("[data-cookie-banner]");

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
  if (level !== "preferences") {
    localStorage.removeItem(PREFERENCE_KEY);
    sessionStorage.setItem(PREFERENCE_KEY, JSON.stringify(preferences));
  } else {
    localStorage.setItem(PREFERENCE_KEY, JSON.stringify(preferences));
    sessionStorage.removeItem(PREFERENCE_KEY);
  }
  cookieBanner.hidden = true;
  document.body.classList.remove("consent-pending");
  closeDialog(cookieDialog);
  syncPreferenceControls();
};

document.addEventListener("click", (event) => {
  const themeButton = event.target.closest("[data-theme-toggle]");
  if (themeButton) cycleTheme();

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
  window.setTimeout(() => {
    cookieBanner.hidden = false;
    document.body.classList.add("consent-pending");
  }, preferences.reduceMotion ? 0 : 500);
}

const currentPath = location.pathname.replace(/\/+$/, "") || "/";
document.querySelectorAll("[data-site-nav]").forEach((link) => {
  const linkPath = new URL(link.href, location.origin).pathname.replace(/\/+$/, "") || "/";
  if (linkPath === currentPath || (linkPath !== "/" && currentPath.startsWith(linkPath))) link.setAttribute("aria-current", "page");
});

document.querySelectorAll("[data-current-year]").forEach((element) => {
  element.textContent = String(new Date().getFullYear());
});

if ("serviceWorker" in navigator && location.protocol === "https:") {
  window.addEventListener("load", () => navigator.serviceWorker.register("/service-worker.js").catch(() => {}));
}
