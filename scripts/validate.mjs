import { readFile, readdir, stat } from "node:fs/promises";
import { extname, join, resolve } from "node:path";

const root = resolve(process.cwd());
const errors = [];
const requiredProjectSlugs = ["clubal", "maeve", "demonyza", "codex-checkpoint", "nexus", "local-first-checklist"];
const ignoredDirectories = new Set([".git", "dist", "node_modules", "output"]);

const walk = async (directory) => {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path)); else files.push(path);
  }
  return files;
};

const exists = async (path) => { try { return (await stat(path)).isFile(); } catch { return false; } };
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
for (const path of htmlFiles) {
  const html = await readFile(path, "utf8");
  const label = path.slice(root.length + 1);
  if (!html.includes('lang="pt-BR"')) errors.push(`${label}: idioma ausente`);
  if (!/<title>[^<]+<\/title>/.test(html)) errors.push(`${label}: título ausente`);
  if (!html.includes('name="viewport"')) errors.push(`${label}: viewport ausente`);
  if (!html.includes("<main")) errors.push(`${label}: elemento main ausente`);
  if (!html.includes("skip-link")) errors.push(`${label}: skip link ausente`);
  if (label !== "404.html" && !html.includes('name="description"')) errors.push(`${label}: descrição ausente`);
  for (const [, value] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const target = localTarget(value);
    if (target && !await exists(target)) errors.push(`${label}: referência local inexistente ${value}`);
  }
  for (const [tag] of html.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)) {
    if (!/rel="[^"]*noopener[^"]*"/.test(tag)) errors.push(`${label}: link externo sem noopener`);
  }
}

const projectsPath = join(root, "assets", "data", "projects.json");
const projects = JSON.parse(await readFile(projectsPath, "utf8"));
if (projects.length !== requiredProjectSlugs.length) errors.push("projects.json: quantidade inesperada de projetos");
if (new Set(projects.map((project) => project.slug)).size !== projects.length) errors.push("projects.json: slugs duplicados");
for (const slug of requiredProjectSlugs) {
  const project = projects.find((item) => item.slug === slug);
  if (!project) { errors.push(`projects.json: projeto ausente ${slug}`); continue; }
  if (!await exists(localTarget(project.route))) errors.push(`projects.json: rota inexistente ${project.route}`);
  if (!await exists(localTarget(project.image))) errors.push(`projects.json: imagem inexistente ${project.image}`);
}

const clubal = projects.find((project) => project.slug === "clubal");
const clubalStructure = clubal?.tabs.find((tab) => tab.id === "estrutura")?.points || [];
const requiredModules = ["Operação PEMSE · editar e publicar", "Rotinas PEMSE · exibir o aprovado", "Consulta PEMSE · ler sem editar"];
if (clubalStructure.length !== 3 || requiredModules.some((module) => !clubalStructure.includes(module))) errors.push("ClubAL: contrato de exatamente três módulos não preservado");

const maeve = projects.find((project) => project.slug === "maeve");
if (!maeve?.visualLabel.toLowerCase().includes("imagem conceito")) errors.push("Maeve: rótulo de imagem conceito ausente");
if (maeve?.gallery?.length !== 7) errors.push("Maeve: galeria conceitual incompleta");
for (const item of maeve?.gallery || []) {
  if (!item.label.toLowerCase().includes("conceito")) errors.push(`Maeve: item sem rótulo conceitual ${item.src}`);
  if (!await exists(localTarget(item.src))) errors.push(`Maeve: imagem inexistente ${item.src}`);
}
const publicCopy = files.filter((path) => [".html", ".js", ".json"].includes(extname(path))).map(async (path) => readFile(path, "utf8"));
const publicText = (await Promise.all(publicCopy)).join("\n");
if (publicText.includes("gmdr2014@gmail.com")) errors.push("Contato pessoal antigo ainda exposto");
if ((publicText.match(/\badulto\b/gi) || []).length !== 1) errors.push("Maeve: a classificação adulta deve aparecer exatamente uma vez");

const textFiles = files.filter((path) => path !== join(root, "scripts", "validate.mjs") && [".css", ".html", ".js", ".json", ".md", ".txt", ".xml"].includes(extname(path)));
for (const path of textFiles) {
  const content = await readFile(path, "utf8");
  if (/maeve-threshold\.svg|\blorem ipsum\b|\bTODO\b/i.test(content)) errors.push(`${path.slice(root.length + 1)}: marcador obsoleto ou provisório`);
}

const imageFiles = files.filter((path) => [".jpg", ".jpeg", ".png", ".svg", ".webp"].includes(extname(path).toLowerCase()));
let imageBytes = 0;
for (const path of imageFiles) {
  const size = (await stat(path)).size;
  imageBytes += size;
  if (size > 3 * 1024 * 1024) errors.push(`${path.slice(root.length + 1)}: imagem excede 3 MiB`);
}
if (imageBytes > 30 * 1024 * 1024) errors.push("Orçamento total de imagens excede 30 MiB");

const siteScript = await readFile(join(root, "assets", "js", "site.js"), "utf8");
if (!siteScript.includes('CONSENT_COOKIE = "gui_consent"')) errors.push("Cookie de consentimento não encontrado");
const headers = await readFile(join(root, "_headers"), "utf8");
for (const header of ["Content-Security-Policy", "Permissions-Policy", "Referrer-Policy", "X-Content-Type-Options"]) if (!headers.includes(header)) errors.push(`Cabeçalho ausente: ${header}`);

if (errors.length) {
  process.stderr.write(`Validação falhou (${errors.length}):\n- ${errors.join("\n- ")}\n`);
  process.exit(1);
}
process.stdout.write(`Validação aprovada: ${htmlFiles.length} páginas, ${projects.length} projetos, ${(imageBytes / 1024 / 1024).toFixed(2)} MiB de imagens.\n`);
