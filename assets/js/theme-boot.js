(() => {
  const root = document.documentElement;
  const preferenceKey = "gui_preferences_v2";
  const allowedThemes = new Set(["system", "dark", "light"]);

  const readCookie = (name) => {
    try {
      const prefix = `${encodeURIComponent(name)}=`;
      const entry = document.cookie.split("; ").find((part) => part.startsWith(prefix));
      return entry ? decodeURIComponent(entry.slice(prefix.length)) : "";
    } catch {
      return "";
    }
  };

  const readStorage = (name) => {
    try {
      return window[name].getItem(preferenceKey) || "";
    } catch {
      return "";
    }
  };

  const parsePreferences = (value) => {
    try {
      return JSON.parse(value) || {};
    } catch {
      return {};
    }
  };

  const storageName = readCookie("gui_consent") === "preferences" ? "localStorage" : "sessionStorage";
  const savedTheme = parsePreferences(readStorage(storageName)).theme;
  const theme = allowedThemes.has(savedTheme) ? savedTheme : "system";
  const resolvedTheme = theme === "system"
    ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : theme;

  root.dataset.theme = theme;
  root.dataset.resolvedTheme = resolvedTheme;
  root.style.colorScheme = resolvedTheme;
  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) themeColor.content = resolvedTheme === "dark" ? "#071725" : "#f4f9fc";
})();
