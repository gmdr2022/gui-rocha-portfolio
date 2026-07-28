import { readFile, readdir, stat } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { localeOrder, locales } from "../content/pages.mjs";

const root = resolve(process.cwd());
const origin = "https://gui-rocha.pages.dev";
const errors = [];
const requiredProjectSlugs = ["clubal", "maeve", "demonyza", "codex-checkpoint", "nexus", "local-first-checklist", "c7-engineering-system"];
const expectedProjectDimensions = {
  clubal: [1920, 1080],
  maeve: [1672, 941],
  demonyza: [1600, 900],
  "codex-checkpoint": [1920, 1080],
  nexus: [1180, 760],
  "local-first-checklist": [1600, 1000],
  "c7-engineering-system": [1600, 1000],
};
const projectFiles = { "pt-BR": "projects.json", en: "projects.en.json", es: "projects.es.json" };
const conceptLabels = { "pt-BR": "Imagem conceito", en: "Concept image", es: "Imagen conceptual" };
const ignoredDirectories = new Set([".git", ".wrangler", "dist", "node_modules", "output"]);

const walk = async (directory) => {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else files.push(path);
  }
  return files;
};

const exists = async (path) => {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
};

const routeFor = (locale, type, slug = "") => {
  const config = locales[locale];
  if (type === "home") return config.home;
  if (type === "about") return config.routes.about;
  if (type === "contact") return config.routes.contact;
  if (type === "privacy") return config.routes.privacy;
  return `${config.routes.projects}${slug}/`;
};

const localTarget = (value) => {
  const clean = value.split("#")[0].split("?")[0];
  if (!clean || clean.startsWith("http") || clean.startsWith("mailto:") || clean.startsWith("tel:") || clean.startsWith("data:")) return null;
  if (!clean.startsWith("/")) return null;
  const relative = clean.slice(1);
  if (!relative || clean.endsWith("/")) return join(root, relative, "index.html");
  return extname(relative) ? join(root, relative) : join(root, relative, "index.html");
};

const files = await walk(root);
const htmlFiles = files.filter((path) => extname(path) === ".html");
const expectedPages = [];
const projectsByLocale = {};
const projectAssets = JSON.parse(await readFile(join(root, "assets", "data", "project-assets.json"), "utf8"));

for (const slug of requiredProjectSlugs) {
  const asset = projectAssets[slug];
  if (!asset) {
    errors.push(`project-assets.json: origem ausente para ${slug}`);
    continue;
  }
  if (!asset.src.startsWith("/") || /^https?:/i.test(asset.src)) errors.push(`project-assets.json: ícone não local para ${slug}`);
  if (!Number.isInteger(asset.width) || !Number.isInteger(asset.height) || asset.width < 1 || asset.height < 1) {
    errors.push(`project-assets.json: dimensões inválidas para ${slug}`);
  }
  if (typeof asset.official !== "boolean" || !asset.kind || !asset.source) {
    errors.push(`project-assets.json: metadados de origem incompletos para ${slug}`);
  }
  if (!await exists(localTarget(asset.src))) errors.push(`project-assets.json: arquivo inexistente para ${slug}: ${asset.src}`);
}

for (const locale of localeOrder) {
  const path = join(root, "assets", "data", projectFiles[locale]);
  const projects = JSON.parse(await readFile(path, "utf8"));
  projectsByLocale[locale] = projects;
  expectedPages.push({ locale, type: "home", route: routeFor(locale, "home") });
  expectedPages.push({ locale, type: "about", route: routeFor(locale, "about") });
  expectedPages.push({ locale, type: "contact", route: routeFor(locale, "contact") });
  expectedPages.push({ locale, type: "privacy", route: routeFor(locale, "privacy") });
  for (const slug of requiredProjectSlugs) {
    expectedPages.push({ locale, type: "project", slug, route: routeFor(locale, "project", slug) });
  }
}

for (const expected of expectedPages) {
  const path = localTarget(expected.route);
  if (!await exists(path)) {
    errors.push(`rota localizada ausente: ${expected.route}`);
    continue;
  }
  const html = await readFile(path, "utf8");
  const label = path.slice(root.length + 1);
  const config = locales[expected.locale];
  const canonical = `${origin}${expected.route}`;
  const manifest = expected.locale === "pt-BR" ? "/manifest.webmanifest" : `/${expected.locale}/manifest.webmanifest`;
  if (!html.includes(`<html lang="${config.htmlLang}"`)) errors.push(`${label}: lang incorreto`);
  if (!html.includes(`<link rel="canonical" href="${canonical}">`)) errors.push(`${label}: canonical incorreto`);
  if (!html.includes(`<link rel="manifest" href="${manifest}">`)) errors.push(`${label}: manifesto localizado incorreto`);
  if (!/<title>[^<]+<\/title>/.test(html)) errors.push(`${label}: título ausente`);
  if (!html.includes('name="description"')) errors.push(`${label}: descrição ausente`);
  if (!html.includes('name="viewport"')) errors.push(`${label}: viewport ausente`);
  if (!html.includes("<main")) errors.push(`${label}: main ausente`);
  if (!html.includes("skip-link")) errors.push(`${label}: skip link ausente`);
  if (!html.includes('data-open-cookie')) errors.push(`${label}: controle de cookies ausente`);
  if (!html.includes("language-switcher")) errors.push(`${label}: seletor de idioma ausente`);
  if (!html.includes("data-theme-label")) errors.push(`${label}: controle de tema sem texto visível`);
  if (!html.includes("brand-logo")) errors.push(`${label}: identidade Guilherme Rocha ausente do cabeçalho`);
  if (!html.includes("brand-copy")) errors.push(`${label}: nome e especialidade legíveis ausentes do cabeçalho`);
  if (!html.includes(config.common.brandTagline)) errors.push(`${label}: especialidade localizada ausente do cabeçalho`);
  if (!/href="\/assets\/css\/styles\.css\?v=[a-f0-9]{12}"/.test(html)) errors.push(`${label}: CSS sem versão de conteúdo`);
  if (!/src="\/assets\/js\/site\.js\?v=[a-f0-9]{12}"/.test(html)) errors.push(`${label}: JavaScript base sem versão de conteúdo`);
  const headerOrder = [
    `href="${config.routes.contact}"`,
    `href="${config.routes.about}"`,
    `href="${config.home}#projects"`,
  ].map((marker) => html.indexOf(marker));
  if (headerOrder.some((position) => position < 0) || headerOrder.some((position, index) => index && position <= headerOrder[index - 1])) {
    errors.push(`${label}: navegação deve seguir Contato, Sobre, Projetos`);
  }
  if (expected.type === "home") {
    if (!html.includes('data-project="clubal"')) errors.push(`${label}: card ClubAL sem identificação própria`);
    if (!html.includes("clubal-operation-panel")) errors.push(`${label}: painel abstrato de Operação ausente`);
    if (!html.includes('src="/assets/img/clubal/clima-flet-demo.png"')) errors.push(`${label}: superfície Flet de clima ausente`);
    if (!html.includes("clubal-rotinas-surface")) errors.push(`${label}: Rotinas atual ausente da composição`);
  }
  if (expected.type === "about") {
    if ((html.match(/data-context-card/g) || []).length !== 5) errors.push(`${label}: catálogo por contexto incompleto`);
    if ((html.match(/aria-expanded="false"/g) || []).length < 5) errors.push(`${label}: catálogos contextuais devem iniciar recolhidos`);
    if ((html.match(/context-catalog-panel"[^>]* hidden/g) || []).length !== 5) errors.push(`${label}: painéis contextuais sem estado inicial oculto`);
    if (!html.includes('src="/assets/js/about.js?v=')) errors.push(`${label}: comportamento do catálogo contextual ausente`);
    if (html.includes("personal-note")) errors.push(`${label}: seção pessoal removida voltou a ser gerada`);
    for (const project of projectsByLocale[expected.locale]) {
      if (!html.includes(`href="${project.route}"`)) errors.push(`${label}: projeto ausente no catálogo por contexto ${project.slug}`);
    }
  }
  for (const targetLocale of localeOrder) {
    const hreflang = targetLocale === "pt-BR" ? "pt-BR" : targetLocale;
    const alternate = `${origin}${routeFor(targetLocale, expected.type, expected.slug)}`;
    if (!html.includes(`<link rel="alternate" hreflang="${hreflang}" href="${alternate}">`)) {
      errors.push(`${label}: hreflang ${hreflang} ausente ou incorreto`);
    }
  }
  const defaultRoute = `${origin}${routeFor("pt-BR", expected.type, expected.slug)}`;
  if (!html.includes(`<link rel="alternate" hreflang="x-default" href="${defaultRoute}">`)) {
    errors.push(`${label}: x-default ausente ou incorreto`);
  }
}

for (const [locale, contract] of Object.entries({
  "pt-BR": { path: "manifest.webmanifest", start: "/", scope: "/" },
  en: { path: "en/manifest.webmanifest", start: "/en/", scope: "/en/" },
  es: { path: "es/manifest.webmanifest", start: "/es/", scope: "/es/" },
})) {
  const manifestPath = join(root, ...contract.path.split("/"));
  if (!await exists(manifestPath)) {
    errors.push(`manifesto ausente: ${contract.path}`);
    continue;
  }
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  if (manifest.lang !== locale) errors.push(`${contract.path}: idioma incorreto`);
  if (manifest.start_url !== contract.start) errors.push(`${contract.path}: start_url incorreto`);
  if (manifest.scope !== contract.scope) errors.push(`${contract.path}: scope incorreto`);
  if (!manifest.icons?.some((icon) => icon.src === "/assets/img/brand/favicon-512.png" && icon.sizes === "512x512")) {
    errors.push(`${contract.path}: ícone PNG 512 da identidade ausente`);
  }
}

for (const path of htmlFiles) {
  const html = await readFile(path, "utf8");
  const label = path.slice(root.length + 1);
  for (const [, value] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const target = localTarget(value);
    if (target && !await exists(target)) errors.push(`${label}: referência local inexistente ${value}`);
  }
  for (const [tag] of html.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)) {
    if (!/rel="[^"]*noopener[^"]*"/.test(tag)) errors.push(`${label}: link externo sem noopener`);
  }
  for (const [tag] of html.matchAll(/<img\b[^>]*>/g)) {
    if (!/\balt="[^"]*"/.test(tag)) errors.push(`${label}: imagem sem texto alternativo`);
    if (!/\bwidth="\d+"/.test(tag) || !/\bheight="\d+"/.test(tag)) errors.push(`${label}: imagem sem dimensões`);
  }
  if (/<script(?![^>]*\bsrc=)(?![^>]*type="application\/ld\+json")[^>]*>/i.test(html)) {
    errors.push(`${label}: script inline executável não permitido`);
  }
}

for (const locale of localeOrder) {
  const projects = projectsByLocale[locale];
  const label = projectFiles[locale];
  if (projects.length !== requiredProjectSlugs.length) errors.push(`${label}: quantidade inesperada de projetos`);
  if (new Set(projects.map((project) => project.slug)).size !== projects.length) errors.push(`${label}: slugs duplicados`);
  if (projects.map((project) => project.order).join(",") !== requiredProjectSlugs.map((_, index) => index + 1).join(",")) {
    errors.push(`${label}: ordem inválida`);
  }

  for (const slug of requiredProjectSlugs) {
    const project = projects.find((item) => item.slug === slug);
    if (!project) {
      errors.push(`${label}: projeto ausente ${slug}`);
      continue;
    }
    if (project.route !== routeFor(locale, "project", slug)) errors.push(`${label}: rota localizada incorreta para ${slug}`);
    if (!await exists(localTarget(project.route))) errors.push(`${label}: rota inexistente ${project.route}`);
    if (!await exists(localTarget(project.image))) errors.push(`${label}: imagem inexistente ${project.image}`);
    if (project.cardImage) {
      if (!await exists(localTarget(project.cardImage))) errors.push(`${label}: imagem de vitrine inexistente ${project.cardImage}`);
      if (!Number.isInteger(project.cardImageWidth) || !Number.isInteger(project.cardImageHeight)) {
        errors.push(`${label}: imagem de vitrine sem dimensões para ${slug}`);
      }
      if (!project.cardImageAlt) errors.push(`${label}: imagem de vitrine sem texto alternativo para ${slug}`);
    }
    const icon = projectAssets[slug];
    if (!icon || !await exists(localTarget(icon.src))) errors.push(`${label}: ícone de projeto inexistente para ${slug}`);
    const [expectedWidth, expectedHeight] = expectedProjectDimensions[slug];
    if (project.imageWidth !== expectedWidth || project.imageHeight !== expectedHeight) {
      errors.push(`${label}: dimensões da imagem principal incorretas para ${slug}`);
    }
  }

  const clubal = projects.find((project) => project.slug === "clubal");
  if (clubal.gallery?.length !== 4) errors.push(`${label}: galeria do ClubAL deve conter quatro capturas`);
  if (!clubal.galleryNote) errors.push(`${label}: nota de dados demonstrativos da galeria ClubAL ausente`);
  for (const item of clubal.gallery || []) {
    if (!await exists(localTarget(item.src))) errors.push(`${label}: captura do ClubAL inexistente ${item.src}`);
    if (!Number.isInteger(item.width) || !Number.isInteger(item.height)) errors.push(`${label}: captura do ClubAL sem dimensões ${item.src}`);
  }
  const moduleNames = ["Operação", "Rotinas", "Consulta"];
  const modulePoints = clubal.tabs.flatMap((tab) => tab.points).filter((point) => moduleNames.some((name) => point.startsWith(name)));
  if (modulePoints.length !== 3 || moduleNames.some((name) => modulePoints.filter((point) => point.startsWith(name)).length !== 1)) {
    errors.push(`${label}: contrato de exatamente três módulos do ClubAL não preservado`);
  }

  const maeve = projects.find((project) => project.slug === "maeve");
  if (maeve.gallery?.length !== 7) errors.push(`${label}: galeria conceitual de Maeve incompleta`);
  if (maeve.visualLabel !== conceptLabels[locale]) errors.push(`${label}: rótulo principal de Maeve deve ser ${conceptLabels[locale]}`);
  for (const item of maeve.gallery || []) {
    if (!await exists(localTarget(item.src))) errors.push(`${label}: imagem de Maeve inexistente ${item.src}`);
    if (item.label !== conceptLabels[locale]) errors.push(`${label}: arte de Maeve sem rótulo conceitual exato ${item.src}`);
    if (item.width !== 1672 || item.height !== 941) errors.push(`${label}: arte de Maeve sem dimensões corretas ${item.src}`);
  }
  const c7 = projects.find((project) => project.slug === "c7-engineering-system");
  if (c7.cardImage !== "/assets/img/c7-engineering-system-showcase.png" || c7.cardImageWidth !== 1600 || c7.cardImageHeight !== 800) {
    errors.push(`${label}: recorte de vitrine do C7ES incorreto`);
  }
  if (c7.faq?.items?.length !== 7 || !c7.faq.eyebrow || !c7.faq.title || !c7.faq.intro) {
    errors.push(`${label}: FAQ do C7ES deve conter introdução e sete respostas`);
  }
  for (const item of c7.faq?.items || []) {
    if (!item.question || !item.answer) errors.push(`${label}: item incompleto na FAQ do C7ES`);
  }
  const localeText = JSON.stringify(projects);
  const adultPattern = locale === "en" ? /\badult\b/gi : locale === "es" ? /\badulta\b/gi : /\badulta\b/gi;
  if ((localeText.match(adultPattern) || []).length !== 1) errors.push(`${label}: classificação adulta deve aparecer exatamente uma vez`);
}

const publicTextPaths = files.filter((path) => [".html", ".js", ".json", ".mjs"].includes(extname(path)) && !path.endsWith("validate.mjs"));
const publicText = (await Promise.all(publicTextPaths.map((path) => readFile(path, "utf8")))).join("\n");
for (const phrase of [
  "Tecnologia com intenção humana",
  "Projetos que funcionam de verdade",
  "Produto antes do ruído",
  "Visão de produto, execução concreta",
  "Uma paisagem, vários caminhos",
  "Vamos construir algo que importe",
  "Feito para permanecer útil",
]) {
  if (publicText.includes(phrase)) errors.push(`copy genérica antiga ainda presente: ${phrase}`);
}
for (const phrase of ["portal dark", "rituais interativos", "funciona como mundo", "gmdr2014@gmail.com"]) {
  if (publicText.toLowerCase().includes(phrase.toLowerCase())) errors.push(`copy pública proibida ainda presente: ${phrase}`);
}
for (const [label, pattern] of [
  ["cargo socioeducativo", /socioeducador|social educator|educador social/iu],
  ["inteligência artificial", /\b(?:IA|AI)\b|intelig[eê]ncia artificial|artificial intelligence|inteligencia artificial/iu],
  ["agentes", /\b(?:agente|agentes|agent|agents)\b|agent-assisted|coding agents/iu],
  ["validação humana", /valida[cç][aã]o humana|validaci[oó]n humana|human validation|human acceptance|aceite humano|aceptaci[oó]n humana/iu],
  ["sigla interna do ClubAL", /\bPEMSE\b/u],
]) {
  if (pattern.test(publicText)) errors.push(`copy pública proibida ainda presente: ${label}`);
}

const textFiles = files.filter((path) => !path.endsWith("validate.mjs") && [".css", ".html", ".js", ".json", ".md", ".mjs", ".txt", ".xml"].includes(extname(path)));
for (const path of textFiles) {
  const content = await readFile(path, "utf8");
  if (/\blorem ipsum\b/i.test(content) || /\bTODO\b/.test(content)) errors.push(`${path.slice(root.length + 1)}: marcador provisório`);
}

const imageFiles = files.filter((path) => [".ico", ".jpg", ".jpeg", ".png", ".svg", ".webp"].includes(extname(path).toLowerCase()));
let imageBytes = 0;
for (const path of imageFiles) {
  const size = (await stat(path)).size;
  imageBytes += size;
  if (size > 3 * 1024 * 1024) errors.push(`${path.slice(root.length + 1)}: imagem excede 3 MiB`);
}
if (imageBytes > 30 * 1024 * 1024) errors.push("orçamento total de imagens excede 30 MiB");

for (const path of files) {
  const size = (await stat(path)).size;
  if (size > 10 * 1024 * 1024) errors.push(`${path.slice(root.length + 1)}: arquivo excede 10 MiB`);
  const prefix = (await readFile(path)).subarray(0, 160).toString("utf8");
  if (prefix.includes("version https://git-lfs.github.com/spec/v1")) errors.push(`${path.slice(root.length + 1)}: ponteiro Git LFS não permitido`);
}

const siteScript = await readFile(join(root, "assets", "js", "site.js"), "utf8");
for (const marker of ['CONSENT_COOKIE = "gui_consent"', '"pt-BR":', "en:", "es:", "readStorage", "writeStorage", "getRegistrations", 'startsWith("gui-rocha-")', 'sessionStorage.getItem("gui-sw-retired")']) {
  if (!siteScript.includes(marker)) errors.push(`site.js: marcador ausente ${marker}`);
}
const projectScript = await readFile(join(root, "assets", "js", "project.js"), "utf8");
for (const marker of ["galleryImage.width", "galleryImage.height", "--gallery-ratio", "ArrowLeft", "ArrowRight", "preload"]) {
  if (!projectScript.includes(marker)) errors.push(`project.js: comportamento de galeria ausente ${marker}`);
}
const homeScript = await readFile(join(root, "assets", "js", "home.js"), "utf8");
for (const marker of ["isInteractiveTarget", "pointercancel", 'closest("a, button, summary, input, select, textarea, label")']) {
  if (!homeScript.includes(marker)) errors.push(`home.js: proteção de links da vitrine ausente ${marker}`);
}
const serviceWorker = await readFile(join(root, "service-worker.js"), "utf8");
for (const marker of ["self.registration.unregister()", 'name.startsWith("gui-rocha-")', "self.clients.matchAll"]) {
  if (!serviceWorker.includes(marker)) errors.push(`service-worker.js: retirada segura do cache legado ausente ${marker}`);
}
const contactScript = await readFile(join(root, "assets", "js", "contact.js"), "utf8");
if (!contactScript.includes('params.get("asunto")')) errors.push("contact.js: parâmetro contextual espanhol ausente");
const styles = await readFile(join(root, "assets", "css", "styles.css"), "utf8");
for (const marker of [
  ".no-js .project-tabs",
  ".no-js .project-tab-panel[hidden]",
  ".no-js .context-catalog-panel[hidden]",
  ".context-catalog-grid",
  ".project-visual[data-kind=\"screenshot\"] .project-image-frame",
  "@media (max-width: 260px)",
  '.project-card[data-position="active"]',
  ".project-faq-list summary",
]) {
  if (!styles.includes(marker)) errors.push(`styles.css: fallback sem JavaScript ausente ${marker}`);
}
const aboutScript = await readFile(join(root, "assets", "js", "about.js"), "utf8");
for (const marker of ["data-context-card", "pointerenter", "focusin", "Escape", "aria-expanded"]) {
  if (!aboutScript.includes(marker)) errors.push(`about.js: interação contextual ausente ${marker}`);
}
const headers = await readFile(join(root, "_headers"), "utf8");
for (const header of ["Content-Security-Policy", "Permissions-Policy", "Referrer-Policy", "X-Content-Type-Options"]) {
  if (!headers.includes(header)) errors.push(`cabeçalho ausente: ${header}`);
}
if (!/\/service-worker\.js\s+Cache-Control: no-store, max-age=0/.test(headers)) {
  errors.push("_headers: Service Worker legado pode permanecer em cache");
}
if ((headers.match(/Cache-Control:/g) || []).length !== 1) {
  errors.push("_headers: regras de cache sobrepostas podem concatenar diretivas");
}

const sitemap = await readFile(join(root, "sitemap.xml"), "utf8");
for (const expected of expectedPages) {
  if (!sitemap.includes(`<loc>${origin}${expected.route}</loc>`)) errors.push(`sitemap: rota ausente ${expected.route}`);
}

if (htmlFiles.length !== expectedPages.length + 1) {
  errors.push(`quantidade inesperada de HTML: ${htmlFiles.length}; esperado ${expectedPages.length + 1}`);
}

if (errors.length) {
  process.stderr.write(`Validação falhou (${errors.length}):\n- ${errors.join("\n- ")}\n`);
  process.exit(1);
}

process.stdout.write(`Validação aprovada: ${htmlFiles.length} páginas, ${requiredProjectSlugs.length} projetos × ${localeOrder.length} idiomas, ${(imageBytes / 1024 / 1024).toFixed(2)} MiB de imagens e nenhum ponteiro LFS.\n`);
