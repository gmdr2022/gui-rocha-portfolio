(() => {
  const root = document.querySelector("[data-contact-contexts]");
  const lead = document.querySelector("[data-contact-lead]");
  const emailLink = document.querySelector("[data-email-link]");
  if (!root || !lead || !emailLink) return;

  let contexts = [];
  try {
    contexts = JSON.parse(root.dataset.contactContexts || "[]");
  } catch {
    return;
  }

  const parameters = new URLSearchParams(location.search);
  const requested = parameters.get("assunto")
    ?? parameters.get("subject")
    ?? parameters.get("asunto")
    ?? parameters.get("project")
    ?? parameters.get("projeto")
    ?? parameters.get("proyecto");
  const normalized = requested?.trim().toLowerCase();
  if (!normalized) return;

  const context = contexts.find((item) => (
    item.slug === normalized
    || item.aliases?.some((alias) => alias === normalized)
  ));
  if (!context) return;

  const render = (template) => String(template || "").replace("{project}", context.name);
  lead.textContent = render(root.dataset.contextLead);

  const target = new URL(emailLink.href);
  target.searchParams.set("subject", render(root.dataset.contextSubject));
  emailLink.href = target.href;

  const localizedParameter = {
    "pt-BR": "assunto",
    en: "subject",
    es: "asunto",
  };
  document.querySelectorAll("[data-language-link]").forEach((link) => {
    const parameter = localizedParameter[link.dataset.languageLink];
    if (!parameter) return;
    const localizedTarget = new URL(link.href, location.origin);
    localizedTarget.searchParams.set(parameter, context.slug);
    link.href = `${localizedTarget.pathname}${localizedTarget.search}`;
  });
})();
