import { cp, mkdir, rm, stat } from "node:fs/promises";
import { join, resolve, sep } from "node:path";

const root = resolve(process.cwd());
const output = resolve(root, "dist");
if (!output.startsWith(`${root}${sep}`) || output === root) throw new Error("Destino de build inseguro.");

const entries = [
  "404.html", "_headers", "_redirects", "assets", "contato", "en", "es", "favicon.svg", "index.html",
  "manifest.webmanifest", "privacidade", "projetos", "robots.txt", "service-worker.js", "sitemap.xml", "sobre",
];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const entry of entries) {
  const source = join(root, entry);
  await stat(source);
  await cp(source, join(output, entry), { recursive: true });
}
process.stdout.write(`Build estático criado em ${output}\n`);
