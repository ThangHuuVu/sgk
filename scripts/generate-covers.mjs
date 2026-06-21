import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const csvPath = join(root, "metadata.csv");
const outputPath = join(root, "src", "lib", "covers.js");
const r2MapPath = join(root, "r2-map.json");
const r2VariantMapPath = join(root, "r2-variant-map.json");
const imageMap = existsSync(r2MapPath)
  ? JSON.parse(readFileSync(r2MapPath, "utf8"))
  : {};
const variantMap = existsSync(r2VariantMapPath)
  ? JSON.parse(readFileSync(r2VariantMapPath, "utf8"))
  : {};

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function clean(value) {
  return value?.trim() ?? "";
}

function variantPathFor(localFile, width) {
  const normalizedFile = localFile.replace(/^images\//, "");
  const extensionIndex = normalizedFile.lastIndexOf(".");
  const withoutExtension = extensionIndex === -1 ? normalizedFile : normalizedFile.slice(0, extensionIndex);
  return `variants/${width}/${withoutExtension}.webp`;
}

function cachePathFor(url) {
  if (!url || url.startsWith("/")) {
    return url;
  }

  try {
    const parsed = new URL(url);
    return `/covers/${parsed.pathname.replace(/^\/+/, "")}`;
  } catch {
    return url;
  }
}

function variantsFor(localFile) {
  const widths = [220, 440, 768];
  const variants = widths
    .map((width) => ({
      width,
      url: cachePathFor(variantMap[variantPathFor(localFile, width)] ?? ""),
    }))
    .filter((variant) => variant.url);

  return {
    thumbnail: variants[0]?.url ?? "",
    srcset: variants.map((variant) => `${variant.url} ${variant.width}w`).join(", "),
  };
}

function normalizeCover(row) {
  const localFile = clean(row.local_file);
  const variants = variantsFor(localFile);
  return {
    id: clean(row.id),
    title: clean(row.title),
    grade: clean(row.grade),
    subject: clean(row.subject),
    volume: clean(row.volume),
    collection: clean(row.collection_or_program),
    imprint: clean(row.publisher_or_imprint),
    year: clean(row.publication_year_or_era),
    confidence: clean(row.date_confidence),
    localFile,
    imagePath: cachePathFor(imageMap[localFile]) ?? `/${localFile}`,
    thumbnailPath: variants.thumbnail || cachePathFor(imageMap[localFile]) || `/${localFile}`,
    imageSrcset: variants.srcset,
    sourceUrl: clean(row.page_url),
    sourceName: clean(row.source_name),
  };
}

const [header, ...records] = parseCsv(readFileSync(csvPath, "utf8"));
const fields = header.map(clean);
const covers = records
  .filter((record) => record.length > 1)
  .map((record) =>
    Object.fromEntries(fields.map((field, index) => [field, record[index] ?? ""])),
  )
  .map(normalizeCover);

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(
  outputPath,
  `export const covers = ${JSON.stringify(covers, null, 2)};\n`,
);

console.log(`Đã tạo ${covers.length} bìa trong src/lib/covers.js`);
