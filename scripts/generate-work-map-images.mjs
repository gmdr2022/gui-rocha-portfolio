import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { chromium } from "@playwright/test";

const [inputArgument, outputArgument = "assets/img/gui"] = process.argv.slice(2);
if (!inputArgument) {
  throw new Error("Uso: node scripts/generate-work-map-images.mjs <imagem-origem> [diretorio-saida]");
}

const input = resolve(inputArgument);
const outputDirectory = resolve(outputArgument);
const source = await readFile(input);
const extension = extname(input).toLowerCase();
const mimeType = extension === ".png" ? "image/png" : extension === ".webp" ? "image/webp" : "image/jpeg";
const sourceUrl = `data:${mimeType};base64,${source.toString("base64")}`;
const widths = [640, 960, 1280, 1672];
const quality = 0.92;

await mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage();
  const sourceMetadata = await page.evaluate(async (url) => {
    const image = new Image();
    image.src = url;
    await image.decode();
    return { width: image.naturalWidth, height: image.naturalHeight };
  }, sourceUrl);

  if (widths.at(-1) > sourceMetadata.width) {
    throw new Error(`A maior variante (${widths.at(-1)} px) excede a origem (${sourceMetadata.width} px).`);
  }

  const variants = [];
  for (const width of widths) {
    const encoded = await page.evaluate(async ({ url, targetWidth, webpQuality }) => {
      const image = new Image();
      image.src = url;
      await image.decode();
      const targetHeight = Math.round((image.naturalHeight * targetWidth) / image.naturalWidth);
      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const context = canvas.getContext("2d", { alpha: false });
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(image, 0, 0, targetWidth, targetHeight);
      return {
        dataUrl: canvas.toDataURL("image/webp", webpQuality),
        width: targetWidth,
        height: targetHeight,
      };
    }, { url: sourceUrl, targetWidth: width, webpQuality: quality });

    if (!encoded.dataUrl.startsWith("data:image/webp;base64,")) {
      throw new Error("O navegador não disponibilizou codificação WebP.");
    }

    const output = resolve(outputDirectory, `mapa-do-trabalho-${width}.webp`);
    const bytes = Buffer.from(encoded.dataUrl.split(",", 2)[1], "base64");
    await writeFile(output, bytes);
    variants.push({
      output,
      width: encoded.width,
      height: encoded.height,
      bytes: (await stat(output)).size,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    });
  }

  process.stdout.write(`${JSON.stringify({
    input,
    source: {
      ...sourceMetadata,
      bytes: source.length,
      sha256: createHash("sha256").update(source).digest("hex"),
    },
    quality,
    variants,
  }, null, 2)}\n`);
} finally {
  await browser.close();
}
