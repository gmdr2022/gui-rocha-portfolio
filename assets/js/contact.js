(() => {
  const root = document.querySelector("[data-contact-contexts]");
  const lead = document.querySelector("[data-contact-lead]");
  const emailLink = document.querySelector("[data-email-link]");
  const clubalEmailLink = document.querySelector("[data-clubal-email-link]");
  const clubalContact = document.querySelector("[data-clubal-contact]");
  if (!root || !lead || !emailLink || !clubalEmailLink) return;

  const channels = [...root.querySelectorAll(".contact-card")];
  const hoverMedia = window.matchMedia("(hover: hover) and (pointer: fine)");
  let contextAccent = "76 164 214";
  const signalChannel = (link) => {
    const index = channels.indexOf(link);
    if (index < 0) return;
    const accentRgb = link === clubalEmailLink ? "37 201 151" : contextAccent;
    root.style.setProperty("--contact-accent-rgb", accentRgb);
    channels.forEach((channel) => { channel.dataset.signalActive = String(channel === link); });
    window.dispatchEvent(new CustomEvent("portal:ambientchange", {
      detail: { source: "contact", id: `contact-${index}`, index, accentRgb, element: link, interactive: true },
    }));
  };
  const restoreSignal = (leavingLink) => {
    const focused = channels.find((channel) => channel === document.activeElement);
    const hovered = hoverMedia.matches ? channels.find((channel) => channel !== leavingLink && channel.matches(":hover")) : null;
    if (focused || hovered) {
      signalChannel(focused || hovered);
      return;
    }
    channels.forEach((channel) => { channel.dataset.signalActive = "false"; });
    root.style.setProperty("--contact-accent-rgb", contextAccent);
    window.dispatchEvent(new CustomEvent("portal:ambientchange", {
      detail: { source: "contact", id: "contact-context", index: 0, accentRgb: contextAccent, element: root.querySelector(".contact-groups") },
    }));
  };
  channels.forEach((link) => {
    link.addEventListener("pointerenter", (event) => {
      if (event.pointerType === "mouse" && hoverMedia.matches) signalChannel(link);
    });
    link.addEventListener("focus", () => signalChannel(link));
    link.addEventListener("pointerleave", () => restoreSignal(link));
    link.addEventListener("blur", () => restoreSignal());
  });

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
  if (/^\d{1,3} \d{1,3} \d{1,3}$/.test(context.accentRgb || "")) contextAccent = context.accentRgb;
  root.style.setProperty("--contact-accent-rgb", contextAccent);

  const render = (template) => String(template || "").replace("{project}", context.name);
  lead.textContent = render(root.dataset.contextLead);

  const usesClubalChannel = context.emailScope === "clubal";
  const scopedEmail = usesClubalChannel ? root.dataset.clubalEmail : root.dataset.personalEmail;
  if (!scopedEmail) return;
  const targetLink = usesClubalChannel ? clubalEmailLink : emailLink;
  const target = new URL(`mailto:${scopedEmail}`);
  target.searchParams.set("subject", render(root.dataset.contextSubject));
  targetLink.href = target.href;
  targetLink.dataset.contextChannel = "true";
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
