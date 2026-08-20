import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const reportPath = resolve(repositoryRoot, "output", "editorial-lexical-audit-20260819.json");
const checkOnly = process.argv.slice(2).includes("--check");
const unexpectedArguments = process.argv.slice(2).filter((argument) => argument !== "--check");

if (unexpectedArguments.length > 0) {
  throw new Error(`Argumentos desconhecidos: ${unexpectedArguments.join(", ")}`);
}

const lexicons = {
  "pt-BR": {
    problem: ["problema", "problemas"],
    context: ["contexto", "contextos"],
    solution: ["solução"],
    evidence: ["evidência"],
    clarity: ["clareza"],
    delivery: ["entrega"],
    real: ["real", "reais"],
    evolution: ["evolução"],
  },
  en: {
    problem: ["problem", "problems"],
    context: ["context", "contexts"],
    solution: ["solution"],
    evidence: ["evidence"],
    clarity: ["clear"],
    delivery: ["delivery"],
    real: ["real"],
    evolution: ["evolution"],
  },
  es: {
    problem: ["problema", "problemas"],
    context: ["contexto", "contextos"],
    solution: ["solución"],
    evidence: ["evidencia"],
    clarity: ["claridad"],
    delivery: ["entrega"],
    real: ["real"],
    evolution: ["evolución"],
  },
};

const namedEntities = new Map([
  ["amp", "&"],
  ["apos", "'"],
  ["copy", "©"],
  ["gt", ">"],
  ["hellip", "…"],
  ["laquo", "«"],
  ["larr", "←"],
  ["ldquo", "“"],
  ["lsquo", "‘"],
  ["lt", "<"],
  ["mdash", "—"],
  ["middot", "·"],
  ["nbsp", " "],
  ["ndash", "–"],
  ["quot", '"'],
  ["raquo", "»"],
  ["rarr", "→"],
  ["rdquo", "”"],
  ["rsquo", "’"],
]);

function runGit(arguments_) {
  return execFileSync("git", arguments_, {
    cwd: repositoryRoot,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    windowsHide: true,
  }).replace(/\r\n/g, "\n");
}

function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function splitLines(value) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function languageForPath(filePath) {
  if (filePath.startsWith("en/")) return "en";
  if (filePath.startsWith("es/")) return "es";
  return "pt-BR";
}

function routeForPath(filePath) {
  if (filePath === "index.html") return "/";
  if (filePath.endsWith("/index.html")) return `/${filePath.slice(0, -"index.html".length)}`;
  return `/${filePath}`;
}

function decodeEntities(value) {
  return value.replace(/&(#x[\da-f]+|#\d+|[a-z][\da-z]+);/gi, (entity, code) => {
    if (code.startsWith("#x") || code.startsWith("#X")) {
      const number = Number.parseInt(code.slice(2), 16);
      return Number.isFinite(number) && number <= 0x10ffff ? String.fromCodePoint(number) : " ";
    }

    if (code.startsWith("#")) {
      const number = Number.parseInt(code.slice(1), 10);
      return Number.isFinite(number) && number <= 0x10ffff ? String.fromCodePoint(number) : " ";
    }

    return namedEntities.get(code.toLowerCase()) ?? " ";
  });
}

function elementAt(html, tagName, startIndex) {
  const tokenPattern = new RegExp(`<\\/?${tagName}\\b[^>]*>`, "gi");
  tokenPattern.lastIndex = startIndex;
  let depth = 0;
  let openingEnd = -1;
  let token;

  while ((token = tokenPattern.exec(html)) !== null) {
    const isClosing = /^<\//.test(token[0]);
    if (!isClosing) {
      if (depth === 0) openingEnd = tokenPattern.lastIndex;
      depth += 1;
      continue;
    }

    depth -= 1;
    if (depth === 0 && openingEnd >= 0) {
      return {
        inner: html.slice(openingEnd, token.index),
        outer: html.slice(startIndex, tokenPattern.lastIndex),
      };
    }
  }

  return null;
}

function firstElement(html, tagName) {
  const openingPattern = new RegExp(`<${tagName}\\b[^>]*>`, "i");
  const opening = openingPattern.exec(html);
  if (!opening) return null;
  return elementAt(html, tagName, opening.index);
}

function describeOpeningTag(openingTag) {
  const tagName = /^<([a-z][\w:-]*)/i.exec(openingTag)?.[1]?.toLowerCase() ?? "unknown";
  const classValue = /\bclass\s*=\s*(["'])(.*?)\1/i.exec(openingTag)?.[2] ?? "";
  const classes = classValue
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((className) => `.${className}`)
    .join("");
  return `${tagName}${classes}`;
}

function firstVisualBlock(mainHtml) {
  const candidates = [];
  const openingPattern = /<(section|header|article)\b[^>]*>/gi;
  let opening;

  while ((opening = openingPattern.exec(mainHtml)) !== null) {
    const openingTag = opening[0];
    const classValue = /\bclass\s*=\s*(["'])(.*?)\1/i.exec(openingTag)?.[2] ?? "";
    candidates.push({
      tagName: opening[1].toLowerCase(),
      index: opening.index,
      openingTag,
      preferred: /(?:^|\s)(?:[^\s]*hero|project-heading)(?:\s|$)/i.test(classValue),
    });
  }

  const candidate = candidates.find((item) => item.preferred) ?? candidates[0];
  if (!candidate) return null;
  const element = elementAt(mainHtml, candidate.tagName, candidate.index);
  if (!element) return null;
  return {
    html: element.outer,
    selector: describeOpeningTag(candidate.openingTag),
  };
}

function visibleText(markup) {
  let value = markup;

  value = value.replace(/<!--[\s\S]*?-->/g, " ");
  for (const tagName of ["script", "style", "template", "noscript", "svg"]) {
    const elementPattern = new RegExp(`<${tagName}\\b[^>]*>[\\s\\S]*?<\\/${tagName}\\s*>`, "gi");
    value = value.replace(elementPattern, " ");
  }

  // Conteúdo auxiliar apenas para leitores de tela não faz parte do inventário visual.
  value = value.replace(
    /<([a-z][\w:-]*)\b(?=[^>]*\bclass\s*=\s*(["'])[^"']*\bsr-only\b[^"']*\2)[^>]*>[\s\S]*?<\/\1\s*>/gi,
    " ",
  );
  value = value.replace(/<[^>]+>/g, " ");
  value = decodeEntities(value);
  value = value.replace(/\b(?:https?:\/\/|www\.)\S+/giu, " ");
  return value.normalize("NFC").replace(/\s+/gu, " ").trim();
}

function escapeRegularExpression(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countTerm(text, term) {
  const normalizedText = text.toLocaleLowerCase("und");
  const pattern = new RegExp(
    `(?<![\\p{L}\\p{N}_])${escapeRegularExpression(term)}(?![\\p{L}\\p{N}_])`,
    "gu",
  );
  return normalizedText.match(pattern)?.length ?? 0;
}

function summarizeText(text, lexicon) {
  const lexicalCounts = {};
  let totalLexicalMatches = 0;

  for (const [concept, terms] of Object.entries(lexicon)) {
    const termCounts = Object.fromEntries(terms.map((term) => [term, countTerm(text, term)]));
    const total = Object.values(termCounts).reduce((sum, count) => sum + count, 0);
    lexicalCounts[concept] = { total, terms: termCounts };
    totalLexicalMatches += total;
  }

  return {
    characterCount: text.length,
    wordCount: text.match(/[\p{L}\p{N}]+(?:[’'.-][\p{L}\p{N}]+)*/gu)?.length ?? 0,
    textSha256: sha256(text),
    totalLexicalMatches,
    lexicalCounts,
  };
}

function summarizeHtml(html, language) {
  const main = firstElement(html, "main") ?? firstElement(html, "body");
  const mainHtml = main?.inner ?? "";
  const firstBlock = firstVisualBlock(mainHtml);
  return {
    page: summarizeText(visibleText(mainHtml), lexicons[language]),
    firstVisualBlock: {
      selector: firstBlock?.selector ?? null,
      ...summarizeText(visibleText(firstBlock?.html ?? ""), lexicons[language]),
    },
  };
}

function lexicalDelta(baselineCounts, currentCounts) {
  const result = {};
  for (const concept of Object.keys(currentCounts)) {
    const terms = {};
    for (const term of Object.keys(currentCounts[concept].terms)) {
      terms[term] = currentCounts[concept].terms[term] - baselineCounts[concept].terms[term];
    }
    result[concept] = {
      total: currentCounts[concept].total - baselineCounts[concept].total,
      terms,
    };
  }
  return result;
}

function summaryDelta(baseline, current) {
  return {
    characterCount: current.characterCount - baseline.characterCount,
    wordCount: current.wordCount - baseline.wordCount,
    totalLexicalMatches: current.totalLexicalMatches - baseline.totalLexicalMatches,
    lexicalCounts: lexicalDelta(baseline.lexicalCounts, current.lexicalCounts),
  };
}

function emptyAggregate(language) {
  return {
    routeCount: 0,
    page: summarizeText("", lexicons[language]),
    firstVisualBlock: summarizeText("", lexicons[language]),
  };
}

function addSummary(aggregate, summary) {
  aggregate.characterCount += summary.characterCount;
  aggregate.wordCount += summary.wordCount;
  aggregate.totalLexicalMatches += summary.totalLexicalMatches;
  for (const [concept, conceptCounts] of Object.entries(summary.lexicalCounts)) {
    aggregate.lexicalCounts[concept].total += conceptCounts.total;
    for (const [term, count] of Object.entries(conceptCounts.terms)) {
      aggregate.lexicalCounts[concept].terms[term] += count;
    }
  }
  aggregate.textSha256 = null;
}

function aggregateRoutes(routes, language) {
  const baseline = emptyAggregate(language);
  const current = emptyAggregate(language);

  for (const route of routes.filter((item) => item.language === language)) {
    baseline.routeCount += 1;
    current.routeCount += 1;
    addSummary(baseline.page, route.baseline.page);
    addSummary(baseline.firstVisualBlock, route.baseline.firstVisualBlock);
    addSummary(current.page, route.current.page);
    addSummary(current.firstVisualBlock, route.current.firstVisualBlock);
  }

  return {
    baseline,
    current,
    delta: {
      routeCount: current.routeCount - baseline.routeCount,
      page: summaryDelta(baseline.page, current.page),
      firstVisualBlock: summaryDelta(baseline.firstVisualBlock, current.firstVisualBlock),
    },
  };
}

const baselineSha = runGit(["rev-parse", "HEAD"]).trim();
const baselineCommitTimestamp = runGit(["show", "-s", "--format=%cI", baselineSha]).trim();
const baselinePaths = splitLines(runGit(["ls-tree", "-r", "--name-only", baselineSha])).filter((path) =>
  path.endsWith(".html"),
);
const currentPaths = splitLines(runGit(["ls-files", "--", "*.html"]));
const htmlPaths = [...new Set([...baselinePaths, ...currentPaths])].sort((left, right) => left.localeCompare(right, "en"));
const baselineFingerprintParts = [];
const currentFingerprintParts = [];
const routes = [];

for (const filePath of htmlPaths) {
  const language = languageForPath(filePath);
  let baselineHtml = "";
  try {
    baselineHtml = runGit(["show", `${baselineSha}:${filePath}`]);
  } catch {
    throw new Error(`A rota ${filePath} não existe no baseline HEAD; este auditor exige HTML rastreado no HEAD.`);
  }

  const absolutePath = resolve(repositoryRoot, filePath);
  if (!existsSync(absolutePath)) {
    throw new Error(`A rota rastreada ${filePath} não existe no worktree atual.`);
  }
  const currentHtml = readFileSync(absolutePath, "utf8").replace(/\r\n/g, "\n");
  baselineFingerprintParts.push(`${filePath}\0${baselineHtml}`);
  currentFingerprintParts.push(`${filePath}\0${currentHtml}`);

  const baseline = summarizeHtml(baselineHtml, language);
  const current = summarizeHtml(currentHtml, language);
  routes.push({
    file: filePath,
    route: routeForPath(filePath),
    language,
    baseline,
    current,
    delta: {
      page: summaryDelta(baseline.page, current.page),
      firstVisualBlock: summaryDelta(baseline.firstVisualBlock, current.firstVisualBlock),
    },
  });
}

const totalsByLanguage = Object.fromEntries(
  Object.keys(lexicons).map((language) => [language, aggregateRoutes(routes, language)]),
);
const homeRoute = routes.find((route) => route.file === "index.html");
const report = {
  schemaVersion: 1,
  title: "Auditoria lexical do texto visível do portal",
  comparison: {
    baseline: {
      kind: "git-head",
      description: "HTML rastreado no commit HEAD, não uma captura histórica de navegador",
      sha: baselineSha,
      commitTimestamp: baselineCommitTimestamp,
      htmlTreeSha256: sha256(baselineFingerprintParts.join("\0\n")),
    },
    current: {
      kind: "worktree",
      description: "HTML rastreado lido do worktree no momento da execução",
      htmlTreeSha256: sha256(currentFingerprintParts.join("\0\n")),
    },
  },
  extraction: {
    pageScope: "texto do elemento main; body é usado apenas se main não existir",
    firstVisualBlockScope:
      "primeiro section/header/article preferindo classes hero ou project-heading dentro de main",
    excluded:
      "head, atributos, comentários, scripts, estilos, JSON-LD, template, noscript, SVG, conteúdo sr-only, URLs e texto dentro de imagens",
    note:
      "painéis interativos presentes no HTML principal são incluídos mesmo quando começam recolhidos, pois continuam sendo conteúdo editorial alcançável pelo usuário",
  },
  lexicons,
  routeCount: routes.length,
  checks: {
    currentPortugueseHomeMainHasNoProblemOrContext:
      homeRoute.current.page.lexicalCounts.problem.total === 0 &&
      homeRoute.current.page.lexicalCounts.context.total === 0,
  },
  totalsByLanguage,
  routes,
};
const serializedReport = `${JSON.stringify(report, null, 2)}\n`;

if (checkOnly) {
  if (!existsSync(reportPath)) {
    console.error(`Relatório ausente: ${reportPath}`);
    process.exitCode = 1;
  } else if (readFileSync(reportPath, "utf8").replace(/\r\n/g, "\n") !== serializedReport) {
    console.error(`Relatório desatualizado: ${reportPath}`);
    process.exitCode = 1;
  } else {
    console.log(`Relatório lexical atualizado: ${reportPath}`);
  }
} else {
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, serializedReport, "utf8");
  console.log(`Relatório lexical gravado: ${reportPath}`);
}

console.log(`Baseline HEAD: ${baselineSha}`);
console.log(`Rotas auditadas: ${routes.length}`);
console.log(
  `Home PT-BR (main atual): problema=${homeRoute.current.page.lexicalCounts.problem.total}; contexto=${homeRoute.current.page.lexicalCounts.context.total}`,
);
