import { createServer } from "node:http";
import { readFile, realpath, stat } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";

const argumentValue = (name) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const projectRoot = await realpath(resolve(process.cwd()));
const root = await realpath(resolve(projectRoot, "dist"));
const requestedPort = Number(argumentValue("--port"));
const port = Number.isInteger(requestedPort) && requestedPort > 0 ? requestedPort : 4173;
const mimeTypes = {
  ".css": "text/css; charset=utf-8", ".html": "text/html; charset=utf-8", ".ico": "image/x-icon",
  ".jpeg": "image/jpeg", ".jpg": "image/jpeg", ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".png": "image/png", ".svg": "image/svg+xml; charset=utf-8", ".webp": "image/webp",
  ".txt": "text/plain; charset=utf-8", ".webmanifest": "application/manifest+json; charset=utf-8", ".xml": "application/xml; charset=utf-8",
};

const redirectRules = (await readFile(join(root, "_redirects"), "utf8"))
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith("#"))
  .map((line) => {
    const [source, target, status = "302"] = line.split(/\s+/);
    return { source, target, status: Number(status) };
  });

const headerRules = [];
let activeHeaderRule = null;
for (const rawLine of (await readFile(join(root, "_headers"), "utf8")).split(/\r?\n/)) {
  if (!rawLine.trim() || rawLine.trimStart().startsWith("#")) continue;
  if (!rawLine.startsWith(" ") && !rawLine.startsWith("\t")) {
    activeHeaderRule = { source: rawLine.trim(), headers: {} };
    headerRules.push(activeHeaderRule);
    continue;
  }
  const separatorIndex = rawLine.indexOf(":");
  if (!activeHeaderRule || separatorIndex < 0) continue;
  activeHeaderRule.headers[rawLine.slice(0, separatorIndex).trim()] = rawLine.slice(separatorIndex + 1).trim();
}

const responseHeadersFor = (pathname) => {
  const headers = {};
  for (const rule of headerRules) {
    if (rule.source === "/*" || rule.source === pathname) Object.assign(headers, rule.headers);
  }
  const contentSecurityPolicy = headers["Content-Security-Policy"];
  if (contentSecurityPolicy) {
    // WebKit applies upgrade-insecure-requests to loopback subresources. The
    // production header keeps the directive; the HTTP-only local harness omits
    // it so every browser can load the same CSS and JavaScript under test.
    headers["Content-Security-Policy"] = contentSecurityPolicy
      .split(";")
      .map((directive) => directive.trim())
      .filter((directive) => directive && directive !== "upgrade-insecure-requests")
      .join("; ");
  }
  return headers;
};

const safePath = (pathname) => {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname).replaceAll("/", sep);
  } catch {
    return null;
  }
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
  try {
    candidate = await realpath(candidate);
    if (candidate !== root && !candidate.startsWith(`${root}${sep}`)) return null;
    return (await stat(candidate)).isFile() ? candidate : null;
  } catch {
    return null;
  }
};

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
    const redirect = redirectRules.find((rule) => rule.source === url.pathname);
    if (redirect) {
      const location = `${redirect.target}${url.search}`;
      response.writeHead(redirect.status, {
        ...responseHeadersFor(url.pathname),
        "Cache-Control": "no-store",
        Location: location,
      });
      response.end();
      return;
    }
    const file = await resolveFile(url.pathname);
    const localizedNotFound = url.pathname.startsWith("/en/")
      ? join(root, "en", "404.html")
      : url.pathname.startsWith("/es/") ? join(root, "es", "404.html") : join(root, "404.html");
    const target = file || localizedNotFound;
    const payload = await readFile(target);
    const targetDetails = await stat(target);
    const etag = `W/"${payload.length.toString(16)}-${Math.trunc(targetDetails.mtimeMs).toString(16)}"`;
    const configuredHeaders = responseHeadersFor(url.pathname);
    const headers = {
      "Content-Type": mimeTypes[extname(target).toLowerCase()] || "application/octet-stream",
      "Content-Length": payload.length,
      "Cache-Control": file ? "public, max-age=0, must-revalidate" : "no-store",
      ETag: etag,
      "Last-Modified": targetDetails.mtime.toUTCString(),
      "X-Content-Type-Options": "nosniff",
      ...configuredHeaders,
    };
    if (file && request.headers["if-none-match"] === etag) {
      delete headers["Content-Length"];
      response.writeHead(304, headers);
      response.end();
      return;
    }
    response.writeHead(file ? 200 : 404, headers);
    if (request.method === "HEAD") response.end(); else response.end(payload);
  } catch {
    response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Falha ao servir o site localmente.");
  }
});

server.listen(port, "127.0.0.1", () => {
  process.stdout.write(`Gui Rocha local: http://127.0.0.1:${port}\n`);
});
