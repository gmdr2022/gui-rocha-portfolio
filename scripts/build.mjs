import { cp, mkdir, readFile, readdir, rm, stat } from "node:fs/promises";
import { dirname, extname, join, relative, resolve, sep } from "node:path";

const root = resolve(process.cwd());
const output = resolve(root, "dist");
if (!output.startsWith(`${root}${sep}`) || output === root) throw new Error("Destino de build inseguro.");

const entries = [
  "404.html", "_headers", "_redirects", "assets/css", "assets/img", "assets/js", "contato", "en", "es", "favicon.svg", "index.html",
  "privacidade", "projetos", "robots.txt", "service-worker.js", "sitemap.xml", "sites",
];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const entry of entries) {
  const source = join(root, entry);
  const destination = join(output, entry);
  await stat(source);
  await mkdir(dirname(destination), { recursive: true });
  await cp(source, destination, { recursive: true });
}

const walk = async (directory) => {
  const paths = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) paths.push(...await walk(path));
    else paths.push(path);
  }
  return paths;
};

const textExtensions = new Set([".css", ".html", ".js", ".json", ".svg", ".txt", ".xml"]);
const imageExtensions = new Set([".ico", ".jpeg", ".jpg", ".png", ".svg", ".webp"]);
const assetReferences = new Set();
const initialFiles = await walk(output);

for (const path of initialFiles.filter((file) => textExtensions.has(extname(file).toLowerCase()))) {
  const content = await readFile(path, "utf8");
  for (const [reference] of content.matchAll(/\/assets\/img\/[a-z0-9_./-]+/gi)) assetReferences.add(reference);
  if (extname(path).toLowerCase() === ".css") {
    for (const [, , value] of content.matchAll(/url\((['"]?)([^'")]+)\1\)/g)) {
      if (value.startsWith("data:") || value.startsWith("#")) continue;
      const target = value.startsWith("/") ? join(output, value.slice(1)) : resolve(dirname(path), value);
      if (target.startsWith(`${output}${sep}`)) assetReferences.add(`/${relative(output, target).split(sep).join("/")}`);
    }
  }
}

let prunedBytes = 0;
let prunedFiles = 0;
const imageRoot = join(output, "assets", "img");
for (const path of (await walk(imageRoot)).filter((file) => imageExtensions.has(extname(file).toLowerCase()))) {
  const publicPath = `/${relative(output, path).split(sep).join("/")}`;
  if (assetReferences.has(publicPath)) continue;
  prunedBytes += (await stat(path)).size;
  prunedFiles += 1;
  await rm(path);
}

for (const reference of assetReferences) {
  const target = join(output, reference.slice(1));
  if (!target.startsWith(`${output}${sep}`)) throw new Error(`Referência pública insegura: ${reference}`);
  await stat(target);
}

const finalFiles = await walk(output);
const totalBytes = (await Promise.all(finalFiles.map(async (path) => (await stat(path)).size))).reduce((sum, size) => sum + size, 0);
process.stdout.write(
  `Build estático criado em ${output}: ${finalFiles.length} arquivos, ${(totalBytes / 1024 / 1024).toFixed(2)} MiB; `
  + `${prunedFiles} assets não referenciados removidos do artefato (${(prunedBytes / 1024 / 1024).toFixed(2)} MiB).\n`,
);
