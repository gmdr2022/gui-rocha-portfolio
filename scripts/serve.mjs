import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";

const root = resolve(process.cwd());
const requestedPort = Number(process.argv[process.argv.indexOf("--port") + 1]);
const port = Number.isInteger(requestedPort) && requestedPort > 0 ? requestedPort : 4173;
const mimeTypes = {
  ".css": "text/css; charset=utf-8", ".html": "text/html; charset=utf-8", ".ico": "image/x-icon",
  ".jpeg": "image/jpeg", ".jpg": "image/jpeg", ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".png": "image/png", ".svg": "image/svg+xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8", ".webmanifest": "application/manifest+json; charset=utf-8", ".xml": "application/xml; charset=utf-8",
};

const safePath = (pathname) => {
  const decoded = decodeURIComponent(pathname).replaceAll("/", sep);
  const absolute = resolve(root, `.${sep}${normalize(decoded)}`);
  return absolute === root || absolute.startsWith(`${root}${sep}`) ? absolute : null;
};

const resolveFile = async (pathname) => {
  let candidate = safePath(pathname);
  if (!candidate) return null;
  try {
    const details = await stat(candidate);
    if (details.isDirectory()) candidate = join(candidate, "index.html");
  } catch {
    if (!extname(candidate)) candidate = join(candidate, "index.html");
  }
  try { return (await stat(candidate)).isFile() ? candidate : null; } catch { return null; }
};

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
    const file = await resolveFile(url.pathname);
    const target = file || join(root, "404.html");
    const payload = await readFile(target);
    response.writeHead(file ? 200 : 404, {
      "Content-Type": mimeTypes[extname(target).toLowerCase()] || "application/octet-stream",
      "Content-Length": payload.length,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    if (request.method === "HEAD") response.end(); else response.end(payload);
  } catch {
    response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Falha ao servir o site localmente.");
  }
});

server.listen(port, "127.0.0.1", () => {
  process.stdout.write(`Gui Rocha local: http://127.0.0.1:${port}\n`);
});
