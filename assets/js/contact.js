(() => {
  const products = {
    clubal: "ClubAL",
    maeve: "Maeve Roscaern",
    "codex-checkpoint": "Codex Checkpoint",
    nexus: "NEXUS",
    "presenca-digital": "presença digital",
    "digital-presence": "digital presence",
    "presencia-digital": "presencia digital",
  };

  const locale = document.body.dataset.locale || "pt-BR";
  const params = new URLSearchParams(location.search);
  const requestedSubject = params.get("assunto") || params.get("subject") || params.get("asunto");
  const productName = products[requestedSubject];

  const copy = {
    "pt-BR": {
      lead: (name) => `Você veio do case ${name}. Escolha o canal mais confortável para continuar a conversa diretamente comigo.`,
      email: (name) => `Contato pelo portfólio — ${name}`,
    },
    en: {
      lead: (name) => `You came from the ${name} case. Choose the most convenient channel to continue the conversation directly with me.`,
      email: (name) => `Portfolio contact — ${name}`,
    },
    es: {
      lead: (name) => `Llegó desde el caso ${name}. Elija el canal más cómodo para continuar la conversación directamente conmigo.`,
      email: (name) => `Contacto desde el portafolio — ${name}`,
    },
  }[locale];

  if (productName && copy) {
    document.querySelector("[data-contact-lead]").textContent = copy.lead(productName);
    const emailLink = document.querySelector("[data-email-link]");
    emailLink.href = `mailto:suporte.clubal@gmail.com?subject=${encodeURIComponent(copy.email(productName))}`;
  }
})();
