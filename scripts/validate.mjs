import { readFile, readdir, stat } from "node:fs/promises";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { localeOrder, locales, siteConfig } from "../content/pages.mjs";
import {
  flattenWorkMap,
  resolveWorkMapNodeTitle,
  validateWorkMapStructure,
  validateWorkMapVisualTargets,
  workMapStructure,
  workMapVisualTargets,
} from "../content/work-map.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const ignoredDirectories = new Set([
  ".git",
  ".playwright-cli",
  ".wrangler",
  "dist",
  "node_modules",
  "output",
  "test-results",
]);
const projectFiles = {
  "pt-BR": "projects.json",
  en: "projects.en.json",
  es: "projects.es.json",
};
const siteFiles = {
  "pt-BR": "sites.json",
  en: "sites.en.json",
  es: "sites.es.json",
};
const expectedCoreRoutes = {
  "pt-BR": {
    home: "/",
    about: "/",
    projects: "/projetos/",
    sites: "/sites/",
    contact: "/contato/",
    privacy: "/privacidade/",
    notFound: "/404.html",
  },
  en: {
    home: "/en/",
    about: "/en/",
    projects: "/en/projects/",
    sites: "/en/sites/",
    contact: "/en/contact/",
    privacy: "/en/privacy/",
    notFound: "/en/404.html",
  },
  es: {
    home: "/es/",
    about: "/es/",
    projects: "/es/proyectos/",
    sites: "/es/sitios/",
    contact: "/es/contacto/",
    privacy: "/es/privacidad/",
    notFound: "/es/404.html",
  },
};
const expectedMainOrder = [
  "clubal",
  "sites",
  "codex-checkpoint",
  "nexus",
  "c7-engineering-system",
  "local-first-checklist",
  "maeve",
];
const expectedWorkMapLabels = {
  "pt-BR": [
    ["institutional", "Operações institucionais"],
    ["websites", "Presença digital"],
    ["local-tools", "Ferramentas de trabalho"],
    ["engineering", "Métodos de desenvolvimento"],
    ["original", "Projetos autorais"],
  ],
  en: [
    ["institutional", "Institutional operations"],
    ["websites", "Digital presence"],
    ["local-tools", "Work tools"],
    ["engineering", "Development methods"],
    ["original", "Original projects"],
  ],
  es: [
    ["institutional", "Operaciones institucionales"],
    ["websites", "Presencia digital"],
    ["local-tools", "Herramientas de trabajo"],
    ["engineering", "Métodos de desarrollo"],
    ["original", "Proyectos propios"],
  ],
};
const approvedCopy = {
  "pt-BR": {
    aboutHeading: "Conduzo produtos digitais da necessidade inicial à validação em uso.",
    aboutEyebrow: "PORTFÓLIO",
    methodEyebrow: "Como trabalho",
    methodTitle: "Da leitura inicial à validação, com decisões registradas em cada etapa.",
    methodSteps: ["Diagnóstico", "Direção", "Construção", "Validação"],
    projectsHeading: "Produtos digitais com propósito, funcionamento e evolução visíveis.",
    sitesHeading: "Presenças digitais publicadas",
    brandTagline: "Projetos digitais com aplicação prática",
  },
  en: {
    aboutHeading: "I lead digital products from the initial need through validation in use.",
    aboutEyebrow: "PORTFOLIO",
    methodEyebrow: "How I work",
    methodTitle: "From the initial assessment to validation, with decisions recorded at every stage.",
    methodSteps: ["Assessment", "Direction", "Build", "Validation"],
    projectsHeading: "Digital products with visible purpose, operation and evolution.",
    sitesHeading: "Published digital presences",
    brandTagline: "Digital projects with practical applications",
  },
  es: {
    aboutHeading: "Dirijo productos digitales desde la necesidad inicial hasta la validación en uso.",
    aboutEyebrow: "PORTAFOLIO",
    methodEyebrow: "Cómo trabajo",
    methodTitle: "De la evaluación inicial a la validación, con decisiones registradas en cada etapa.",
    methodSteps: ["Evaluación", "Dirección", "Construcción", "Validación"],
    projectsHeading: "Productos digitales con propósito, funcionamiento y evolución visibles.",
    sitesHeading: "Presencias digitales publicadas",
    brandTagline: "Proyectos digitales con aplicación práctica",
  },
};
const allowedStatusTones = new Set(["lab", "live", "progress", "ready"]);
const requiredRedirects = new Map([
  ["/sobre/", "/"],
  ["/sobre", "/"],
  ["/sobre/index.html", "/"],
  ["/en/about/", "/en/"],
  ["/en/about", "/en/"],
  ["/en/about/index.html", "/en/"],
  ["/es/sobre/", "/es/"],
  ["/es/sobre", "/es/"],
  ["/es/sobre/index.html", "/es/"],
  ["/clubal", "/projetos/clubal/"],
  ["/maeve", "/projetos/maeve/"],
  ["/demonyza", "/projetos/demonyza/"],
  ["/cc", "/projetos/codex-checkpoint/"],
  ["/checkpoint", "/projetos/codex-checkpoint/"],
  ["/nexus", "/projetos/nexus/"],
]);
const legacyOutputs = [
  "sobre/index.html",
  "en/about/index.html",
  "es/sobre/index.html",
  "manifest.webmanifest",
  "en/manifest.webmanifest",
  "es/manifest.webmanifest",
];

const fail = (message) => errors.push(message);
const publicPath = (path) => relative(root, path).split(sep).join("/");
const isNonEmptyString = (value) => typeof value === "string" && Boolean(value.trim());
const isPositiveInteger = (value) => Number.isInteger(value) && value > 0;
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const walk = async (directory) => {
  const paths = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) paths.push(...await walk(path));
    else paths.push(path);
  }
  return paths;
};

const exists = async (path) => {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
};

const readText = async (path, label = publicPath(path)) => {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    fail(`${label}: não foi possível ler (${error.message})`);
    return "";
  }
};

const readJson = async (path, fallback, label = publicPath(path)) => {
  const text = await readText(path, label);
  if (!text) return fallback;
  try {
    return JSON.parse(text);
  } catch (error) {
    fail(`${label}: JSON inválido (${error.message})`);
    return fallback;
  }
};

const decodeHtml = (value = "") => value
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&(amp|quot|apos|lt|gt|#039);/g, (entity) => ({
    "&amp;": "&",
    "&quot;": "\"",
    "&apos;": "'",
    "&lt;": "<",
    "&gt;": ">",
    "&#039;": "'",
  })[entity] ?? entity);

const stripTags = (value) => decodeHtml(value.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim());

const attributesOf = (tag) => {
  const attributes = {};
  for (const match of tag.matchAll(/\s([A-Za-z_:][A-Za-z0-9:._-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) {
    attributes[match[1].toLowerCase()] = decodeHtml(match[2] ?? match[3] ?? match[4] ?? "");
  }
  return attributes;
};

const startTags = (html, name) => (
  [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, "gi"))].map((match) => match[0])
);
const hasClass = (attributes, className) => (
  (attributes.class || "").split(/\s+/).includes(className)
);
const headOf = (html) => html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? "";
const elementContents = (html, name) => (
  [...html.matchAll(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)<\\/${name}>`, "gi"))].map((match) => match[1])
);
const metaValues = (html, attribute, expected) => (
  startTags(html, "meta")
    .map(attributesOf)
    .filter((attributes) => attributes[attribute] === expected)
    .map((attributes) => attributes.content ?? "")
);
const linkEntries = (html, relation) => (
  startTags(html, "link")
    .map(attributesOf)
    .filter((attributes) => (attributes.rel || "").split(/\s+/).includes(relation))
);
const anchorEntries = (html) => startTags(html, "a").map((tag) => ({
  tag,
  attributes: attributesOf(tag),
}));

const schemaOf = (value) => {
  if (value === null) return "null";
  if (Array.isArray(value)) return `array(${value.length})[${value.map(schemaOf).join("|")}]`;
  if (typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${key}:${schemaOf(value[key])}`).join(",")}}`;
  }
  return typeof value;
};

const normalizeReference = (value) => decodeHtml(String(value ?? "").trim());

const localTarget = (value, currentPath = null) => {
  const normalized = normalizeReference(value);
  if (!normalized || normalized.startsWith("//") || /^[a-z][a-z0-9+.-]*:/i.test(normalized)) return null;

  const hashIndex = normalized.indexOf("#");
  const rawFragment = hashIndex >= 0 ? normalized.slice(hashIndex + 1) : "";
  const withoutFragment = hashIndex >= 0 ? normalized.slice(0, hashIndex) : normalized;
  const queryIndex = withoutFragment.indexOf("?");
  const rawPath = queryIndex >= 0 ? withoutFragment.slice(0, queryIndex) : withoutFragment;
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(rawPath);
  } catch {
    return { invalid: "encoding de URL inválido" };
  }

  let target;
  if (!decodedPath) {
    target = currentPath;
  } else if (decodedPath.startsWith("/")) {
    target = resolve(root, `.${decodedPath.replaceAll("/", sep)}`);
  } else {
    target = resolve(currentPath ? dirname(currentPath) : root, decodedPath);
  }
  if (!target) return null;
  if (target !== root && !target.startsWith(`${root}${sep}`)) return { invalid: "referência fora do repositório" };

  if (decodedPath.endsWith("/") || target === root) target = join(target, "index.html");
  else if (!extname(target)) target = join(target, "index.html");

  let fragment = "";
  if (rawFragment) {
    try {
      fragment = decodeURIComponent(rawFragment);
    } catch {
      return { invalid: "fragmento com encoding inválido" };
    }
  }
  return { path: target, fragment };
};

const routeFile = (route) => localTarget(route)?.path ?? null;

const validateRequiredStrings = (value, fields, label) => {
  for (const field of fields) {
    if (!isNonEmptyString(value?.[field])) fail(`${label}: campo obrigatório ausente ou vazio: ${field}`);
  }
};

const validateAccent = (value, label) => {
  if (!/^#[0-9a-f]{6}$/i.test(value?.accent ?? "")) {
    fail(`${label}: accent inválido`);
    return;
  }
  const components = String(value?.accentRgb ?? "").split(/\s+/).map(Number);
  if (
    components.length !== 3
    || components.some((component) => !Number.isInteger(component) || component < 0 || component > 255)
  ) {
    fail(`${label}: accentRgb inválido`);
    return;
  }
  const expected = value.accent.slice(1).match(/../g).map((component) => Number.parseInt(component, 16));
  if (components.join(",") !== expected.join(",")) fail(`${label}: accentRgb diverge de accent`);
};

const validateDate = (value, label) => {
  if (value === undefined) return;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    fail(`${label}: lastVerified inválido`);
  }
};

const validateAssetReference = async (src, width, height, label) => {
  if (!isNonEmptyString(src) || !src.startsWith("/") || /^https?:/i.test(src)) {
    fail(`${label}: imagem deve usar caminho local absoluto`);
  } else {
    const target = localTarget(src);
    if (!target?.path || !await exists(target.path)) fail(`${label}: arquivo de imagem inexistente: ${src}`);
  }
  if (!isPositiveInteger(width) || !isPositiveInteger(height)) fail(`${label}: dimensões inválidas`);
};

const validateTabs = (tabs, label) => {
  if (!Array.isArray(tabs) || tabs.length < 1) {
    fail(`${label}: tabs ausentes`);
    return;
  }
  const ids = new Set();
  for (const [index, tab] of tabs.entries()) {
    const tabLabel = `${label}.tabs[${index}]`;
    validateRequiredStrings(tab, ["id", "label", "title", "body"], tabLabel);
    if (ids.has(tab?.id)) fail(`${tabLabel}: id duplicado`);
    ids.add(tab?.id);
    if (!Array.isArray(tab?.points) || tab.points.length < 1 || tab.points.some((point) => !isNonEmptyString(point))) {
      fail(`${tabLabel}: points ausentes ou inválidos`);
    }
  }
};

const normalizeEditorialText = (value) => String(value ?? "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

const caseSummaryValueFor = (item, source) => {
  if (["summary", "role", "evidence", "statusLimit"].includes(source)) return item?.[source];
  if (source.startsWith("tab:")) {
    const tabId = source.slice(4);
    return item?.tabs?.find((tab) => tab.id === tabId)?.body;
  }
  return undefined;
};

const validateCaseSummary = (item, label) => {
  const sources = item?.caseSummary;
  if (!Array.isArray(sources) || sources.length < 4 || sources.length > 5) {
    fail(`${label}: caseSummary deve selecionar de quatro a cinco blocos substanciais`);
    return;
  }
  if (sources.some((source) => !isNonEmptyString(source))) {
    fail(`${label}: caseSummary contém fonte vazia ou inválida`);
    return;
  }
  if (new Set(sources).size !== sources.length) fail(`${label}: caseSummary contém fonte duplicada`);

  const values = [];
  for (const source of sources) {
    const value = caseSummaryValueFor(item, source);
    if (!value && source.startsWith("tab:")) {
      fail(`${label}: caseSummary aponta para aba inexistente: ${source.slice(4)}`);
    } else if (!value && !["summary", "role", "evidence", "statusLimit"].includes(source)) {
      fail(`${label}: caseSummary usa fonte desconhecida: ${source}`);
    }
    if (!isNonEmptyString(value)) fail(`${label}: caseSummary usa conteúdo ausente: ${source}`);
    else values.push(normalizeEditorialText(value));
  }
  if (new Set(values).size !== values.length) fail(`${label}: caseSummary repete o mesmo conteúdo em mais de um bloco`);
};

const validateGallery = async (gallery, label) => {
  if (!Array.isArray(gallery) || gallery.length < 1) {
    fail(`${label}: galeria ausente`);
    return;
  }
  for (const [index, item] of gallery.entries()) {
    const itemLabel = `${label}[${index}]`;
    validateRequiredStrings(item, ["src", "alt", "label"], itemLabel);
    await validateAssetReference(item?.src, item?.width, item?.height, itemLabel);
    const hasFrame = "frameWidth" in (item ?? {}) || "frameHeight" in (item ?? {});
    if (hasFrame && (!isPositiveInteger(item?.frameWidth) || !isPositiveInteger(item?.frameHeight))) {
      fail(`${itemLabel}: dimensões de moldura incompletas`);
    }
  }
};

const validateLinks = async (links, label) => {
  if (!Array.isArray(links)) {
    fail(`${label}: lista de links ausente`);
    return;
  }
  for (const [index, link] of links.entries()) {
    const linkLabel = `${label}[${index}]`;
    validateRequiredStrings(link, ["label", "href"], linkLabel);
    if (!isNonEmptyString(link?.href)) continue;
    if (/^http:/i.test(link.href)) fail(`${linkLabel}: link externo deve usar HTTPS`);
    const target = localTarget(link.href);
    if (target?.invalid) fail(`${linkLabel}: ${target.invalid}`);
    else if (target?.path && !await exists(target.path)) fail(`${linkLabel}: link local inexistente ${link.href}`);
  }
};

if (localeOrder.join(",") !== "pt-BR,en,es") {
  fail(`content/pages.mjs: idiomas inesperados (${localeOrder.join(",")})`);
}
if (siteConfig.origin !== "https://gui-rocha.pages.dev") {
  fail("content/pages.mjs: origin canônico incorreto");
}
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(siteConfig.personalEmail ?? "")) {
  fail("content/pages.mjs: personalEmail inválido");
}
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(siteConfig.clubalEmail ?? "")) {
  fail("content/pages.mjs: clubalEmail inválido");
}
if (siteConfig.personalEmail.toLowerCase() === siteConfig.clubalEmail.toLowerCase()) {
  fail("content/pages.mjs: e-mails pessoal e ClubAL devem ser distintos");
}
if (siteConfig.personalEmail !== "gmdr2014@gmail.com") fail("content/pages.mjs: e-mail pessoal aprovado divergiu");
if (siteConfig.clubalEmail !== "suporte.clubal@gmail.com") fail("content/pages.mjs: e-mail de suporte do ClubAL divergiu");

for (const locale of localeOrder) {
  const config = locales[locale];
  const expected = expectedCoreRoutes[locale];
  if (!config || !expected) {
    fail(`content/pages.mjs: locale sem contrato: ${locale}`);
    continue;
  }
  for (const [field, value] of Object.entries(expected)) {
    if (field === "notFound") continue;
    const actual = field === "home" ? config.home : config.routes?.[field];
    if (actual !== value) fail(`content/pages.mjs: rota ${locale}.${field} incorreta (${actual ?? "ausente"})`);
  }
  if (config.home !== config.routes.about) fail(`content/pages.mjs: ${locale} deve usar Sobre como raiz`);
  validateRequiredStrings(config.common, ["brandTagline", "products", "about", "contact", "email", "clubalSupport"], `content/pages.mjs:${locale}.common`);
  validateRequiredStrings(config.common.caseLabels, ["context", "role", "problem", "contribution", "evidence", "status"], `content/pages.mjs:${locale}.common.caseLabels`);
  validateRequiredStrings(config.aboutPage, ["title", "description", "eyebrow", "heading", "role", "portraitCaption", "methodEyebrow", "methodTitle"], `content/pages.mjs:${locale}.aboutPage`);
  validateRequiredStrings(config.aboutPage.workMap, ["alt", "label", "single", "multiple", "back"], `content/pages.mjs:${locale}.aboutPage.workMap`);
  validateRequiredStrings(config.aboutPage.workMap?.groups, workMapStructure.map((group) => group.id), `content/pages.mjs:${locale}.aboutPage.workMap.groups`);
  validateRequiredStrings(config.projectsPage, ["title", "description", "heading"], `content/pages.mjs:${locale}.projectsPage`);
  validateRequiredStrings(config.contactPage, [
    "title",
    "description",
    "heading",
    "lead",
    "guidance",
    "talkHeading",
    "publicWorkHeading",
    "personalEmailLabel",
    "clubalHeading",
    "clubalBody",
    "clubalAction",
    "clubalSubject",
  ], `content/pages.mjs:${locale}.contactPage`);
  validateRequiredStrings(config.privacyPage, ["title", "description", "heading"], `content/pages.mjs:${locale}.privacyPage`);
  validateRequiredStrings(config.notFoundPage, ["title", "heading", "lead"], `content/pages.mjs:${locale}.notFoundPage`);
  if (config.aboutPage.heading !== approvedCopy[locale].aboutHeading) fail(`content/pages.mjs:${locale}: H1 aprovado de Sobre divergiu`);
  if (config.aboutPage.eyebrow !== approvedCopy[locale].aboutEyebrow) fail(`content/pages.mjs:${locale}: eyebrow aprovado de Sobre divergiu`);
  if (config.aboutPage.methodEyebrow !== approvedCopy[locale].methodEyebrow) fail(`content/pages.mjs:${locale}: eyebrow de Como trabalho divergiu`);
  if (config.aboutPage.methodTitle !== approvedCopy[locale].methodTitle) fail(`content/pages.mjs:${locale}: título de Como trabalho divergiu`);
  if (!Array.isArray(config.aboutPage.method) || config.aboutPage.method.length !== 4) {
    fail(`content/pages.mjs:${locale}: Como trabalho deve conter quatro etapas`);
  } else {
    config.aboutPage.method.forEach((step, index) => {
      if (!Array.isArray(step) || step.length !== 3 || step.some((value) => !isNonEmptyString(value))) {
        fail(`content/pages.mjs:${locale}: etapa ${index + 1} de Como trabalho é inválida`);
      } else if (step[0] !== String(index + 1).padStart(2, "0")) {
        fail(`content/pages.mjs:${locale}: numeração de Como trabalho é inválida`);
      } else if (step[1] !== approvedCopy[locale].methodSteps[index]) {
        fail(`content/pages.mjs:${locale}: título da etapa ${index + 1} de Como trabalho divergiu`);
      }
    });
  }
  if (config.projectsPage.heading !== approvedCopy[locale].projectsHeading) fail(`content/pages.mjs:${locale}: H1 aprovado de Projetos divergiu`);
  if (config.common.brandTagline !== approvedCopy[locale].brandTagline) fail(`content/pages.mjs:${locale}: assinatura aprovada da marca divergiu`);
}

for (const key of ["common", "aboutPage", "projectsPage", "contactPage", "privacyPage", "notFoundPage"]) {
  const schemas = localeOrder.map((locale) => schemaOf(locales[locale]?.[key]));
  if (new Set(schemas).size !== 1) fail(`content/pages.mjs: schema de ${key} diverge entre PT/EN/ES`);
}

const files = await walk(root);
const htmlFiles = files.filter((path) => extname(path).toLowerCase() === ".html");
const projectsByLocale = {};
const sitesByLocale = {};

for (const locale of localeOrder) {
  const projects = await readJson(
    join(root, "assets", "data", projectFiles[locale]),
    [],
    `assets/data/${projectFiles[locale]}`,
  );
  if (!Array.isArray(projects)) {
    fail(`assets/data/${projectFiles[locale]}: raiz deve ser um array`);
    projectsByLocale[locale] = [];
  } else {
    projectsByLocale[locale] = projects;
  }

  const sites = await readJson(
    join(root, "assets", "data", siteFiles[locale]),
    { collection: {}, sites: [] },
    `assets/data/${siteFiles[locale]}`,
  );
  if (!sites || typeof sites !== "object" || Array.isArray(sites) || !Array.isArray(sites.sites)) {
    fail(`assets/data/${siteFiles[locale]}: raiz deve conter collection e sites[]`);
    sitesByLocale[locale] = { collection: {}, sites: [] };
  } else {
    sitesByLocale[locale] = sites;
  }
}

const projectAssets = await readJson(
  join(root, "assets", "data", "project-assets.json"),
  {},
  "assets/data/project-assets.json",
);

const projectInvariant = (project) => ({
  slug: project.slug,
  kind: project.kind,
  catalogGroup: project.catalogGroup,
  order: project.order,
  code: project.code,
  statusTone: project.statusTone,
  image: project.image,
  imageWidth: project.imageWidth,
  imageHeight: project.imageHeight,
  imageKind: project.imageKind,
  cardImage: project.cardImage,
  cardImageWidth: project.cardImageWidth,
  cardImageHeight: project.cardImageHeight,
  cardImageKind: project.cardImageKind,
  accent: project.accent,
  accentRgb: project.accentRgb,
  gallery: project.gallery?.map((item) => ({
    src: item.src,
    width: item.width,
    height: item.height,
    frameWidth: item.frameWidth,
    frameHeight: item.frameHeight,
  })),
});

const siteInvariant = (site) => ({
  id: site.id,
  slug: site.slug,
  kind: site.kind,
  catalogGroup: site.catalogGroup,
  order: site.order,
  visible: site.visible,
  statusTone: site.statusTone,
  accent: site.accent,
  accentRgb: site.accentRgb,
  icon: site.icon,
  iconWidth: site.iconWidth,
  iconHeight: site.iconHeight,
  cover: site.cover && {
    src: site.cover.src,
    width: site.cover.width,
    height: site.cover.height,
    frameWidth: site.cover.frameWidth,
    frameHeight: site.cover.frameHeight,
  },
  gallery: site.gallery?.map((item) => ({
    src: item.src,
    width: item.width,
    height: item.height,
    frameWidth: item.frameWidth,
    frameHeight: item.frameHeight,
  })),
  hasCase: Boolean(site.case),
});

const referenceProjectSlugs = projectsByLocale["pt-BR"].map((project) => project.slug);
for (const locale of localeOrder) {
  const label = `assets/data/${projectFiles[locale]}`;
  const projects = projectsByLocale[locale];
  const slugs = projects.map((project) => project.slug);
  if (slugs.some((slug) => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug ?? ""))) {
    fail(`${label}: slug inválido`);
  }
  if (new Set(slugs).size !== slugs.length) fail(`${label}: slug duplicado`);
  if (slugs.join(",") !== referenceProjectSlugs.join(",")) fail(`${label}: slugs ou ordem divergem do catálogo PT`);

  for (const project of projects) {
    const projectLabel = `${label}:${project.slug || "sem-slug"}`;
    validateRequiredStrings(project, [
      "slug",
      "kind",
      "catalogGroup",
      "code",
      "name",
      "kicker",
      "status",
      "statusTone",
      "summary",
      "role",
      "evidence",
      "promise",
      "route",
      "image",
      "imageAlt",
      "imageKind",
      "visualLabel",
      "accent",
      "accentRgb",
      "cardCta",
    ], projectLabel);
    if (!isPositiveInteger(project.order)) fail(`${projectLabel}: order inválido`);
    if (!allowedStatusTones.has(project.statusTone)) fail(`${projectLabel}: statusTone desconhecido (${project.statusTone})`);
    if (project.kind === "project" && project.catalogGroup !== "main") fail(`${projectLabel}: project deve pertencer ao grupo main`);
    if (project.kind === "siteCase" && project.catalogGroup !== "sites") fail(`${projectLabel}: siteCase deve pertencer ao grupo sites`);
    if (!["project", "siteCase"].includes(project.kind)) fail(`${projectLabel}: kind desconhecido (${project.kind})`);
    if (!["main", "sites"].includes(project.catalogGroup)) fail(`${projectLabel}: catalogGroup desconhecido (${project.catalogGroup})`);
    if (project.route !== `${locales[locale].routes.projects}${project.slug}/`) fail(`${projectLabel}: rota localizada incorreta`);
    validateAccent(project, projectLabel);
    validateDate(project.lastVerified, projectLabel);
    await validateAssetReference(project.image, project.imageWidth, project.imageHeight, `${projectLabel}.image`);

    const hasCardImage = ["cardImage", "cardImageWidth", "cardImageHeight"].some((field) => field in project);
    if (hasCardImage) {
      await validateAssetReference(project.cardImage, project.cardImageWidth, project.cardImageHeight, `${projectLabel}.cardImage`);
      if (!isNonEmptyString(project.cardImageAlt)) fail(`${projectLabel}: cardImageAlt ausente`);
    }
    if (!Array.isArray(project.facts) || project.facts.length < 1 || project.facts.some((fact) => !isNonEmptyString(fact))) {
      fail(`${projectLabel}: facts ausentes ou inválidos`);
    }
    validateTabs(project.tabs, projectLabel);
    validateCaseSummary(project, projectLabel);
    await validateLinks(project.links, `${projectLabel}.links`);
    if (project.gallery !== undefined) await validateGallery(project.gallery, `${projectLabel}.gallery`);
    if (project.faq !== undefined) {
      validateRequiredStrings(project.faq, ["eyebrow", "title", "intro", "jumpLabel"], `${projectLabel}.faq`);
      if (!Array.isArray(project.faq.items) || project.faq.items.length < 1) {
        fail(`${projectLabel}.faq: items ausentes`);
      } else {
        project.faq.items.forEach((item, index) => {
          validateRequiredStrings(item, ["question", "answer"], `${projectLabel}.faq.items[${index}]`);
        });
      }
      const closingFields = ["closing", "closingLabel", "closingHref"];
      const hasClosing = closingFields.some((field) => field in project.faq);
      if (hasClosing) validateRequiredStrings(project.faq, closingFields, `${projectLabel}.faq`);
    }
    if (project.catalogGroup === "main" && !isNonEmptyString(project.showcaseSubtitle)) {
      fail(`${projectLabel}: showcaseSubtitle obrigatório na vitrine principal`);
    }
  }
}

for (const slug of referenceProjectSlugs) {
  const localized = localeOrder.map((locale) => projectsByLocale[locale].find((project) => project.slug === slug));
  if (localized.some((project) => !project)) continue;
  if (new Set(localized.map(schemaOf)).size !== 1) {
    fail(`projects:${slug}: schema diverge entre PT/EN/ES`);
  }
  if (new Set(localized.map((project) => JSON.stringify(projectInvariant(project)))).size !== 1) {
    fail(`projects:${slug}: campos estruturais divergem entre PT/EN/ES`);
  }
}

const referenceSiteSlugs = sitesByLocale["pt-BR"].sites.map((site) => site.slug);
const collectionInvariant = (collection) => ({
  kind: collection.kind,
  catalogGroup: collection.catalogGroup,
  order: collection.order,
  image: collection.image,
  imageWidth: collection.imageWidth,
  imageHeight: collection.imageHeight,
  imageKind: collection.imageKind,
  accent: collection.accent,
  accentRgb: collection.accentRgb,
});

for (const locale of localeOrder) {
  const data = sitesByLocale[locale];
  const { collection, sites } = data;
  const label = `assets/data/${siteFiles[locale]}`;
  validateRequiredStrings(collection, [
    "slug",
    "kind",
    "catalogGroup",
    "code",
    "name",
    "shortName",
    "kicker",
    "summary",
    "promise",
    "showcaseSubtitle",
    "route",
    "image",
    "imageAlt",
    "imageKind",
    "visualLabel",
    "accent",
    "accentRgb",
    "cardCta",
    "title",
    "description",
    "eyebrow",
    "heading",
    "lead",
    "catalogLabel",
    "selectedLabel",
    "countSingular",
    "countPlural",
    "closeLabel",
    "backLabel",
    "viewCase",
    "visitOfficial",
    "external",
    "objectiveLabel",
    "evidenceLabel",
    "previous",
    "all",
    "next",
  ], `${label}.collection`);
  if (collection.kind !== "collection" || collection.catalogGroup !== "main") {
    fail(`${label}.collection: deve usar kind=collection e catalogGroup=main`);
  }
  if (!isPositiveInteger(collection.order)) fail(`${label}.collection: order inválido`);
  if (collection.route !== locales[locale].routes.sites) fail(`${label}.collection: rota localizada incorreta`);
  if (collection.heading !== approvedCopy[locale].sitesHeading) fail(`${label}.collection: título aprovado do hub divergiu`);
  validateAccent(collection, `${label}.collection`);
  await validateAssetReference(
    collection.image,
    collection.imageWidth,
    collection.imageHeight,
    `${label}.collection.image`,
  );
  if (!Array.isArray(collection.facts) || collection.facts.length < 1 || collection.facts.some((fact) => !isNonEmptyString(fact))) {
    fail(`${label}.collection: facts ausentes ou inválidos`);
  }

  const slugs = sites.map((site) => site.slug);
  if (new Set(slugs).size !== slugs.length) fail(`${label}: slugs de sites duplicados`);
  if (new Set(sites.map((site) => site.id)).size !== sites.length) fail(`${label}: IDs de sites duplicados`);
  if (slugs.join(",") !== referenceSiteSlugs.join(",")) fail(`${label}: sites ou ordem divergem da coleção PT`);
  const orders = sites.map((site) => site.order);
  if (orders.join(",") !== sites.map((_, index) => index + 1).join(",")) fail(`${label}: ordem de sites deve ser contínua`);

  for (const site of sites) {
    const siteLabel = `${label}:${site.slug || "sem-slug"}`;
    validateRequiredStrings(site, [
      "id",
      "slug",
      "kind",
      "catalogGroup",
      "name",
      "category",
      "status",
      "statusTone",
      "summary",
      "objective",
      "icon",
      "route",
      "officialUrl",
      "accent",
      "accentRgb",
    ], siteLabel);
    if (site.kind !== "siteCase" || site.catalogGroup !== "sites") {
      fail(`${siteLabel}: deve usar kind=siteCase e catalogGroup=sites`);
    }
    if (site.visible !== true) fail(`${siteLabel}: visible deve ser true`);
    if (!isPositiveInteger(site.order)) fail(`${siteLabel}: order inválido`);
    if (!allowedStatusTones.has(site.statusTone)) fail(`${siteLabel}: statusTone desconhecido (${site.statusTone})`);
    validateAccent(site, siteLabel);
    validateDate(site.lastVerified, siteLabel);
    await validateAssetReference(site.icon, site.iconWidth, site.iconHeight, `${siteLabel}.icon`);
    if (!site.cover || typeof site.cover !== "object") {
      fail(`${siteLabel}: cover ausente`);
    } else {
      validateRequiredStrings(site.cover, ["src", "alt", "label"], `${siteLabel}.cover`);
      await validateAssetReference(site.cover.src, site.cover.width, site.cover.height, `${siteLabel}.cover`);
    }
    if (!/^https:\/\//i.test(site.officialUrl)) fail(`${siteLabel}: officialUrl deve usar HTTPS`);
    if (!Array.isArray(site.tags) || site.tags.length < 1 || site.tags.some((tag) => !isNonEmptyString(tag))) {
      fail(`${siteLabel}: tags ausentes ou inválidas`);
    }
    if (!Array.isArray(site.evidence) || site.evidence.length < 1 || site.evidence.some((item) => !isNonEmptyString(item))) {
      fail(`${siteLabel}: evidence ausente ou inválida`);
    }
    await validateGallery(site.gallery, `${siteLabel}.gallery`);
    if (site.case) {
      if (site.route !== `${locales[locale].routes.sites}${site.slug}/`) fail(`${siteLabel}: rota de case localizada incorreta`);
      validateRequiredStrings(site.case, [
        "code",
        "kicker",
        "status",
        "statusTone",
        "promise",
        "summary",
        "role",
        "evidence",
        "statusLimit",
        "galleryNote",
      ], `${siteLabel}.case`);
      if (!allowedStatusTones.has(site.case.statusTone)) fail(`${siteLabel}.case: statusTone desconhecido`);
      validateTabs(site.case.tabs, `${siteLabel}.case`);
      validateCaseSummary(site.case, `${siteLabel}.case`);
      await validateLinks(site.case.links, `${siteLabel}.case.links`);
      if (!Array.isArray(site.case.facts) || site.case.facts.length < 1) fail(`${siteLabel}.case: facts ausentes`);
      if (!site.case.links?.some((link) => link.href === site.officialUrl)) {
        fail(`${siteLabel}.case: link oficial ausente`);
      }
    } else {
      const matchingProject = projectsByLocale[locale].find((project) => (
        project.slug === site.slug
        && project.kind === "siteCase"
        && project.catalogGroup === "sites"
      ));
      if (!matchingProject) fail(`${siteLabel}: case sem página de projeto nem conteúdo de case`);
      else if (site.route !== matchingProject.route) fail(`${siteLabel}: rota diverge do projeto siteCase`);
    }
    if (site.relatedProduct) {
      validateRequiredStrings(site.relatedProduct, ["label", "route"], `${siteLabel}.relatedProduct`);
      const target = localTarget(site.relatedProduct.route);
      if (!target?.path || !await exists(target.path)) fail(`${siteLabel}.relatedProduct: rota inexistente`);
    }
  }
}

if (new Set(localeOrder.map((locale) => schemaOf(sitesByLocale[locale].collection))).size !== 1) {
  fail("sites.collection: schema diverge entre PT/EN/ES");
}
if (new Set(localeOrder.map((locale) => JSON.stringify(collectionInvariant(sitesByLocale[locale].collection)))).size !== 1) {
  fail("sites.collection: campos estruturais divergem entre PT/EN/ES");
}
for (const slug of referenceSiteSlugs) {
  const localized = localeOrder.map((locale) => sitesByLocale[locale].sites.find((site) => site.slug === slug));
  if (localized.some((site) => !site)) continue;
  if (new Set(localized.map(schemaOf)).size !== 1) fail(`sites:${slug}: schema diverge entre PT/EN/ES`);
  if (new Set(localized.map((site) => JSON.stringify(siteInvariant(site)))).size !== 1) {
    fail(`sites:${slug}: campos estruturais divergem entre PT/EN/ES`);
  }
}

const mainCatalogFor = (locale) => {
  const visibleSites = sitesByLocale[locale].sites.filter((site) => site.visible === true);
  const collection = sitesByLocale[locale].collection;
  const countLabel = visibleSites.length === 1 ? collection.countSingular : collection.countPlural;
  return [
    ...projectsByLocale[locale].filter((project) => project.catalogGroup === "main"),
    {
      ...collection,
      slug: "sites",
      status: `${visibleSites.length} ${countLabel}`,
      statusTone: "live",
    },
  ].sort((left, right) => left.order - right.order);
};

for (const locale of localeOrder) {
  const label = `catálogo principal ${locale}`;
  const mainProjects = projectsByLocale[locale].filter((project) => project.catalogGroup === "main");
  const catalog = mainCatalogFor(locale);
  const slugs = catalog.map((item) => item.slug);
  const orders = catalog.map((item) => item.order);
  if (mainProjects.length !== 6) fail(`${label}: esperado 6 projects com catalogGroup=main; encontrado ${mainProjects.length}`);
  if (catalog.length !== 7) fail(`${label}: esperado 7 itens principais; encontrado ${catalog.length}`);
  if (slugs.join(",") !== expectedMainOrder.join(",")) fail(`${label}: ordem canônica incorreta (${slugs.join(" → ")})`);
  if (new Set(slugs).size !== slugs.length) fail(`${label}: slug duplicado`);
  if (orders.join(",") !== catalog.map((_, index) => index + 1).join(",")) fail(`${label}: ordem deve ser única e contínua`);
  for (const item of catalog) {
    if (!isNonEmptyString(item.showcaseSubtitle)) fail(`${label}:${item.slug}: showcaseSubtitle ausente`);
    if (!isNonEmptyString(item.status) || !allowedStatusTones.has(item.statusTone)) fail(`${label}:${item.slug}: status inválido`);
  }

  const demonyza = projectsByLocale[locale].find((project) => project.slug === "demonyza");
  if (!demonyza || demonyza.kind !== "siteCase" || demonyza.catalogGroup !== "sites") {
    fail(`${label}: Demonyza deve usar kind=siteCase e catalogGroup=sites`);
  }
  const demonyzaSite = sitesByLocale[locale].sites.find((site) => site.slug === "demonyza");
  if (!demonyzaSite || demonyzaSite.kind !== "siteCase" || demonyzaSite.catalogGroup !== "sites") {
    fail(`${label}: Demonyza deve permanecer subordinada ao hub de Sites`);
  }

  const groupLabels = workMapStructure.map((group) => [group.id, locales[locale].aboutPage.workMap.groups[group.id]]);
  if (JSON.stringify(groupLabels) !== JSON.stringify(expectedWorkMapLabels[locale])) {
    fail(`content/pages.mjs:${locale}.aboutPage.workMap.groups: IDs ou rótulos editoriais divergem da especificação`);
  }
  try {
    const visualTargets = validateWorkMapVisualTargets(workMapVisualTargets);
    const workMap = validateWorkMapStructure(workMapStructure, {
      allowedReferences: new Set(slugs),
      allowedVisualTargets: new Set(visualTargets.ids),
    });
    if (workMapStructure.length !== 5 || workMap.nodeCount !== 12 || workMap.maxDepth !== 1) {
      fail(`content/work-map.mjs: esperado 5 grupos, 12 nós e profundidade atual 1`);
    }
    if (new Set(workMap.references).size !== workMap.references.length) fail("content/work-map.mjs: destino duplicado");
    if (visualTargets.count !== 9 || workMapStructure.some((group) => !group.visualTarget || group.children.some((child) => !child.visualTarget))) {
      fail("content/work-map.mjs: alvos visuais específicos incompletos");
    }
    const effectCounts = Object.values(workMapVisualTargets).reduce((counts, target) => {
      counts[target.effect] = (counts[target.effect] || 0) + 1;
      return counts;
    }, {});
    if (effectCounts.screen !== 2 || effectCounts.ink !== 5 || effectCounts.paper !== 2) {
      fail("content/work-map.mjs: efeitos devem separar exatamente 2 telas, 5 anotações em tinta e 2 superfícies de papel");
    }
    if (
      workMap.references.length !== expectedMainOrder.length
      || expectedMainOrder.some((slug) => !workMap.references.includes(slug))
    ) {
      fail("content/work-map.mjs: deve mapear exatamente os 7 itens principais");
    }
  } catch (error) {
    fail(`content/work-map.mjs: ${error.message}`);
  }
}

const workMapStressCases = [1, 2, 6, 12].map((count) => ({
  label: `${count} filhos`,
  structure: [{
    id: `fixture-${count}`,
    type: "group",
    children: Array.from({ length: count }, (_, index) => ({
      id: `fixture-${count}-item-${index + 1}`,
      type: "project",
      slug: `fixture-${count}-item-${index + 1}`,
      children: [],
    })),
  }],
}));
workMapStressCases.push({
  label: "três níveis",
  structure: [{
    id: "fixture-deep",
    type: "group",
    children: [{
      id: "fixture-deep-branch",
      type: "group",
      children: [{
        id: "fixture-deep-leaf",
        type: "project",
        slug: "fixture-deep-leaf",
        children: [],
      }],
    }],
  }],
});
for (const fixture of workMapStressCases) {
  try {
    const flattened = flattenWorkMap(fixture.structure);
    const references = new Set(flattened.map((node) => node.slug || node.key).filter(Boolean));
    const result = validateWorkMapStructure(fixture.structure, { allowedReferences: references });
    if (result.nodeCount !== flattened.length) fail(`work-map fixture ${fixture.label}: contagem inconsistente`);
    if (fixture.label === "três níveis") {
      if (result.maxDepth !== 2) fail("work-map fixture três níveis: profundidade recursiva ausente");
      const nestedTitle = resolveWorkMapNodeTitle(fixture.structure[0].children[0], {
        groupLabels: { "fixture-deep-branch": "Subgrupo localizado" },
      });
      if (nestedTitle !== "Subgrupo localizado") fail("work-map fixture três níveis: renderer não resolve grupo localizado aninhado");
    }
  } catch (error) {
    fail(`work-map fixture ${fixture.label}: ${error.message}`);
  }
}

const cyclicNode = { id: "fixture-cycle", type: "group", children: [] };
cyclicNode.children.push(cyclicNode);
for (const [label, fixture] of [
  ["ciclo", [cyclicNode]],
  ["ID duplicado", [{ id: "fixture-duplicate", type: "group", children: [{ id: "fixture-duplicate", type: "project", slug: "fixture-duplicate", children: [] }] }]],
  ["referência inválida", [{ id: "fixture-reference", type: "group", children: [{ id: "fixture-missing", type: "project", slug: "fixture-missing", children: [] }] }]],
]) {
  let rejected = false;
  try {
    validateWorkMapStructure(fixture, { allowedReferences: new Set() });
  } catch {
    rejected = true;
  }
  if (!rejected) fail(`work-map fixture negativa não rejeitada: ${label}`);
}

const expectedAssetSlugs = [...new Set([...referenceProjectSlugs, "sites"])];
for (const slug of expectedAssetSlugs) {
  const asset = projectAssets[slug];
  const label = `assets/data/project-assets.json:${slug}`;
  if (!asset) {
    fail(`${label}: entrada ausente`);
    continue;
  }
  validateRequiredStrings(asset, ["src", "kind", "source"], label);
  if (typeof asset.official !== "boolean") fail(`${label}: official deve ser boolean`);
  await validateAssetReference(asset.src, asset.width, asset.height, label);
}
for (const slug of Object.keys(projectAssets)) {
  if (!expectedAssetSlugs.includes(slug)) fail(`assets/data/project-assets.json: entrada órfã ${slug}`);
}
await validateAssetReference("/assets/img/brand/favicon-512.png", 512, 512, "favicon PNG");
await validateAssetReference("/assets/img/social-card.png", 1200, 630, "imagem social Sobre");
await validateAssetReference("/assets/img/social-projects.png", 1200, 630, "imagem social Projetos");
await validateAssetReference("/assets/img/social-sites.png", 1200, 630, "imagem social Sites");
await validateAssetReference("/assets/img/social-local-first.png", 1200, 750, "imagem social Local First Checklist");
await validateAssetReference("/assets/img/gui/mapa-do-trabalho-640.webp", 640, 360, "mapa de trabalho 640");
await validateAssetReference("/assets/img/gui/mapa-do-trabalho-960.webp", 960, 540, "mapa de trabalho 960");
await validateAssetReference("/assets/img/gui/mapa-do-trabalho-1280.webp", 1280, 720, "mapa de trabalho 1280");
await validateAssetReference("/assets/img/gui/mapa-do-trabalho-1672.webp", 1672, 941, "mapa de trabalho 1672");

const routeForDescriptor = (locale, type, slug = "") => {
  const config = locales[locale];
  if (type === "about") return config.home;
  if (type === "projects") return config.routes.projects;
  if (type === "contact") return config.routes.contact;
  if (type === "privacy") return config.routes.privacy;
  if (type === "sites") return config.routes.sites;
  if (type === "notFound") return expectedCoreRoutes[locale].notFound;
  if (type === "project") return projectsByLocale[locale].find((project) => project.slug === slug)?.route ?? "";
  if (type === "site") return sitesByLocale[locale].sites.find((site) => site.slug === slug)?.route ?? "";
  return "";
};

const expectedPages = [];
for (const locale of localeOrder) {
  const config = locales[locale];
  const siteContent = sitesByLocale[locale];
  expectedPages.push(
    {
      locale,
      type: "about",
      route: config.home,
      heading: config.aboutPage.heading,
      activeNav: "about",
      canonical: true,
    },
    {
      locale,
      type: "projects",
      route: config.routes.projects,
      heading: config.projectsPage.heading,
      activeNav: "projects",
      canonical: true,
    },
    {
      locale,
      type: "contact",
      route: config.routes.contact,
      heading: config.contactPage.heading,
      activeNav: "contact",
      canonical: true,
    },
    {
      locale,
      type: "privacy",
      route: config.routes.privacy,
      heading: config.privacyPage.heading,
      activeNav: null,
      canonical: true,
    },
    {
      locale,
      type: "sites",
      route: config.routes.sites,
      heading: siteContent.collection.heading,
      activeNav: "projects",
      canonical: true,
      collection: siteContent.collection,
    },
  );
  for (const project of projectsByLocale[locale]) {
    expectedPages.push({
      locale,
      type: "project",
      slug: project.slug,
      route: project.route,
      heading: project.name,
      activeNav: "projects",
      canonical: true,
      project,
    });
  }
  for (const site of siteContent.sites.filter((item) => item.visible === true && item.case)) {
    expectedPages.push({
      locale,
      type: "site",
      slug: site.slug,
      route: site.route,
      heading: site.name,
      activeNav: "projects",
      canonical: true,
      site,
    });
  }
  expectedPages.push({
    locale,
    type: "notFound",
    route: expectedCoreRoutes[locale].notFound,
    heading: config.notFoundPage.heading,
    activeNav: null,
    canonical: false,
  });
}

const pageKey = ({ locale, type, slug = "" }) => `${locale}:${type}:${slug}`;
const expectedHtmlPaths = new Set();
for (const page of expectedPages) {
  const path = routeFile(page.route);
  if (!path) fail(`rota inválida no contrato gerado: ${pageKey(page)} (${page.route || "vazia"})`);
  else expectedHtmlPaths.add(publicPath(path));
}
const actualHtmlPaths = new Set(htmlFiles.map(publicPath));

for (const path of expectedHtmlPaths) {
  if (!actualHtmlPaths.has(path)) fail(`rota gerada ausente: ${path}`);
}
for (const path of actualHtmlPaths) {
  if (!expectedHtmlPaths.has(path)) fail(`HTML não canônico ou inesperado: ${path}`);
}

const htmlCache = new Map();
const getHtml = async (path) => {
  if (!htmlCache.has(path)) htmlCache.set(path, await readText(path));
  return htmlCache.get(path);
};

const validateNavigation = (html, page, label) => {
  const navMatch = html.match(/<nav\b[^>]*class="[^"]*\bsite-nav\b[^"]*"[^>]*>([\s\S]*?)<\/nav>/i);
  if (!navMatch) {
    fail(`${label}: navegação principal ausente`);
    return;
  }
  const navAnchors = anchorEntries(navMatch[1])
    .map(({ attributes }) => attributes)
    .filter((attributes) => attributes["data-site-nav"]);
  const order = navAnchors.map((attributes) => attributes["data-site-nav"]);
  if (order.join(",") !== "projects,about,contact") {
    fail(`${label}: ordem DOM deve ser Projetos | Sobre | Contato`);
  }
  const expectedHrefs = {
    projects: locales[page.locale].routes.projects,
    about: locales[page.locale].home,
    contact: locales[page.locale].routes.contact,
  };
  for (const item of ["projects", "about", "contact"]) {
    const anchor = navAnchors.find((attributes) => attributes["data-site-nav"] === item);
    if (!anchor || anchor.href !== expectedHrefs[item]) fail(`${label}: link de navegação incorreto para ${item}`);
  }
  const currentItems = navAnchors
    .filter((attributes) => attributes["aria-current"] === "page")
    .map((attributes) => attributes["data-site-nav"]);
  const expectedCurrent = page.activeNav ? [page.activeNav] : [];
  if (currentItems.join(",") !== expectedCurrent.join(",")) {
    fail(`${label}: aria-current incorreto (${currentItems.join(",") || "nenhum"})`);
  }
  for (const anchor of navAnchors) {
    const item = anchor["data-site-nav"];
    const value = anchor["aria-current"];
    if (item === page.activeNav && value !== "page") fail(`${label}: item ativo ${item} deve usar aria-current=page`);
    if (item !== page.activeNav && value !== undefined && value !== "false") {
      fail(`${label}: item inativo ${item} não deve declarar aria-current=${value}`);
    }
  }
};

const validateSocialMetadata = async (head, page, label) => {
  const requiredProperties = [
    "og:type",
    "og:locale",
    "og:site_name",
    "og:title",
    "og:description",
    "og:image",
    "og:image:type",
    "og:image:alt",
    "og:image:width",
    "og:image:height",
  ];
  const requiredNames = [
    "twitter:card",
    "twitter:title",
    "twitter:description",
    "twitter:image",
    "twitter:image:alt",
  ];
  for (const property of requiredProperties) {
    const values = metaValues(head, "property", property);
    if (values.length !== 1 || !isNonEmptyString(values[0])) fail(`${label}: ${property} ausente, vazio ou duplicado`);
  }
  for (const name of requiredNames) {
    const values = metaValues(head, "name", name);
    if (values.length !== 1 || !isNonEmptyString(values[0])) fail(`${label}: ${name} ausente, vazio ou duplicado`);
  }
  const twitterCard = metaValues(head, "name", "twitter:card");
  if (twitterCard[0] !== "summary_large_image") fail(`${label}: twitter:card deve ser summary_large_image`);
  const ogLocale = metaValues(head, "property", "og:locale");
  if (ogLocale[0] !== locales[page.locale].ogLocale) fail(`${label}: og:locale incorreto`);
  const title = elementContents(head, "title").map(stripTags)[0];
  const description = metaValues(head, "name", "description")[0];
  if (metaValues(head, "property", "og:title")[0] !== title || metaValues(head, "name", "twitter:title")[0] !== title) {
    fail(`${label}: títulos OG/Twitter divergem de title`);
  }
  if (
    metaValues(head, "property", "og:description")[0] !== description
    || metaValues(head, "name", "twitter:description")[0] !== description
  ) {
    fail(`${label}: descrições OG/Twitter divergem de description`);
  }
  const ogImage = metaValues(head, "property", "og:image")[0];
  const twitterImage = metaValues(head, "name", "twitter:image")[0];
  if (ogImage !== twitterImage) fail(`${label}: imagens OG e Twitter divergem`);
  const expectedImagePath = page.type === "projects"
    ? "/assets/img/social-projects.png"
    : page.type === "sites" || (page.type === "project" && page.slug === "demonyza")
      ? "/assets/img/social-sites.png"
      : page.type === "project" && page.slug === "local-first-checklist"
        ? "/assets/img/social-local-first.png"
      : page.type === "project"
        ? page.slug === "clubal" ? page.project.image : page.project.cardImage ?? page.project.image
        : page.type === "site"
          ? page.site.cover.src
          : "/assets/img/social-card.png";
  if (ogImage !== `${siteConfig.origin}${expectedImagePath}`) {
    fail(`${label}: imagem social não corresponde ao contexto da página`);
  }
  const expectedImageType = expectedImagePath.toLowerCase().endsWith(".png")
    ? "image/png"
    : expectedImagePath.toLowerCase().endsWith(".webp") ? "image/webp"
      : expectedImagePath.toLowerCase().endsWith(".jpg") || expectedImagePath.toLowerCase().endsWith(".jpeg")
        ? "image/jpeg"
        : "image/svg+xml";
  if (metaValues(head, "property", "og:image:type")[0] !== expectedImageType) {
    fail(`${label}: MIME da imagem social incorreto`);
  }
  if (
    metaValues(head, "property", "og:image:alt")[0] !== metaValues(head, "name", "twitter:image:alt")[0]
  ) {
    fail(`${label}: textos alternativos OG e Twitter divergem`);
  }
  if (
    !isPositiveInteger(Number(metaValues(head, "property", "og:image:width")[0]))
    || !isPositiveInteger(Number(metaValues(head, "property", "og:image:height")[0]))
  ) {
    fail(`${label}: dimensões da imagem social são inválidas`);
  }
  try {
    const imageUrl = new URL(ogImage);
    if (imageUrl.origin !== siteConfig.origin) {
      fail(`${label}: imagem social deve usar o origin canônico`);
    } else {
      const target = localTarget(imageUrl.pathname);
      if (!target?.path || !await exists(target.path)) fail(`${label}: imagem social local inexistente`);
    }
  } catch {
    fail(`${label}: URL da imagem social inválida`);
  }
};

const parseJsonLd = (html, label) => {
  const nodes = [];
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const attributes = attributesOf(`<script ${match[1]}>`);
    if (attributes.type !== "application/ld+json") continue;
    try {
      const value = JSON.parse(match[2]);
      const values = Array.isArray(value) ? value : [value];
      for (const entry of values) {
        nodes.push(entry);
        if (Array.isArray(entry?.["@graph"])) nodes.push(...entry["@graph"]);
      }
    } catch (error) {
      fail(`${label}: JSON-LD inválido (${error.message})`);
    }
  }
  return nodes;
};

const validateStructuredData = async (html, page, canonicalUrl, label) => {
  const nodes = parseJsonLd(html, label);
  const forbiddenKeys = new Set(["aggregateRating", "offers", "price", "ratingValue", "review"]);
  const findForbiddenKey = (value) => {
    if (!value || typeof value !== "object") return null;
    for (const [key, child] of Object.entries(value)) {
      if (forbiddenKeys.has(key)) return key;
      const nested = findForbiddenKey(child);
      if (nested) return nested;
    }
    return null;
  };
  for (const node of nodes) {
    const forbidden = findForbiddenKey(node);
    if (forbidden) fail(`${label}: JSON-LD não deve declarar ${forbidden}`);
  }
  if (page.type === "about") {
    const person = nodes.find((node) => node?.["@type"] === "Person");
    const website = nodes.find((node) => node?.["@type"] === "WebSite");
    if (!person || !website) fail(`${label}: página Sobre deve conter Person e WebSite em JSON-LD`);
    if (person && (person.name !== "Guilherme Rocha" || person.url !== canonicalUrl)) fail(`${label}: Person JSON-LD divergente`);
    if (person && !person.sameAs?.includes(siteConfig.githubUrl)) fail(`${label}: Person JSON-LD sem GitHub público`);
    if (person && person.image !== `${siteConfig.origin}/assets/img/gui/identidade-aeroporto.webp`) fail(`${label}: imagem do Person JSON-LD divergente`);
    if (person && person.jobTitle !== locales[page.locale].aboutPage.role) fail(`${label}: cargo localizado ausente no Person JSON-LD`);
    if (person && (person.address?.["@type"] !== "PostalAddress" || person.address?.addressRegion !== "Minas Gerais" || person.address?.addressCountry !== "BR")) {
      fail(`${label}: localização pública do Person JSON-LD está incompleta`);
    }
    if (website && website.url !== canonicalUrl) fail(`${label}: WebSite JSON-LD com URL incorreta`);
    if (person && website && website.author?.["@id"] !== person["@id"]) fail(`${label}: relação autor/WebSite ausente no JSON-LD`);
  }
  if (page.type === "project" || page.type === "site") {
    const breadcrumb = nodes.find((node) => node?.["@type"] === "BreadcrumbList");
    if (!breadcrumb) fail(`${label}: página individual sem BreadcrumbList`);
    else {
      const items = breadcrumb.itemListElement;
      if (!Array.isArray(items) || items.length !== 2) fail(`${label}: BreadcrumbList deve conter dois níveis`);
      else {
        if (items.some((item, index) => item?.position !== index + 1)) fail(`${label}: posições do BreadcrumbList são inválidas`);
        if (items.at(-1)?.item !== canonicalUrl) fail(`${label}: BreadcrumbList não termina na URL canônica`);
        if (items.some((item) => !String(item?.item ?? "").startsWith(`${siteConfig.origin}/`))) {
          fail(`${label}: BreadcrumbList contém URL fora do origin canônico`);
        }
      }
    }
    const work = nodes.find((node) => ["CreativeWork", "SoftwareApplication"].includes(node?.["@type"]));
    if (!work) fail(`${label}: página individual sem CreativeWork ou SoftwareApplication`);
    else {
      const source = page.type === "project" ? page.project : page.site;
      const expectedImage = page.type === "project" ? page.project.image : page.site.cover.src;
      if (work.url !== canonicalUrl) fail(`${label}: JSON-LD da página individual usa URL incorreta`);
      if (work.name !== page.heading) fail(`${label}: nome do JSON-LD diverge do H1`);
      if (work.description !== source.summary) fail(`${label}: descrição do JSON-LD diverge dos dados`);
      if (work.inLanguage !== locales[page.locale].htmlLang) fail(`${label}: idioma do JSON-LD incorreto`);
      if (work.creator?.name !== "Guilherme Rocha") fail(`${label}: autoria do JSON-LD incorreta`);
      if (work.image !== `${siteConfig.origin}${expectedImage}`) fail(`${label}: imagem do JSON-LD diverge dos dados`);
      try {
        const imageUrl = new URL(work.image);
        const target = imageUrl.origin === siteConfig.origin ? localTarget(imageUrl.pathname) : null;
        if (!target?.path || !await exists(target.path)) fail(`${label}: imagem do JSON-LD não é um asset local válido`);
      } catch {
        fail(`${label}: imagem do JSON-LD inválida`);
      }
    }
  }
};

const findClassAnchor = (html, className) => (
  anchorEntries(html).find(({ attributes }) => hasClass(attributes, className))?.attributes ?? null
);

const expectedNextItem = (locale, item) => {
  const catalog = mainCatalogFor(locale);
  const activeSlug = item.catalogGroup === "sites" ? "sites" : item.slug;
  const index = catalog.findIndex((candidate) => candidate.slug === activeSlug);
  return index >= 0 ? catalog[(index + 1) % catalog.length] : null;
};

const validateNextProject = (html, locale, item, label) => {
  const expected = expectedNextItem(locale, item);
  const anchor = findClassAnchor(html, "next-project");
  if (!expected) fail(`${label}: item não mapeado na sequência principal`);
  else if (!anchor || anchor.href !== expected.route) {
    fail(`${label}: próximo projeto deve apontar para ${expected.route}`);
  }
};

const validateSiteCaseNavigation = (html, locale, activeSlug, label) => {
  const navMatch = html.match(/<nav\b[^>]*class="[^"]*\bsite-case-navigation\b[^"]*"[^>]*>([\s\S]*?)<\/nav>/i);
  if (!navMatch) {
    fail(`${label}: navegação secundária de sites ausente`);
    return;
  }
  const sites = sitesByLocale[locale].sites.filter((site) => site.visible === true).sort((left, right) => left.order - right.order);
  const activeIndex = sites.findIndex((site) => site.slug === activeSlug);
  if (activeIndex < 0) {
    fail(`${label}: case não está na coleção de Sites`);
    return;
  }
  const previous = sites[(activeIndex - 1 + sites.length) % sites.length];
  const next = sites[(activeIndex + 1) % sites.length];
  const links = anchorEntries(navMatch[1]).map(({ attributes }) => attributes);
  const previousLink = links.find((attributes) => hasClass(attributes, "site-case-previous"));
  const nextLink = links.find((attributes) => hasClass(attributes, "site-case-next"));
  if (previousLink?.href !== previous.route) fail(`${label}: site anterior incorreto`);
  if (nextLink?.href !== next.route) fail(`${label}: próximo site incorreto`);
  if (!links.some((attributes) => attributes.href === sitesByLocale[locale].collection.route)) {
    fail(`${label}: retorno ao hub de Sites ausente`);
  }
};

const validateDetailVisual = (html, item, visual, status, label) => {
  const image = startTags(html, "img")
    .map(attributesOf)
    .find((attributes) => attributes.src === visual?.src);
  if (
    image?.src !== visual?.src
    || Number(image?.width) !== visual?.width
    || Number(image?.height) !== visual?.height
  ) {
    fail(`${label}: imagem principal ou dimensões divergem dos dados`);
  }
  const shell = startTags(html, "article")
    .map(attributesOf)
    .find((attributes) => hasClass(attributes, "project-shell"));
  if (
    !shell?.style?.includes(`--project-accent:${item.accent}`)
    || !shell?.style?.includes(`--project-accent-rgb:${item.accentRgb}`)
  ) {
    fail(`${label}: accent da página individual diverge dos dados`);
  }
  const statusText = [...html.matchAll(/<span\b([^>]*)>([\s\S]*?)<\/span>/gi)]
    .map((match) => ({
      attributes: attributesOf(`<span ${match[1]}>`),
      text: stripTags(match[2]),
    }))
    .find(({ attributes }) => hasClass(attributes, "status-pill"))?.text;
  if (statusText !== status) fail(`${label}: status da página individual diverge dos dados`);
};

const validateNoJsGallery = (html, gallery, label) => {
  if (!Array.isArray(gallery) || gallery.length < 1) return;
  if (gallery.length === 1) {
    for (const marker of [
      "data-project-gallery",
      "gallery-controls",
      "data-gallery-data",
      "data-gallery-live",
      "data-gallery-previous",
      "data-gallery-next",
      "data-gallery-current",
    ]) {
      if (html.includes(marker)) fail(`${label}: imagem única não deve renderizar estrutura de carrossel (${marker})`);
    }
    return;
  }
  const fallback = elementContents(html, "noscript").join("\n");
  for (const item of gallery) {
    if (!fallback.includes(`href="${item.src}"`) || !fallback.includes(item.label)) {
      fail(`${label}: fallback sem JS da galeria não inclui ${item.label}`);
    }
  }
  const galleryAttributes = startTags(html, "figure")
    .map(attributesOf)
    .find((attributes) => "data-project-gallery" in attributes);
  if (!galleryAttributes) fail(`${label}: raiz da galeria ausente`);
  else if ("tabindex" in galleryAttributes) fail(`${label}: galeria sem JS não deve manter foco inoperante`);
  for (const marker of ["gallery-controls", "data-gallery-data", "data-gallery-live", "data-gallery-previous", "data-gallery-next"]) {
    if (!html.includes(marker)) fail(`${label}: galeria com múltiplas imagens sem ${marker}`);
  }
};

const canonicalTitles = Object.fromEntries(localeOrder.map((locale) => [locale, new Map()]));
const canonicalDescriptions = Object.fromEntries(localeOrder.map((locale) => [locale, new Map()]));

for (const page of expectedPages) {
  const path = routeFile(page.route);
  if (!path || !await exists(path)) continue;
  const html = await getHtml(path);
  const label = publicPath(path);
  const config = locales[page.locale];
  const head = headOf(html);
  const htmlTag = startTags(html, "html")[0];
  const bodyTag = startTags(html, "body")[0];
  const htmlAttributes = attributesOf(htmlTag ?? "");
  const bodyAttributes = attributesOf(bodyTag ?? "");

  if (htmlAttributes.lang !== config.htmlLang) fail(`${label}: lang incorreto`);
  if (bodyAttributes["data-locale"] !== page.locale) fail(`${label}: data-locale incorreto`);
  if (bodyAttributes["data-page"] !== page.type) fail(`${label}: data-page deve ser ${page.type}`);
  if (!html.includes("<main") || !html.includes('id="content"')) fail(`${label}: main#content ausente`);
  if (!html.includes("skip-link")) fail(`${label}: skip link ausente`);
  if (!html.includes("language-switcher")) fail(`${label}: seletor de idioma ausente`);
  if (!html.includes("brand-logo") || !html.includes("brand-copy")) fail(`${label}: marca do cabeçalho incompleta`);
  if (!html.includes(config.common.brandTagline)) fail(`${label}: assinatura localizada da marca ausente`);
  if (!/href="\/assets\/css\/styles\.css\?v=[a-f0-9]{12}"/.test(html)) fail(`${label}: CSS sem versão de conteúdo`);
  if (!/src="\/assets\/js\/theme-boot\.js\?v=[a-f0-9]{12}"/.test(html)) fail(`${label}: theme-boot.js sem versão de conteúdo`);
  if (!/src="\/assets\/js\/site\.js\?v=[a-f0-9]{12}"/.test(html)) fail(`${label}: site.js sem versão de conteúdo`);
  const headTags = startTags(head, "script");
  const themeBootTag = headTags.find((tag) => /src="\/assets\/js\/theme-boot\.js\?v=[a-f0-9]{12}"/.test(tag));
  const themeBootAttributes = attributesOf(themeBootTag ?? "");
  const stylesheetTag = startTags(head, "link").find((tag) => (attributesOf(tag).rel || "").split(/\s+/).includes("stylesheet"));
  if (!themeBootTag || "defer" in themeBootAttributes || "async" in themeBootAttributes || themeBootAttributes.type === "module") {
    fail(`${label}: theme-boot.js deve ser síncrono`);
  } else if (!stylesheetTag || head.indexOf(themeBootTag) > head.indexOf(stylesheetTag)) {
    fail(`${label}: theme-boot.js deve vir antes do CSS`);
  }
  const themeColors = metaValues(head, "name", "theme-color");
  if (themeColors.length !== 1 || themeColors[0] !== "#f4f9fc") fail(`${label}: theme-color inicial oceânico incorreto`);
  if (linkEntries(head, "manifest").length) fail(`${label}: link PWA manifest não deve existir`);
  const iconLinks = linkEntries(head, "icon");
  if (
    iconLinks.length !== 2
    || !iconLinks.some((entry) => entry.href === "/favicon.svg" && entry.type === "image/svg+xml")
    || !iconLinks.some((entry) => entry.href === "/assets/img/brand/favicon-512.png" && entry.type === "image/png" && entry.sizes === "512x512")
  ) {
    fail(`${label}: conjunto de favicons SVG/PNG está incompleto`);
  }
  const touchIcons = linkEntries(head, "apple-touch-icon");
  if (touchIcons.length !== 1 || touchIcons[0].href !== "/assets/img/brand/favicon-512.png" || touchIcons[0].sizes !== "512x512") {
    fail(`${label}: apple-touch-icon está ausente ou incorreto`);
  }

  const h1Values = elementContents(html, "h1").map(stripTags);
  if (h1Values.length !== 1) fail(`${label}: deve conter exatamente um H1`);
  else if (h1Values[0] !== page.heading) fail(`${label}: H1 diverge da fonte localizada`);
  const titles = elementContents(head, "title").map(stripTags);
  if (titles.length !== 1 || !isNonEmptyString(titles[0])) fail(`${label}: title ausente, vazio ou duplicado`);
  const descriptions = metaValues(head, "name", "description");
  if (descriptions.length !== 1 || !isNonEmptyString(descriptions[0])) fail(`${label}: description ausente, vazia ou duplicada`);
  if (metaValues(head, "name", "viewport").length !== 1) fail(`${label}: viewport ausente ou duplicado`);

  validateNavigation(html, page, label);
  const brand = anchorEntries(html).find(({ attributes }) => hasClass(attributes, "brand-lockup"))?.attributes;
  if (!brand || brand.href !== config.home) fail(`${label}: link da marca deve apontar para a raiz localizada`);
  await validateSocialMetadata(head, page, label);

  const canonicalUrl = `${siteConfig.origin}${page.route}`;
  const canonicals = linkEntries(head, "canonical");
  const alternates = linkEntries(head, "alternate");
  const ogUrls = metaValues(head, "property", "og:url");
  if (page.canonical) {
    if (canonicals.length !== 1 || canonicals[0].href !== canonicalUrl) fail(`${label}: canonical incorreto ou duplicado`);
    if (ogUrls.length !== 1 || ogUrls[0] !== canonicalUrl) fail(`${label}: og:url incorreto ou duplicado`);
    const expectedAlternates = localeOrder.map((targetLocale) => ({
      hreflang: targetLocale === "pt-BR" ? "pt-BR" : targetLocale,
      href: `${siteConfig.origin}${routeForDescriptor(targetLocale, page.type, page.slug)}`,
    }));
    expectedAlternates.push({
      hreflang: "x-default",
      href: `${siteConfig.origin}${routeForDescriptor("pt-BR", page.type, page.slug)}`,
    });
    if (alternates.length !== expectedAlternates.length) fail(`${label}: conjunto hreflang deve conter PT/EN/ES/x-default`);
    for (const expected of expectedAlternates) {
      if (!alternates.some((entry) => entry.hreflang === expected.hreflang && entry.href === expected.href)) {
        fail(`${label}: hreflang ${expected.hreflang} ausente ou incorreto`);
      }
    }
    if (metaValues(head, "name", "robots").some((value) => /\bnoindex\b/i.test(value))) {
      fail(`${label}: página canônica não deve usar noindex`);
    }
    if (titles[0]) {
      const previous = canonicalTitles[page.locale].get(titles[0]);
      if (previous) fail(`${label}: title duplicado com ${previous}`);
      else canonicalTitles[page.locale].set(titles[0], label);
    }
    if (descriptions[0]) {
      const previous = canonicalDescriptions[page.locale].get(descriptions[0]);
      if (previous) fail(`${label}: description duplicada com ${previous}`);
      else canonicalDescriptions[page.locale].set(descriptions[0], label);
    }
  } else {
    if (canonicals.length) fail(`${label}: 404 não deve conter canonical`);
    if (alternates.length) fail(`${label}: 404 não deve conter link hreflang`);
    if (ogUrls.length) fail(`${label}: 404 não deve declarar og:url canônica`);
    const robots = metaValues(head, "name", "robots");
    if (robots.length !== 1 || !/\bnoindex\b/i.test(robots[0])) fail(`${label}: 404 deve usar noindex`);
  }
  await validateStructuredData(html, page, canonicalUrl, label);

  if (page.type === "about") {
    if (!html.includes('src="/assets/img/gui/identidade-aeroporto.webp"')) fail(`${label}: retrato de identidade da página Sobre ausente`);
    if (!html.includes('src="/assets/img/gui/mapa-do-trabalho-1280.webp"')) fail(`${label}: imagem definitiva do mapa de trabalho ausente`);
    for (const width of [640, 960, 1280, 1672]) {
      if (!html.includes(`/assets/img/gui/mapa-do-trabalho-${width}.webp ${width}w`)) fail(`${label}: variante ${width} do mapa ausente`);
    }
    if (html.includes("retrato-editorial") || html.includes("landscape-copy") || /<figcaption\b/i.test(html)) {
      fail(`${label}: estrutura editorial antiga do mural ainda está presente`);
    }
    if (!/src="\/assets\/js\/about\.js\?v=[a-f0-9]{12}"/.test(html)) fail(`${label}: about.js ausente`);
    if (!/src="\/assets\/js\/legacy-project-link\.js\?v=[a-f0-9]{12}"/.test(html)) fail(`${label}: compatibilidade de deep link antigo ausente`);
    const aboutHeadingMarkup = elementContents(html, "h1")[0] ?? "";
    if (/<(?:br|wbr)\b/i.test(aboutHeadingMarkup)) fail(`${label}: H1 de Sobre não deve forçar quebra`);
    if (!html.includes(config.aboutPage.eyebrow) || !html.includes(config.aboutPage.methodEyebrow)) {
      fail(`${label}: eyebrows de Sobre divergem da fonte`);
    }
    const identityMatch = html.match(/<div\b[^>]*class="[^"]*\babout-identity\b[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    const identityText = stripTags(identityMatch?.[1] ?? "");
    if (!identityText.includes(config.aboutPage.role) || !identityText.includes(config.aboutPage.portraitCaption)) {
      fail(`${label}: identidade profissional localizada incompleta`);
    }
    if (identityText.includes("Guilherme Rocha")) fail(`${label}: nome não deve ser repetido no bloco de identidade`);
    const workMapSections = startTags(html, "section").map(attributesOf).filter((attributes) => "data-work-map" in attributes);
    if (workMapSections.length !== 1 || !workMapSections[0]["aria-labelledby"]) fail(`${label}: seção acessível do mapa ausente ou duplicada`);
    const workMapNavs = startTags(html, "nav").map(attributesOf).filter((attributes) => "data-work-map-nav" in attributes);
    if (workMapNavs.length !== 1 || workMapNavs[0]["aria-labelledby"] !== workMapSections[0]?.["aria-labelledby"]) {
      fail(`${label}: navegação do mapa não compartilha o título acessível`);
    }
    const workMapVisuals = startTags(html, "div").map(attributesOf).filter((attributes) => "data-work-map-visual" in attributes);
    if (workMapVisuals.length !== 1) fail(`${label}: composição visual do mapa ausente ou duplicada`);
    const hotspotSvgs = startTags(html, "svg").map(attributesOf).filter((attributes) => "data-work-map-hotspots" in attributes);
    if (
      hotspotSvgs.length !== 1
      || hotspotSvgs[0].viewbox !== "0 0 1672 941"
      || hotspotSvgs[0].preserveaspectratio !== "xMidYMid meet"
      || hotspotSvgs[0]["aria-hidden"] !== "true"
      || hotspotSvgs[0].focusable !== "false"
    ) {
      fail(`${label}: SVG de hotspots precisa compartilhar o sistema 1672x941 e permanecer decorativo`);
    }
    const hotspotGroups = startTags(html, "g").map(attributesOf).filter((attributes) => "data-work-map-hotspot" in attributes);
    const expectedHotspotIds = Object.keys(workMapVisualTargets).sort();
    const generatedHotspotIds = hotspotGroups.map((attributes) => attributes["data-work-map-hotspot"]).sort();
    const localeId = page.locale.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    if (
      hotspotGroups.length !== expectedHotspotIds.length
      || JSON.stringify(generatedHotspotIds) !== JSON.stringify(expectedHotspotIds)
      || hotspotGroups.some((attributes) => {
        const targetId = attributes["data-work-map-hotspot"];
        const target = workMapVisualTargets[targetId];
        return !Number.isFinite(Number(attributes["data-focus-x"]))
          || !Number.isFinite(Number(attributes["data-focus-y"]))
          || attributes["data-work-map-effect"] !== target?.effect
          || attributes["data-work-map-clip"] !== `url(#work-map-clip-${localeId}-${targetId})`;
      })
    ) {
      fail(`${label}: hotspots gerados divergem dos nove alvos visuais canônicos`);
    }
    const clipPaths = startTags(html, "clippath").map(attributesOf);
    const expectedClipPathIds = expectedHotspotIds.map((targetId) => `work-map-clip-${localeId}-${targetId}`).sort();
    if (
      clipPaths.length !== expectedClipPathIds.length
      || JSON.stringify(clipPaths.map((attributes) => attributes.id).sort()) !== JSON.stringify(expectedClipPathIds)
      || clipPaths.some((attributes) => attributes.clippathunits !== "userSpaceOnUse")
    ) {
      fail(`${label}: recortes SVG por objeto precisam usar os nove alvos e o sistema de coordenadas da fotografia`);
    }
    const focusImages = startTags(html, "image").map(attributesOf).filter((attributes) => "data-work-map-focus-image" in attributes);
    if (
      focusImages.length !== 1
      || focusImages[0]["data-active"] !== "false"
      || focusImages[0].href !== "/assets/img/gui/mapa-do-trabalho-1280.webp"
      || focusImages[0].x !== "0"
      || focusImages[0].y !== "0"
      || focusImages[0].width !== "1672"
      || focusImages[0].height !== "941"
      || focusImages[0].preserveaspectratio !== "xMidYMid slice"
    ) {
      fail(`${label}: a iluminação por objeto deve reutilizar uma única imagem responsiva alinhada ao mural`);
    }
    const inkOrbitGroups = startTags(html, "g").map(attributesOf).filter((attributes) => hasClass(attributes, "work-map-hotspot-orbit"));
    if (inkOrbitGroups.length !== 10) fail(`${label}: as cinco anotações em tinta precisam de duas órbitas neon cada`);
    const hotspotFilters = startTags(html, "fegaussianblur").map(attributesOf);
    if (hotspotFilters.length !== 1 || hotspotFilters[0].stddeviation !== "8") {
      fail(`${label}: filtro SVG leve dos hotspots ausente ou divergente`);
    }
    const workMapEffects = startTags(html, "div").map(attributesOf).filter((attributes) => "data-work-map-effects" in attributes);
    const workMapParticles = startTags(html, "span").map(attributesOf).filter((attributes) => attributes.class?.split(/\s+/).includes("work-map-particle"));
    if (workMapEffects.length !== 1 || workMapEffects[0]["aria-hidden"] !== "true" || workMapParticles.length !== 7) {
      fail(`${label}: camada decorativa reativa do mapa deve ser única, oculta da árvore acessível e conter sete partículas`);
    }
    const workMapNodes = startTags(html, "li").map(attributesOf).filter((attributes) => "data-work-map-node" in attributes);
    const rootNodes = workMapNodes.filter((attributes) => attributes["data-work-map-depth"] === "0");
    const leafNodes = workMapNodes.filter((attributes) => attributes.class?.split(/\s+/).includes("work-map-leaf"));
    if (workMapNodes.length !== 12 || rootNodes.length !== 5 || leafNodes.length !== 7) {
      fail(`${label}: mapa deve conter 5 grupos, 7 destinos e 12 nós totais`);
    }
    if (workMapNodes.some((attributes) => !expectedHotspotIds.includes(attributes["data-work-map-target"]))) {
      fail(`${label}: todos os nós do mapa devem apontar para um hotspot visual canônico`);
    }
    if (rootNodes.some((attributes, index) => attributes["data-index"] !== String(index) || !attributes.style?.includes("--work-map-accent-rgb:"))) {
      fail(`${label}: grupos do mapa devem expor ordem e accent RGB`);
    }
    const workMapTriggers = startTags(html, "button").map(attributesOf).filter((attributes) => "data-work-map-trigger" in attributes);
    const workMapPanels = startTags(html, "div").map(attributesOf).filter((attributes) => "data-work-map-panel" in attributes);
    const workMapLinks = anchorEntries(html).map(({ attributes }) => attributes).filter((attributes) => "data-work-map-link" in attributes);
    const expectedPanelMetadata = flattenWorkMap(workMapStructure)
      .filter((node) => node.children.length > 0)
      .map((node) => ({
        count: String(node.children.length),
        density: node.children.length >= 10 ? "dense" : node.children.length >= 6 ? "many" : "standard",
      }));
    if (workMapTriggers.length !== 5 || workMapTriggers.some((attributes) => attributes["aria-expanded"] !== "false")) {
      fail(`${label}: cinco gatilhos do mapa devem iniciar recolhidos`);
    }
    if (workMapPanels.length !== 5 || workMapPanels.some((attributes) => !("hidden" in attributes) || "inert" in attributes)) {
      fail(`${label}: cinco painéis devem iniciar ocultos, sem inert estático; o JavaScript aplica isolamento após inicializar`);
    }
    if (workMapPanels.some((attributes, index) => (
      attributes["data-work-map-child-count"] !== expectedPanelMetadata[index]?.count
      || attributes["data-work-map-density"] !== expectedPanelMetadata[index]?.density
    ))) {
      fail(`${label}: metadados de contagem/densidade dos painéis divergem da árvore canônica`);
    }
    if (workMapLinks.length !== 7 || new Set(workMapLinks.map((attributes) => attributes.href)).size !== 7) {
      fail(`${label}: mapa deve expor sete destinos navegáveis únicos`);
    }
    workMapTriggers.forEach((trigger, index) => {
      const panel = workMapPanels[index];
      if (
        !trigger.id
        || !panel?.id
        || trigger["aria-controls"] !== panel.id
        || panel["aria-labelledby"] !== trigger.id
        || panel.role !== "region"
      ) {
        fail(`${label}: grupo ${index + 1} não possui relação button/region completa`);
      }
    });
    const mainText = stripTags(html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] ?? "");
    if (/\b(?:problema|problemas|contexto|contextos|problem|problems|context|contexts)\b/i.test(mainText)) {
      fail(`${label}: texto principal da página inicial ainda repete problema/contexto`);
    }
    const methodMatch = html.match(/<nav\b[^>]*class="[^"]*\bmethod-flow\b[^"]*"[^>]*>([\s\S]*?)<\/nav>/i);
    if (!methodMatch || startTags(methodMatch[1], "ol").length !== 1) {
      fail(`${label}: corrente de decisão deve usar nav e ol`);
    } else {
      const methodSteps = startTags(methodMatch[1], "li").map(attributesOf).filter((attributes) => "data-decision-step" in attributes);
      const methodLinks = anchorEntries(methodMatch[1]).map(({ attributes }) => attributes);
      if (methodSteps.length !== 4 || methodLinks.length !== 4) fail(`${label}: corrente de decisão deve conter quatro itens completos`);
      if (methodLinks.filter((attributes) => attributes["aria-current"] === "step").length !== 1) {
        fail(`${label}: corrente de decisão deve iniciar com um único aria-current=step`);
      }
      methodSteps.forEach((attributes, index) => {
        if (
          attributes["data-index"] !== String(index)
          || !/^\d{1,3} \d{1,3} \d{1,3}$/.test(attributes["data-accent-rgb"] ?? "")
          || !methodLinks.some((link) => link.href === `#${attributes.id}`)
        ) {
          fail(`${label}: item ${index + 1} da corrente não é ancorável ou não possui estado ambiental`);
        }
      });
    }
    const semanticOrder = [
      html.indexOf("about-hero"),
      html.indexOf("landscape-map"),
      html.indexOf("method-section"),
      html.indexOf("site-footer"),
    ];
    if (semanticOrder.some((position) => position < 0) || semanticOrder.some((position, index) => index > 0 && position <= semanticOrder[index - 1])) {
      fail(`${label}: ordem semântica de Sobre divergiu`);
    }
    for (const depth of ["surface", "mid", "deep", "footer"]) {
      if (!html.includes(`data-depth="${depth}"`)) fail(`${label}: estado de profundidade ${depth} ausente`);
    }
    for (const item of mainCatalogFor(page.locale)) {
      if (!html.includes(`href="${item.route}"`)) fail(`${label}: item ${item.slug} ausente do mapa de trabalho`);
    }
  }

  if (page.type === "projects") {
    const cardMatches = [...html.matchAll(/<article\b([^>]*)>([\s\S]*?)<\/article>/gi)]
      .map((match) => ({
        attributes: attributesOf(`<article ${match[1]}>`),
        body: match[2],
      }))
      .filter(({ attributes }) => "data-project-card" in attributes);
    const catalog = mainCatalogFor(page.locale);
    const cardSlugs = cardMatches.map(({ attributes }) => attributes["data-project"]);
    if (cardSlugs.join(",") !== expectedMainOrder.join(",")) fail(`${label}: cards não seguem a ordem principal`);
    if (cardMatches.length !== catalog.length) fail(`${label}: quantidade de cards diverge do catálogo`);
    const deckButtons = startTags(html, "button").map(attributesOf);
    const deckRegions = startTags(html, "div").map(attributesOf);
    const deckRegion = deckRegions.find((attributes) => "data-project-deck" in attributes);
    const previousEdge = deckButtons.find((attributes) => "data-deck-edge-previous" in attributes);
    const nextEdge = deckButtons.find((attributes) => "data-deck-edge-next" in attributes);
    const energyCanvases = startTags(html, "canvas").map(attributesOf).filter((attributes) => "data-deck-energy-canvas" in attributes);
    const swipeHint = deckRegions.find((attributes) => "data-deck-swipe-hint" in attributes);
    const expectedPrevious = catalog[catalog.length - 1];
    const expectedNext = catalog[1];
    if (!previousEdge || !nextEdge || html.includes("data-deck-preview")) {
      fail(`${label}: navegação lateral precisa ter controles simétricos sem o preview legado`);
    }
    if (
      previousEdge?.["aria-controls"] !== `project-card-${expectedPrevious.slug}`
      || previousEdge?.["data-edge-label"] !== locales[page.locale].common.previousProject
      || previousEdge?.["aria-label"] !== `${locales[page.locale].common.previousProject}: ${expectedPrevious.name}`
      || nextEdge?.["aria-controls"] !== `project-card-${expectedNext.slug}`
      || nextEdge?.["data-edge-label"] !== locales[page.locale].common.nextProject
      || nextEdge?.["aria-label"] !== `${locales[page.locale].common.nextProject}: ${expectedNext.name}`
    ) {
      fail(`${label}: destinos ou rótulos iniciais da navegação lateral divergiram`);
    }
    if (html.includes("deck-edge-copy") || html.includes("data-deck-edge-previous-name") || html.includes("data-deck-edge-next-name")) {
      fail(`${label}: navegação lateral voltou a expor cópia visual sujeita a truncamento`);
    }
    if (
      energyCanvases.length !== 2
      || energyCanvases.some((attributes) => attributes["aria-hidden"] !== "true")
      || !swipeHint
      || swipeHint["aria-hidden"] !== "true"
      || deckRegion?.["data-swipe-intro"] !== "idle"
      || deckRegion?.["aria-describedby"] !== "project-deck-swipe-help"
      || !html.includes(`id="project-deck-swipe-help">${locales[page.locale].projectsPage.swipeHint}</p>`)
    ) {
      fail(`${label}: campo de energia ou descoberta acessível de swipe divergiram`);
    }
    if (cardMatches.some(({ attributes }, index) => (
      index === 0 ? "inert" in attributes : !("inert" in attributes)
    ))) {
      fail(`${label}: cards ocultos devem iniciar inertes e o card ativo deve permanecer interativo`);
    }
    for (const item of catalog) {
      const card = cardMatches.find(({ attributes }) => attributes["data-project"] === item.slug);
      if (!card) continue;
      if (card.attributes["data-showcase-subtitle"] !== item.showcaseSubtitle) {
        fail(`${label}: showcaseSubtitle divergente no card ${item.slug}`);
      }
      if (!isNonEmptyString(card.attributes["data-kind"])) fail(`${label}: kind visual ausente no card ${item.slug}`);
      if (
        !card.attributes.style?.includes(`--project-accent:${item.accent}`)
        || !card.attributes.style?.includes(`--project-accent-rgb:${item.accentRgb}`)
      ) {
        fail(`${label}: accent divergente no card ${item.slug}`);
      }
      if (!stripTags(card.body).includes(item.status)) fail(`${label}: status divergente no card ${item.slug}`);
      if (item.slug === "clubal" && !card.body.includes("clubal-wordmark")) fail(`${label}: card do ClubAL sem wordmark semântico`);
      const image = startTags(card.body, "img").map(attributesOf)[0];
      const expectedImage = item.cardImage || item.image;
      const actualImage = image?.["data-deferred-src"] || image?.src;
      if (actualImage !== expectedImage) fail(`${label}: imagem divergente no card ${item.slug}`);
      if (Number(image?.width) !== (item.cardImageWidth || item.imageWidth) || Number(image?.height) !== (item.cardImageHeight || item.imageHeight)) {
        fail(`${label}: dimensões divergentes no card ${item.slug}`);
      }
    }
    if (!html.includes(`data-deck-subtitle>${catalog[0].showcaseSubtitle}<`)) fail(`${label}: subtítulo inicial não corresponde ao primeiro item`);
    if (!/src="\/assets\/js\/home\.js\?v=[a-f0-9]{12}"/.test(html)) fail(`${label}: home.js ausente`);
    if (html.includes("/assets/img/gui/identidade-aeroporto.webp") || html.includes("/assets/img/gui-rocha-home.webp")) {
      fail(`${label}: retrato não deve ser repetido em Projetos`);
    }
    for (const marker of ["data-site-collection", "data-site-panel", "data-site-select", "data-sites-dialog", "sites-window"]) {
      if (html.includes(marker)) fail(`${label}: hub de Sites duplicado na landing (${marker})`);
    }
    if (html.includes("/assets/js/sites.js")) fail(`${label}: landing não deve carregar o hub completo de Sites`);
    const noscript = elementContents(html, "noscript").join("\n");
    for (const item of catalog) {
      if (!noscript.includes(`href="${item.route}"`)) fail(`${label}: fallback sem JS não inclui ${item.slug}`);
    }
  }

  if (page.type === "contact") {
    const personalLink = anchorEntries(html).find(({ attributes }) => "data-email-link" in attributes)?.attributes;
    const clubalLink = anchorEntries(html).find(({ attributes }) => "data-clubal-email-link" in attributes)?.attributes;
    if (personalLink?.href !== `mailto:${siteConfig.personalEmail}` || !html.includes(siteConfig.personalEmail)) {
      fail(`${label}: e-mail pessoal não corresponde a content/pages.mjs`);
    }
    if (!clubalLink?.href?.startsWith(`mailto:${siteConfig.clubalEmail}?subject=`) || !html.includes(`data-clubal-email-address>${siteConfig.clubalEmail}<`)) {
      fail(`${label}: e-mail dedicado do ClubAL não está visível no bloco secundário`);
    }
    if (!html.includes(`data-clubal-email="${siteConfig.clubalEmail}"`) || !html.includes("data-clubal-contact")) {
      fail(`${label}: contexto de suporte do ClubAL ausente`);
    }
    if (!/src="\/assets\/js\/contact\.js\?v=[a-f0-9]{12}"/.test(html)) fail(`${label}: contact.js ausente`);
  }

  if (page.type === "sites") {
    const visibleSites = sitesByLocale[page.locale].sites.filter((site) => site.visible === true);
    if (!html.includes("data-site-collection")) fail(`${label}: hub de Sites ausente`);
    if (!/src="\/assets\/js\/sites\.js\?v=[a-f0-9]{12}"/.test(html)) fail(`${label}: sites.js ausente`);
    const selectors = anchorEntries(html).filter(({ attributes }) => "data-site-select" in attributes);
    const panelMatches = [...html.matchAll(/<article\b([^>]*)>([\s\S]*?)<\/article>/gi)]
      .map((match) => ({
        attributes: attributesOf(`<article ${match[1]}>`),
        body: match[2],
      }))
      .filter(({ attributes }) => "data-site-panel" in attributes);
    const panels = panelMatches.map(({ attributes }) => attributes);
    if (selectors.length !== visibleSites.length || panels.length !== visibleSites.length) {
      fail(`${label}: quantidade de seletores/painéis diverge dos dados`);
    }
    if (panels.some((attributes) => "hidden" in attributes)) fail(`${label}: conteúdo direto não deve depender de JavaScript`);
    for (const site of visibleSites) {
      if (!selectors.some(({ attributes }) => attributes["data-site-select"] === site.slug)) fail(`${label}: seletor ausente para ${site.slug}`);
      if (!panels.some((attributes) => attributes["data-site-panel"] === site.slug)) fail(`${label}: painel ausente para ${site.slug}`);
      const panel = panelMatches.find(({ attributes }) => attributes["data-site-panel"] === site.slug);
      if (panel) {
        const image = startTags(panel.body, "img").map(attributesOf)[0];
        if (
          image?.src !== site.cover.src
          || Number(image?.width) !== site.cover.width
          || Number(image?.height) !== site.cover.height
        ) {
          fail(`${label}: capa ou dimensões divergentes para ${site.slug}`);
        }
        if (
          !panel.attributes.style?.includes(`--site-accent:${site.accent}`)
          || !panel.attributes.style?.includes(`--site-accent-rgb:${site.accentRgb}`)
        ) {
          fail(`${label}: accent divergente no painel ${site.slug}`);
        }
        if (!stripTags(panel.body).includes(site.status)) fail(`${label}: status divergente no painel ${site.slug}`);
      }
      const official = anchorEntries(html).find(({ attributes }) => attributes.href === site.officialUrl)?.attributes;
      if (!official) {
        fail(`${label}: link oficial ausente para ${site.slug}`);
      }
    }
    validateNextProject(html, page.locale, { ...page.collection, slug: "sites" }, label);
  }

  if (page.type === "project") {
    const project = page.project;
    const expectedBreadcrumb = project.catalogGroup === "sites"
      ? sitesByLocale[page.locale].collection.route
      : `${config.routes.projects}?project=${encodeURIComponent(project.slug)}`;
    const breadcrumb = findClassAnchor(html, "project-breadcrumb");
    if (!breadcrumb || breadcrumb.href !== expectedBreadcrumb) fail(`${label}: breadcrumb incorreto`);
    if (!/src="\/assets\/js\/project\.js\?v=[a-f0-9]{12}"/.test(html)) fail(`${label}: project.js ausente`);
    const projectVisual = project.gallery?.[0] ?? {
      src: project.image,
      width: project.imageWidth,
      height: project.imageHeight,
    };
    validateDetailVisual(html, project, projectVisual, project.status, label);
    validateNoJsGallery(html, project.gallery ?? [projectVisual], label);
    const caseSummaryMatch = html.match(/<dl\b[^>]*class="[^"]*\bproject-case-summary\b[^"]*"[^>]*>([\s\S]*?)<\/dl>/i);
    const caseSummaryText = stripTags(caseSummaryMatch?.[1] ?? "");
    if (!caseSummaryMatch || startTags(caseSummaryMatch[1], "dt").length !== project.caseSummary.length) {
      fail(`${label}: resumo do case diverge da seleção editorial`);
    }
    if (project.caseSummary.some((source) => !caseSummaryText.includes(caseSummaryValueFor(project, source)))) {
      fail(`${label}: conteúdo selecionado ausente do resumo do case`);
    }
    if (project.slug === "clubal") {
      if (!html.includes("clubal-wordmark")) fail(`${label}: página do ClubAL sem wordmark semântico`);
      if (!html.includes(`href="mailto:${siteConfig.clubalEmail}"`)) fail(`${label}: ação de suporte do ClubAL ausente`);
    } else if (html.includes(siteConfig.clubalEmail)) {
      fail(`${label}: e-mail do ClubAL apareceu fora do case do ClubAL`);
    }
    validateNextProject(html, page.locale, project, label);
    if (project.kind === "siteCase") validateSiteCaseNavigation(html, page.locale, project.slug, label);
  }

  if (page.type === "site") {
    const breadcrumb = findClassAnchor(html, "project-breadcrumb");
    if (!breadcrumb || breadcrumb.href !== sitesByLocale[page.locale].collection.route) fail(`${label}: breadcrumb do case deve voltar a Sites`);
    if (!/src="\/assets\/js\/project\.js\?v=[a-f0-9]{12}"/.test(html)) fail(`${label}: project.js ausente`);
    const siteVisual = page.site.gallery?.[0] ?? page.site.cover;
    validateDetailVisual(html, page.site, siteVisual, page.site.case.status, label);
    validateNoJsGallery(html, page.site.gallery ?? [siteVisual], label);
    const caseSummaryMatch = html.match(/<dl\b[^>]*class="[^"]*\bproject-case-summary\b[^"]*"[^>]*>([\s\S]*?)<\/dl>/i);
    const caseSummaryText = stripTags(caseSummaryMatch?.[1] ?? "");
    if (!caseSummaryMatch || startTags(caseSummaryMatch[1], "dt").length !== page.site.case.caseSummary.length) {
      fail(`${label}: resumo do case diverge da seleção editorial`);
    }
    if (page.site.case.caseSummary.some((source) => !caseSummaryText.includes(caseSummaryValueFor(page.site.case, source)))) {
      fail(`${label}: conteúdo selecionado ausente do resumo do case`);
    }
    if (page.site.slug === "clubal" && !html.includes(`href="mailto:${siteConfig.clubalEmail}"`)) {
      fail(`${label}: ação de suporte do ClubAL ausente`);
    }
    validateSiteCaseNavigation(html, page.locale, page.slug, label);
  }

  if (page.type === "notFound") {
    if (!html.includes(`href="${config.routes.projects}"`) || !html.includes(`href="${config.routes.contact}"`)) {
      fail(`${label}: 404 deve oferecer Projetos e Contato localizados`);
    }
  }
}

for (const path of htmlFiles) {
  const html = await getHtml(path);
  const label = publicPath(path);
  const ids = startTags(html, "[A-Za-z][A-Za-z0-9:-]*")
    .map(attributesOf)
    .map((attributes) => attributes.id)
    .filter(Boolean);
  const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
  if (duplicateIds.length) fail(`${label}: IDs duplicados (${duplicateIds.join(", ")})`);

  for (const tag of startTags(html, "img")) {
    const attributes = attributesOf(tag);
    if (!("alt" in attributes)) fail(`${label}: imagem sem alt`);
    if (attributes.draggable !== "false" || !("data-protected-media" in attributes)) {
      fail(`${label}: imagem sem proteção uniforme contra menu contextual/arraste`);
    }
    if (!isPositiveInteger(Number(attributes.width)) || !isPositiveInteger(Number(attributes.height))) {
      fail(`${label}: imagem sem dimensões válidas`);
    }
    for (const source of [attributes.src, attributes["data-deferred-src"]].filter(Boolean)) {
      if (/^(?:https?:)?\/\//i.test(source)) fail(`${label}: imagem remota não permitida (${source})`);
    }
  }

  for (const tag of startTags(html, "image")) {
    if (!("data-protected-media" in attributesOf(tag))) {
      fail(`${label}: imagem SVG sem proteção uniforme contra menu contextual`);
    }
  }

  for (const { attributes } of anchorEntries(html)) {
    const href = attributes.href || "";
    if (/^javascript:/i.test(href)) fail(`${label}: link javascript: não permitido`);
    if (/^http:/i.test(href)) fail(`${label}: link externo deve usar HTTPS (${href})`);
    if (/^[a-z][a-z0-9+.-]*:/i.test(href) && !/^(?:https:|mailto:|tel:)/i.test(href)) {
      fail(`${label}: esquema de link não permitido (${href})`);
    }
    if (href.startsWith("//")) fail(`${label}: link externo protocol-relative não permitido (${href})`);
    if (/^(?:https?:)?\/\//i.test(href)) {
      const relations = new Set((attributes.rel || "").split(/\s+/));
      if (attributes.target !== "_blank") fail(`${label}: link externo deve abrir em nova aba (${href})`);
      if (!relations.has("noopener")) fail(`${label}: link externo sem noopener (${href})`);
      if (!relations.has("noreferrer")) fail(`${label}: link externo sem noreferrer (${href})`);
    }
    const target = localTarget(href, path);
    if (target?.invalid) {
      fail(`${label}: referência local inválida ${href} (${target.invalid})`);
      continue;
    }
    if (!target?.path) continue;
    if (!await exists(target.path)) {
      fail(`${label}: link local inexistente ${href}`);
      continue;
    }
    if (target.fragment && extname(target.path).toLowerCase() === ".html") {
      const targetHtml = await getHtml(target.path);
      const idPattern = new RegExp(`\\bid="${escapeRegExp(target.fragment)}"`);
      if (!idPattern.test(targetHtml)) fail(`${label}: âncora local inexistente ${href}`);
    }
  }

  for (const attribute of ["src", "poster", "data-deferred-src"]) {
    const pattern = new RegExp(`${attribute}="([^"]+)"`, "g");
    for (const [, value] of html.matchAll(pattern)) {
      const target = localTarget(value, path);
      if (target?.invalid) fail(`${label}: referência inválida ${value} (${target.invalid})`);
      else if (target?.path && !await exists(target.path)) fail(`${label}: referência local inexistente ${value}`);
    }
  }
  for (const [, value] of html.matchAll(/\bsrcset="([^"]+)"/g)) {
    for (const candidate of value.split(",").map((item) => item.trim().split(/\s+/)[0]).filter(Boolean)) {
      const target = localTarget(candidate, path);
      if (target?.invalid) fail(`${label}: srcset inválido ${candidate}`);
      else if (target?.path && !await exists(target.path)) fail(`${label}: srcset inexistente ${candidate}`);
    }
  }

  const idSet = new Set(ids);
  for (const tag of html.match(/<[A-Za-z][^>]*\baria-controls="[^"]+"[^>]*>/g) || []) {
    const attributes = attributesOf(tag);
    for (const controlledId of (attributes["aria-controls"] || "").split(/\s+/).filter(Boolean)) {
      if (!idSet.has(controlledId)) fail(`${label}: aria-controls aponta para ID ausente (${controlledId})`);
    }
  }

  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const attributes = attributesOf(`<script ${match[1]}>`);
    if (!attributes.src && attributes.type !== "application/ld+json") {
      fail(`${label}: script inline executável não permitido`);
    }
    if (attributes.src && /^(?:https?:)?\/\//i.test(attributes.src)) fail(`${label}: script remoto não permitido`);
  }
  for (const link of linkEntries(headOf(html), "stylesheet")) {
    if (/^(?:https?:)?\/\//i.test(link.href || "")) fail(`${label}: stylesheet remoto não permitido`);
  }
}

for (const legacy of legacyOutputs) {
  if (await exists(join(root, ...legacy.split("/")))) fail(`output legado deve estar ausente: ${legacy}`);
}
const manifests = files.filter((path) => extname(path).toLowerCase() === ".webmanifest");
if (manifests.length) fail(`manifests PWA devem estar ausentes: ${manifests.map(publicPath).join(", ")}`);

const redirectsText = await readText(join(root, "_redirects"), "_redirects");
const redirectRules = redirectsText
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith("#"))
  .map((line) => {
    const [source, target, status = "302"] = line.split(/\s+/);
    return { source, target, status };
  });
const redirectSources = new Set();
for (const rule of redirectRules) {
  if (!rule.source || !rule.target) {
    fail("_redirects: regra incompleta");
    continue;
  }
  if (redirectSources.has(rule.source)) fail(`_redirects: origem duplicada ${rule.source}`);
  redirectSources.add(rule.source);
  if (!["301", "308"].includes(rule.status)) fail(`_redirects: ${rule.source} deve ser permanente`);
  if (rule.source === rule.target) fail(`_redirects: loop direto em ${rule.source}`);
  if (rule.source.includes("?") || rule.target.includes("?")) fail(`_redirects: lógica por query string não suportada em ${rule.source}`);
  const target = localTarget(rule.target);
  if (!target?.path || !await exists(target.path)) fail(`_redirects: destino inexistente ${rule.target}`);
}
for (const [source, target] of requiredRedirects) {
  const rule = redirectRules.find((candidate) => candidate.source === source);
  if (!rule) fail(`_redirects: alias obrigatório ausente ${source}`);
  else if (rule.target !== target) fail(`_redirects: ${source} deve apontar diretamente para ${target}`);
}
for (const rule of redirectRules) {
  if (redirectSources.has(rule.target)) fail(`_redirects: cadeia detectada ${rule.source} → ${rule.target}`);
}

const sitemap = await readText(join(root, "sitemap.xml"), "sitemap.xml");
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => decodeHtml(match[1]));
const expectedSitemapUrls = expectedPages
  .filter((page) => page.canonical)
  .map((page) => `${siteConfig.origin}${page.route}`);
if (new Set(sitemapUrls).size !== sitemapUrls.length) fail("sitemap.xml: URL duplicada");
for (const url of expectedSitemapUrls) {
  if (!sitemapUrls.includes(url)) fail(`sitemap.xml: URL canônica ausente ${url}`);
}
for (const url of sitemapUrls) {
  if (!expectedSitemapUrls.includes(url)) fail(`sitemap.xml: URL não canônica ou inesperada ${url}`);
}
const robots = await readText(join(root, "robots.txt"), "robots.txt");
if (!robots.includes(`Sitemap: ${siteConfig.origin}/sitemap.xml`)) fail("robots.txt: sitemap canônico ausente");

const sourceTexts = {};
for (const source of [
  "assets/js/theme-boot.js",
  "assets/js/site.js",
  "assets/js/home.js",
  "assets/js/about.js",
  "assets/js/project.js",
  "assets/js/contact.js",
  "assets/js/sites.js",
  "assets/js/legacy-project-link.js",
  "assets/css/styles.css",
  "content/work-map.mjs",
  "scripts/generate-site.mjs",
  "scripts/generate-work-map-images.mjs",
  "scripts/build.mjs",
  "scripts/serve.mjs",
  "service-worker.js",
  "_headers",
]) {
  sourceTexts[source] = await readText(join(root, ...source.split("/")), source);
}

const requireMarkers = (source, markers, label = source) => {
  const content = sourceTexts[source] ?? "";
  for (const marker of markers) {
    if (!content.includes(marker)) fail(`${label}: marcador obrigatório ausente ${marker}`);
  }
};

const stripJavaScriptComments = (source) => {
  let output = "";
  let state = "code";
  let quote = "";
  let escaped = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];
    if (state === "line-comment") {
      if (character === "\n") {
        output += "\n";
        state = "code";
      } else {
        output += " ";
      }
      continue;
    }
    if (state === "block-comment") {
      if (character === "*" && next === "/") {
        output += "  ";
        index += 1;
        state = "code";
      } else {
        output += character === "\n" ? "\n" : " ";
      }
      continue;
    }
    if (state === "string") {
      output += character;
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) state = "code";
      continue;
    }
    if (character === "/" && next === "/") {
      output += "  ";
      index += 1;
      state = "line-comment";
      continue;
    }
    if (character === "/" && next === "*") {
      output += "  ";
      index += 1;
      state = "block-comment";
      continue;
    }
    if (character === "\"" || character === "'" || character === "`") {
      quote = character;
      state = "string";
    }
    output += character;
  }
  return output;
};

const siteExecutable = stripJavaScriptComments(sourceTexts["assets/js/site.js"]);
const serviceWorkerExecutable = stripJavaScriptComments(sourceTexts["service-worker.js"]);

requireMarkers("assets/js/theme-boot.js", [
  'preferenceKey = "gui_preferences_v2"',
  'matchMedia("(prefers-color-scheme: dark)")',
  "dataset.resolvedTheme",
  'meta[name="theme-color"]',
]);
requireMarkers("assets/js/site.js", [
  'CONSENT_COOKIE = "gui_consent"',
  "readStorage",
  "writeStorage",
  "showModal",
  "getRegistrations",
  'startsWith("gui-rocha-")',
  'sessionStorage.getItem("gui-sw-retired")',
  "[data-scroll-progress]",
  "ResizeObserver",
  "document.startViewTransition",
  "usesFirefoxThemeFallback",
  'duration: 420',
  'portal:ambientchange',
  "updateAmbientDepth",
  "ambientOceanBase",
  "ambientPointerEnabled",
  "scheduleAmbientInput",
  "PROTECTED_MEDIA_SELECTOR",
  "eventTargetsProtectedMedia",
  'addEventListener("contextmenu"',
  'addEventListener("dragstart"',
]);
for (const [label, pattern] of [
  ["consulta de registros", /navigator\s*\.\s*serviceWorker\s*\.\s*getRegistrations\s*\(/],
  ["desregistro", /registration\s*\.\s*unregister\s*\(/],
  ["inventário de caches", /caches\s*\.\s*keys\s*\(/],
  ["filtro de caches próprios", /name\s*\.\s*startsWith\s*\(\s*["']gui-rocha-["']\s*\)/],
]) {
  if (!pattern.test(siteExecutable)) fail(`site.js: rotina executável de aposentadoria sem ${label}`);
}
if (
  /\bregister\s*(?:\?\.)?\s*\(/.test(siteExecutable)
  || /\[\s*["']register["']\s*\]\s*(?:\?\.)?\s*\(/.test(siteExecutable)
) {
  fail("site.js: não deve registrar service worker");
}
requireMarkers("assets/js/home.js", [
  "applyActiveProject",
  "dataset.showcaseSubtitle",
  "subtitle.textContent",
  'parameters.get("project")',
  'parameters.get("projeto")',
  'parameters.get("proyecto")',
  "history.replaceState",
  "pointercancel",
  "ArrowLeft",
  "ArrowRight",
  "card.inert",
  "updateLanguageLinks",
  'portal:ambientchange',
  "previousEdgeButton",
  "nextEdgeButton",
  "dataset.edgeLabel",
]);
requireMarkers("assets/js/about.js", [
  "data-work-map",
  "data-decision-step",
  "data-work-map-trigger",
  "data-work-map-panel",
  "ResizeObserver",
  "document.fonts?.ready",
  "work-map:close",
  "data-work-map-presentation",
  'portal:ambientchange',
  '"Escape"',
  '"ArrowRight"',
  '"ArrowLeft"',
  '"Home"',
  '"End"',
  '"aria-expanded"',
  '"aria-current"',
  "workMapCloseDelayMs = 300",
  "workMapPanelTransitionMs = 260",
  "workMapEffectDurationMs = 1050",
  "data-work-map-effects",
  "data-work-map-hotspot",
  "data-work-map-focus-image",
  "currentSrc",
  "dataset.workMapEffectActive",
  "animateInkOrbit",
  "strokeDashoffset",
  "compactVisual",
  "dataset.workMapReactive",
  "dataset.workMapBurst",
  "dataset.workMapTargetActive",
  "offsetParent",
  "clientLeft",
  "panel.inert = false",
  "panel.inert = true",
  'matchMedia("(hover: hover) and (pointer: fine)")',
  'matchMedia("(any-hover: hover) and (any-pointer: fine)")',
  "syntheticHoverSuppressionMs = 1200",
]);
requireMarkers("assets/js/project.js", ["galleryImage.width", "galleryImage.height", "galleryRoot.tabIndex = 0", "ArrowLeft", "ArrowRight", "preload"]);
requireMarkers("assets/js/contact.js", [
  'parameters.get("assunto")',
  'parameters.get("subject")',
  'parameters.get("asunto")',
  'parameters.get("project")',
  'parameters.get("projeto")',
  'parameters.get("proyecto")',
  '"[data-language-link]"',
  '"pt-BR": "assunto"',
  'context.emailScope === "clubal"',
  "root.dataset.clubalEmail",
  '"[data-clubal-email-link]"',
  "contextParameters",
]);
requireMarkers("assets/js/sites.js", [
  "data-site-collection",
  "data-site-select",
  "data-site-panel",
  "aria-current",
  "history.replaceState",
  "URLSearchParams",
]);
requireMarkers("assets/js/legacy-project-link.js", [
  'parameters.get("project")',
  'parameters.get("projeto")',
  'parameters.get("proyecto")',
  "location.replace",
  "dataset.projectsRoute",
]);
requireMarkers("assets/css/styles.css", [
  ".no-js .project-tabs",
  ".no-js .project-tab-panel[hidden]",
  ".no-js .gallery-controls",
  ".no-js-gallery-links",
  ".no-js .work-map-panel",
  ".work-map-root",
  ".work-map-visual",
  ".work-map-hotspots",
  ".work-map-focus-image",
  ".work-map-hotspot-aura-shape",
  ".work-map-hotspot-orbit-primary",
  "--work-map-surface:",
  "--work-map-ease:",
  ".work-map-chevron",
  ".work-map-effects",
  ".work-map-particle",
  "work-map-button-sheen",
  "work-map-particle-burst",
  "work-map-screen-awaken",
  ".no-js .work-map-root",
  ":root[data-contrast=\"high\"] .work-map-trigger",
  "@container work-map",
  ".project-case-summary",
  ".clubal-wordmark",
  ".method-flow",
  "@property --ambient-r",
  "::view-transition-new(root)",
  "@media (forced-colors: active)",
  "prefers-reduced-motion",
  "scroll-margin-top",
  "[data-protected-media]",
  "-webkit-touch-callout: none",
  "-webkit-user-drag: none",
]);
requireMarkers("content/work-map.mjs", [
  "workMapStructure",
  "workMapVisualTargets",
  "validateWorkMapStructure",
  "validateWorkMapVisualTargets",
  "resolveWorkMapNodeTitle",
  "flattenWorkMap",
  "visualTarget",
  "workMapEffectTypes",
  'effect: "screen"',
  'effect: "ink"',
  'effect: "paper"',
  "orbitShapes",
  'id: "institutional"',
  'id: "original"',
]);
requireMarkers("scripts/generate-work-map-images.mjs", [
  "imageSmoothingQuality = \"high\"",
  "toDataURL(\"image/webp\"",
  "quality = 0.92",
  "mapa-do-trabalho-${width}.webp",
]);
requireMarkers("scripts/generate-site.mjs", [
  "data-work-map-hotspots",
  'preserveAspectRatio="xMidYMid meet"',
  "clipPathUnits",
  "data-work-map-focus-image",
  "feGaussianBlur",
  "data-work-map-target",
]);

const cssRuleBody = (source, selector) => {
  const marker = `${selector} {`;
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) return "";
  const openingBrace = source.indexOf("{", markerIndex);
  let depth = 0;
  for (let index = openingBrace; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    else if (source[index] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(openingBrace + 1, index);
    }
  }
  return "";
};

const cssHexTokens = (body) => Object.fromEntries(
  [...body.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{6})\s*;/gi)].map((match) => [match[1], match[2].toLowerCase()]),
);
const hexRgb = (value) => {
  const match = /^#([0-9a-f]{6})$/i.exec(value ?? "");
  return match ? [0, 2, 4].map((offset) => Number.parseInt(match[1].slice(offset, offset + 2), 16)) : null;
};
const relativeLuminance = (rgb) => {
  const channels = rgb.map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
};
const contrastRatio = (left, right) => {
  const luminances = [relativeLuminance(left), relativeLuminance(right)].sort((a, b) => b - a);
  return (luminances[0] + 0.05) / (luminances[1] + 0.05);
};
const blendRgb = (foreground, background, alpha) => foreground.map((channel, index) => (
  channel * alpha + background[index] * (1 - alpha)
));

const styleSource = sourceTexts["assets/css/styles.css"];
const themeTokens = {
  light: cssHexTokens(cssRuleBody(styleSource, ":root")),
  dark: cssHexTokens(cssRuleBody(styleSource, ':root[data-theme="dark"]')),
  systemDark: cssHexTokens(cssRuleBody(styleSource, ':root[data-theme="system"]')),
};
const expectedThemeTokens = {
  light: {
    canvas: "#f4f9fc",
    "canvas-deep": "#e7f1f7",
    surface: "#fbfdff",
    raised: "#ffffff",
    text: "#061927",
    "text-soft": "#314d60",
    "text-muted": "#5a7383",
    "semantic-line": "#c4d6e0",
    "semantic-line-strong": "#7592a2",
    accent: "#006f9c",
    "accent-fill": "#82d7ff",
    "accent-ink": "#041823",
    focus: "#005ea8",
  },
  dark: {
    canvas: "#071725",
    "canvas-deep": "#04101b",
    surface: "#0d2b40",
    raised: "#12364e",
    text: "#f2f7fa",
    "text-soft": "#c4d3dc",
    "text-muted": "#90a9b8",
    "semantic-line": "#264c65",
    "semantic-line-strong": "#3f708e",
    accent: "#82d7ff",
    "accent-fill": "#a6e8ff",
    "accent-ink": "#051521",
    focus: "#ffd277",
  },
};

for (const [theme, expectedTokens] of Object.entries(expectedThemeTokens)) {
  const tokens = themeTokens[theme];
  for (const [name, expected] of Object.entries(expectedTokens)) {
    if (tokens[name] !== expected) fail(`styles.css: token oceânico ${theme}.${name} divergiu (${tokens[name] ?? "ausente"})`);
    if (theme === "dark" && themeTokens.systemDark[name] !== expected) {
      fail(`styles.css: tema de sistema escuro diverge em ${name}`);
    }
  }

  const rgb = Object.fromEntries(Object.entries(expectedTokens).map(([name, value]) => [name, hexRgb(value)]));
  for (const surface of ["canvas", "surface", "raised"]) {
    if (contrastRatio(rgb.text, rgb[surface]) < 4.5) fail(`styles.css: contraste ${theme} text/${surface} abaixo de 4.5:1`);
    if (contrastRatio(rgb["text-soft"], rgb[surface]) < 4.5) fail(`styles.css: contraste ${theme} text-soft/${surface} abaixo de 4.5:1`);
  }
  if (contrastRatio(rgb["text-muted"], rgb.canvas) < 4.5) fail(`styles.css: contraste ${theme} text-muted/canvas abaixo de 4.5:1`);
  if (contrastRatio(rgb["semantic-line-strong"], rgb.canvas) < 3) fail(`styles.css: contraste ${theme} de linha forte abaixo de 3:1`);
  if (contrastRatio(rgb.accent, rgb.surface) < 4.5) fail(`styles.css: contraste ${theme} accent/surface abaixo de 4.5:1`);
  if (contrastRatio(rgb["accent-ink"], rgb["accent-fill"]) < 4.5) fail(`styles.css: contraste ${theme} do CTA abaixo de 4.5:1`);
  if (contrastRatio(rgb.focus, rgb.canvas) < 3) fail(`styles.css: contraste ${theme} do foco abaixo de 3:1`);
}

const accentValues = new Set();
for (const locale of localeOrder) {
  for (const project of projectsByLocale[locale]) accentValues.add(project.accentRgb);
  accentValues.add(sitesByLocale[locale].collection.accentRgb);
  for (const site of sitesByLocale[locale].sites) accentValues.add(site.accentRgb);
}
const oceanBase = [76, 164, 214];
for (const value of accentValues) {
  const source = String(value ?? "").split(/\s+/).map(Number);
  if (source.length !== 3 || source.some((channel) => !Number.isFinite(channel) || channel < 0 || channel > 255)) {
    fail(`accent RGB inválido na matriz de contraste: ${value}`);
    continue;
  }
  const controlled = source.map((channel, index) => oceanBase[index] * 0.55 + channel * 0.45);
  for (const theme of ["light", "dark"]) {
    const tokens = expectedThemeTokens[theme];
    const worstBackground = blendRgb(controlled, hexRgb(tokens.canvas), 0.18);
    for (const textToken of ["text", "text-soft"]) {
      if (contrastRatio(hexRgb(tokens[textToken]), worstBackground) < 4.5) {
        fail(`styles.css: blend máximo de ${value} reduz contraste ${theme}.${textToken} abaixo de 4.5:1`);
      }
    }
  }
}

requireMarkers("scripts/build.mjs", [
  '"404.html"',
  '"projetos"',
  '"sites"',
  '"service-worker.js"',
  "Destino de build inseguro.",
  "await rm(output",
  "assetReferences",
  "await stat(target)",
]);
if (sourceTexts["scripts/build.mjs"].includes("manifest.webmanifest")) fail("build.mjs: manifest PWA não deve entrar no artefato");
requireMarkers("scripts/serve.mjs", ['".webp": "image/webp"', 'join(root, "en", "404.html")', 'join(root, "es", "404.html")']);
requireMarkers("service-worker.js", [
  "caches.keys()",
  'startsWith("gui-rocha-")',
  "self.registration.unregister()",
  "self.clients.matchAll",
]);
for (const [label, pattern] of [
  ["install", /self\s*\.\s*addEventListener\s*\(\s*["']install["']/],
  ["activate", /self\s*\.\s*addEventListener\s*\(\s*["']activate["']/],
  ["inventário de caches", /caches\s*\.\s*keys\s*\(/],
  ["filtro de caches próprios", /name\s*\.\s*startsWith\s*\(\s*["']gui-rocha-["']\s*\)/],
  ["desregistro", /self\s*\.\s*registration\s*\.\s*unregister\s*\(/],
  ["atualização de clientes", /self\s*\.\s*clients\s*\.\s*matchAll\s*\(/],
]) {
  if (!pattern.test(serviceWorkerExecutable)) fail(`service-worker.js: aposentadoria executável sem ${label}`);
}
if (/addEventListener\s*\(\s*["']fetch["']/.test(serviceWorkerExecutable)) {
  fail("service-worker.js: arquivo de aposentadoria não deve interceptar fetch");
}
if (/\bcaches\s*(?:\?\.|\.)\s*open\s*\(/.test(serviceWorkerExecutable)) {
  fail("service-worker.js: arquivo de aposentadoria não deve criar cache");
}

const headers = sourceTexts["_headers"];
const parsedHeaderRules = [];
let activeHeaderRule = null;
for (const rawLine of headers.split(/\r?\n/)) {
  if (!rawLine.trim() || rawLine.trimStart().startsWith("#")) continue;
  if (!/^\s/.test(rawLine)) {
    activeHeaderRule = { source: rawLine.trim(), headers: new Map(), removedHeaders: new Set() };
    parsedHeaderRules.push(activeHeaderRule);
    continue;
  }
  const trimmedLine = rawLine.trim();
  if (trimmedLine.startsWith("! ")) {
    const name = trimmedLine.slice(2).trim().toLowerCase();
    if (!activeHeaderRule || !name || name.includes(":")) {
      fail(`_headers: remoção inválida ${trimmedLine}`);
      continue;
    }
    if (activeHeaderRule.headers.has(name) || activeHeaderRule.removedHeaders.has(name)) {
      fail(`_headers: ${name} duplicado em ${activeHeaderRule.source}`);
    }
    activeHeaderRule.removedHeaders.add(name);
    continue;
  }
  const separator = rawLine.indexOf(":");
  if (!activeHeaderRule || separator < 0) {
    fail(`_headers: linha inválida ${rawLine.trim()}`);
    continue;
  }
  const name = rawLine.slice(0, separator).trim().toLowerCase();
  const value = rawLine.slice(separator + 1).trim();
  if (activeHeaderRule.headers.has(name)) fail(`_headers: ${name} duplicado em ${activeHeaderRule.source}`);
  activeHeaderRule.headers.set(name, value);
}

const globalHeaderRule = parsedHeaderRules.find((rule) => rule.source === "/*");
if (!globalHeaderRule) fail("_headers: regra global /* ausente");
const globalHeaders = globalHeaderRule?.headers ?? new Map();
const expectedSecurityHeaders = new Map([
  ["cross-origin-opener-policy", "same-origin"],
  ["cross-origin-resource-policy", "same-origin"],
  ["permissions-policy", "accelerometer=(), camera=(), document-domain=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()"],
  ["referrer-policy", "strict-origin-when-cross-origin"],
  ["x-content-type-options", "nosniff"],
  ["x-frame-options", "DENY"],
  ["x-permitted-cross-domain-policies", "none"],
]);
for (const [name, expected] of expectedSecurityHeaders) {
  const actual = globalHeaders.get(name);
  if (actual !== expected) fail(`_headers: ${name} deve ser exatamente ${expected}`);
}

const csp = globalHeaders.get("content-security-policy") ?? "";
const cspDirectives = new Map();
for (const rawDirective of csp.split(";").map((value) => value.trim()).filter(Boolean)) {
  const [name, ...sources] = rawDirective.split(/\s+/);
  if (cspDirectives.has(name)) fail(`_headers: diretiva CSP duplicada ${name}`);
  cspDirectives.set(name, sources);
}
const expectedCsp = new Map([
  ["default-src", ["'self'"]],
  ["base-uri", ["'none'"]],
  ["connect-src", ["'self'"]],
  ["font-src", ["'self'"]],
  ["form-action", ["'self'"]],
  ["frame-ancestors", ["'none'"]],
  ["frame-src", ["'none'"]],
  ["img-src", ["'self'", "data:"]],
  ["manifest-src", ["'none'"]],
  ["media-src", ["'self'"]],
  ["object-src", ["'none'"]],
  ["script-src", ["'self'"]],
  ["script-src-attr", ["'none'"]],
  ["script-src-elem", ["'self'"]],
  ["style-src", ["'self'", "'unsafe-inline'"]],
  ["style-src-attr", ["'unsafe-inline'"]],
  ["style-src-elem", ["'self'"]],
  ["worker-src", ["'self'"]],
  ["upgrade-insecure-requests", []],
]);
for (const [name, expectedSources] of expectedCsp) {
  const actualSources = cspDirectives.get(name);
  if (
    !actualSources
    || actualSources.length !== expectedSources.length
    || expectedSources.some((source) => !actualSources.includes(source))
  ) {
    fail(`_headers: diretiva CSP ${name} diverge da allowlist`);
  }
}
for (const name of cspDirectives.keys()) {
  if (!expectedCsp.has(name)) fail(`_headers: diretiva CSP não aprovada ${name}`);
}

const imageHeaderRule = parsedHeaderRules.find((rule) => rule.source === "/assets/img/*");
if (!imageHeaderRule?.removedHeaders.has("access-control-allow-origin")) {
  fail("_headers: imagens devem remover o CORS amplo padrão da Cloudflare Pages");
}

const serviceWorkerHeaderRule = parsedHeaderRules.find((rule) => rule.source === "/service-worker.js");
if (serviceWorkerHeaderRule?.headers.get("cache-control") !== "no-store, max-age=0") {
  fail("_headers: service-worker.js legado deve usar exatamente no-store, max-age=0");
}
const cacheControlRules = parsedHeaderRules.filter((rule) => rule.headers.has("cache-control"));
if (cacheControlRules.length !== 1) fail("_headers: regras Cache-Control sobrepostas podem concatenar diretivas");

const packageJson = await readJson(join(root, "package.json"), {}, "package.json");
for (const script of ["generate", "validate", "build", "check"]) {
  if (!isNonEmptyString(packageJson.scripts?.[script])) fail(`package.json: script ${script} ausente`);
}
if (!packageJson.scripts?.check?.includes("node scripts/validate.mjs")) fail("package.json: check deve executar o validador");
if (!packageJson.scripts?.check?.includes("node scripts/build.mjs")) fail("package.json: check deve executar o build");
if (!packageJson.scripts?.check?.includes("node --check assets/js/theme-boot.js")) fail("package.json: check deve validar theme-boot.js");
if (
  !packageJson.scripts?.validate?.includes("node scripts/generate-site.mjs")
  || !packageJson.scripts?.validate?.includes("node scripts/validate.mjs")
) {
  fail("package.json: validate deve gerar antes de validar");
}
if (
  !packageJson.scripts?.build?.includes("node scripts/generate-site.mjs")
  || !packageJson.scripts?.build?.includes("node scripts/build.mjs")
) {
  fail("package.json: build deve gerar antes de empacotar");
}

const emailTextPaths = files.filter((path) => {
  const label = publicPath(path);
  if (label === "scripts/validate.mjs") return false;
  if (extname(path).toLowerCase() === ".html") return true;
  return (
    label === "content/pages.mjs"
    || /^assets\/(?:data|js)\//.test(label)
    || label === "scripts/generate-site.mjs"
  );
});
const publicEmails = new Set();
for (const path of emailTextPaths) {
  const content = await readText(path);
  for (const match of content.matchAll(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi)) {
    publicEmails.add(match[0].toLowerCase());
  }
}
const approvedPublicEmails = new Set([
  siteConfig.personalEmail.toLowerCase(),
  siteConfig.clubalEmail.toLowerCase(),
]);
for (const email of publicEmails) {
  if (!approvedPublicEmails.has(email)) fail(`e-mail público não aprovado: ${email}`);
}
if (!publicEmails.has(siteConfig.personalEmail.toLowerCase())) fail("e-mail pessoal não aparece nos outputs públicos");
if (!publicEmails.has(siteConfig.clubalEmail.toLowerCase())) fail("e-mail do ClubAL não aparece nos outputs públicos");

const textExtensions = new Set([".css", ".html", ".js", ".json", ".md", ".mjs", ".txt", ".xml"]);
for (const path of files.filter((file) => textExtensions.has(extname(file).toLowerCase()) && publicPath(file) !== "scripts/validate.mjs")) {
  const content = await readText(path);
  if (/\blorem ipsum\b/i.test(content) || /\bTODO\b/.test(content)) fail(`${publicPath(path)}: marcador provisório`);
}

for (const cssPath of files.filter((path) => extname(path).toLowerCase() === ".css")) {
  const css = await readText(cssPath);
  for (const match of css.matchAll(/url\((['"]?)([^'")]+)\1\)/g)) {
    const value = match[2].trim();
    if (!value || value.startsWith("data:") || value.startsWith("#")) continue;
    const target = localTarget(value, cssPath);
    if (target?.invalid) fail(`${publicPath(cssPath)}: URL inválida ${value}`);
    else if (target?.path && !await exists(target.path)) fail(`${publicPath(cssPath)}: asset inexistente ${value}`);
  }
}

const imageExtensions = new Set([".ico", ".jpeg", ".jpg", ".png", ".svg", ".webp"]);
let imageBytes = 0;
for (const path of files.filter((file) => imageExtensions.has(extname(file).toLowerCase()))) {
  const size = (await stat(path)).size;
  imageBytes += size;
  if (size > 3 * 1024 * 1024) fail(`${publicPath(path)}: imagem excede 3 MiB`);
}
if (imageBytes > 30 * 1024 * 1024) fail("orçamento total de imagens excede 30 MiB");

for (const path of files) {
  const size = (await stat(path)).size;
  if (size > 10 * 1024 * 1024) fail(`${publicPath(path)}: arquivo excede 10 MiB`);
  const prefix = (await readFile(path)).subarray(0, 160).toString("utf8");
  if (prefix.includes("version https://git-lfs.github.com/spec/v1")) {
    fail(`${publicPath(path)}: ponteiro Git LFS não permitido`);
  }
}

if (errors.length) {
  process.stderr.write(`Validação falhou (${errors.length}):\n- ${errors.join("\n- ")}\n`);
  process.exit(1);
}

const canonicalCount = expectedPages.filter((page) => page.canonical).length;
const notFoundCount = expectedPages.length - canonicalCount;
const siteCount = sitesByLocale["pt-BR"].sites.filter((site) => site.visible === true).length;
process.stdout.write(
  `Validação aprovada: ${expectedPages.length} páginas (${canonicalCount} canônicas + ${notFoundCount} 404), `
  + `${expectedMainOrder.length} itens principais (6 projetos + Sites) × ${localeOrder.length} idiomas, `
  + `${siteCount} cases no hub, ${(imageBytes / 1024 / 1024).toFixed(2)} MiB de imagens e nenhum ponteiro LFS.\n`,
);
