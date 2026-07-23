const subjects = {
  clubal: "ClubAL",
  maeve: "Maeve Roscaern",
  "codex-checkpoint": "Codex Checkpoint",
  nexus: "NEXUS",
};

const requestedSubject = new URLSearchParams(location.search).get("assunto");
const productName = subjects[requestedSubject];

if (productName) {
  document.querySelector("[data-contact-lead]").textContent = `Você veio da página ${productName}. Escolha o canal mais confortável para continuar a conversa diretamente com Guilherme.`;
  const emailLink = document.querySelector("[data-email-link]");
  emailLink.href = `mailto:suporte.clubal@gmail.com?subject=${encodeURIComponent(`Contato pelo portal — ${productName}`)}`;
}
