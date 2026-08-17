(() => {
  const root = document.querySelector("[data-contact-contexts]");
  const lead = document.querySelector("[data-contact-lead]");
  const emailLink = document.querySelector("[data-email-link]");
  const clubalEmailLink = document.querySelector("[data-clubal-email-link]");
  const clubalContact = document.querySelector("[data-clubal-contact]");
  if (!root || !lead || !emailLink || !clubalEmailLink) return;

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

  const usesClubalChannel = context.emailScope === "clubal";
  const scopedEmail = usesClubalChannel ? root.dataset.clubalEmail : root.dataset.personalEmail;
  if (!scopedEmail) return;
  const targetLink = usesClubalChannel ? clubalEmailLink : emailLink;
  const target = new URL(`mailto:${scopedEmail}`);
  target.searchParams.set("subject", render(root.dataset.contextSubject));
  targetLink.href = target.href;
  if (clubalContact) clubalContact.dataset.contextActive = String(usesClubalChannel);

  const localizedParameter = {
    "pt-BR": "assunto",
    en: "subject",
    es: "asunto",
  };
  const contextParameters = new Set(["assunto", "subject", "asunto", "project", "projeto", "proyecto"]);
  document.querySelectorAll("[data-language-link]").forEach((link) => {
    const parameter = localizedParameter[link.dataset.languageLink];
    if (!parameter) return;
    const localizedTarget = new URL(link.href, location.origin);
    for (const [name, value] of parameters) {
      if (!contextParameters.has(name) && !localizedTarget.searchParams.has(name)) {
        localizedTarget.searchParams.append(name, value);
      }
    }
    contextParameters.forEach((name) => localizedTarget.searchParams.delete(name));
    localizedTarget.searchParams.set(parameter, context.slug);
    link.href = `${localizedTarget.pathname}${localizedTarget.search}`;
  });
})();
