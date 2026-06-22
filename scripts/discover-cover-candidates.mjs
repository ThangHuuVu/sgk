import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const metadataPath = join(root, "metadata.csv");
const sourceRoot = join(root, "sources");
const outputRoot = join(root, "generated");
const jsonOutputPath = join(outputRoot, "cover-candidates.json");
const csvOutputPath = join(outputRoot, "cover-candidates.csv");
const minScore = Number(process.env.COVER_DISCOVERY_MIN_SCORE ?? 5);

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

function normalizeUrl(value) {
  try {
    const url = new URL(value);
    url.hash = "";
    url.search = "";
    return url.toString();
  } catch {
    return value;
  }
}

function dedupeImageUrl(value) {
  return normalizeUrl(value).replace(/-\d+x\d+(\.(?:jpe?g|png|webp))$/i, "$1");
}

function metadataRows() {
  const [header, ...records] = parseCsv(readFileSync(metadataPath, "utf8"));
  const fields = header.map((field) => field.trim());
  return records
    .filter((record) => record.length > 1)
    .map((record) =>
      Object.fromEntries(fields.map((field, index) => [field, record[index] ?? ""])),
    );
}

function attrMap(tag) {
  const attrs = {};
  for (const match of tag.matchAll(/([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
    attrs[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? "";
  }
  return attrs;
}

function sourceBaseUrl(fileName, html) {
  const canonical = html.match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)?.[1];
  const ogUrl = html.match(/<meta\b[^>]*property=["']og:url["'][^>]*content=["']([^"']+)["']/i)?.[1];
  const hinted = canonical || ogUrl;

  if (hinted) {
    try {
      return new URL(hinted).origin;
    } catch {
      // Fall through to source-name hints.
    }
  }

  if (fileName.startsWith("baikiemtra-")) return "https://baikiemtra.com";
  if (fileName.startsWith("danviet-")) return "https://danviet.vn";
  if (fileName.startsWith("ebook365-")) return "https://ebook365.vn";
  if (fileName.startsWith("sachhoc-")) return "https://sachhoc.com";
  if (fileName.startsWith("shop-sobee-")) return "https://shop.sobee.vn";
  if (fileName.startsWith("sobee-")) return "https://sobee.vn";
  if (fileName.startsWith("trungtamsach-")) return "https://trungtamsach.vn";

  return "";
}

function sourcePageUrl(html) {
  return (
    html.match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)?.[1] ||
    html.match(/<meta\b[^>]*property=["']og:url["'][^>]*content=["']([^"']+)["']/i)?.[1] ||
    ""
  );
}

function absoluteUrl(value, baseUrl) {
  if (!value || value.startsWith("data:")) return "";
  try {
    return new URL(value, baseUrl || undefined).toString();
  } catch {
    return "";
  }
}

function decodeText(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&apos;", "'")
    .replaceAll("&nbsp;", " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreCandidate({ attrs, imageUrl }) {
  const haystack = [
    imageUrl,
    attrs.alt,
    attrs.title,
    attrs.class,
    attrs.srcset,
    attrs["data-src"],
    attrs["data-original"],
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const reasons = [];
  let score = 0;

  if (/\.(jpe?g|png|webp)(?:$|\?)/i.test(imageUrl)) {
    score += 2;
    reasons.push("image-extension");
  }

  if (/\/(book|sach|catalog|uploads|images?)\//i.test(imageUrl)) {
    score += 2;
    reasons.push("book-path");
  }

  if (/(sgk|sách giáo khoa|sach-giao-khoa|sach giao khoa|toán|toan|tiếng việt|tieng viet|ngữ văn|ngu van|vật l[iy]|vat l[iy]|hoá học|hoa hoc|lịch sử|lich su|địa l[iy]|dia l[iy]|sinh học|sinh hoc|tin học|tin hoc|công nghệ|cong nghe|mĩ thuật|mi thuat|âm nhạc|am nhac|đạo đức|dao duc|khoa học|khoa hoc)/i.test(haystack)) {
    score += 3;
    reasons.push("textbook-keyword");
  }

  if (/(sgk|sách giáo khoa|sach-giao-khoa|sach giao khoa)/i.test(haystack)) {
    score += 2;
    reasons.push("explicit-sgk");
  }

  if (/(vbt|bài tập|bai tap|sách giáo viên|sach giao vien|tlbd|tài liệu|tai lieu|logo|avatar|icon|svg|banner|ads|no_avatar)/i.test(haystack)) {
    score -= 3;
    reasons.push("likely-non-cover-or-workbook");
  }

  if (/(book_default|đề thi|de thi|ôn thi|on thi|ôn luyện|on luyen|đề kiểm tra|de kiem tra|học sinh giỏi|hoc sinh gioi|violympic|thpt quốc gia|thpt quoc gia|tốt nghiệp thpt|tot nghiep thpt|bài toán|bai toan|tuyển tập đề|tuyen tap de|luyện thi|luyen thi|\/dai-hoc\/)/i.test(haystack)) {
    score -= 5;
    reasons.push("exam-prep-or-placeholder");
  }

  if (/(trọn bộ|tron bo|combo|set|full)/i.test(haystack)) {
    score -= 3;
    reasons.push("bundle-image");
  }

  if (/-75x83\.(?:jpe?g|png|webp)$/i.test(imageUrl)) {
    score -= 2;
    reasons.push("tiny-thumbnail");
  }

  if (/-500x554\.(?:jpe?g|png|webp)$/i.test(imageUrl) || /homeimg/i.test(attrs.class ?? "")) {
    score += 1;
    reasons.push("review-sized-image");
  }

  if (/(homeimg|img-thumbnail|product|cover)/i.test(attrs.class ?? "")) {
    score += 1;
    reasons.push("cover-like-class");
  }

  return { score, reasons };
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
}

const existingImageUrls = new Set(
  metadataRows()
    .map((row) => row.image_url)
    .filter(Boolean)
    .map(dedupeImageUrl),
);

const seen = new Map();

if (!existsSync(sourceRoot)) {
  throw new Error("Không tìm thấy thư mục sources.");
}

for (const fileName of readdirSync(sourceRoot).filter((file) => file.endsWith(".html"))) {
  const filePath = join(sourceRoot, fileName);
  const html = readFileSync(filePath, "utf8");
  const baseUrl = sourceBaseUrl(fileName, html);
  const pageUrl = sourcePageUrl(html);

  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    const attrs = attrMap(match[0]);
    const rawUrl = attrs.src || attrs["data-src"] || attrs["data-original"] || "";
    const imageUrl = absoluteUrl(rawUrl, baseUrl);
    const normalizedImageUrl = dedupeImageUrl(imageUrl);

    if (!imageUrl || existingImageUrls.has(normalizedImageUrl)) continue;

    const title = decodeText(attrs.alt || attrs.title || "");
    const scored = scoreCandidate({ attrs, imageUrl });
    if (scored.score < minScore) continue;

    const previous = seen.get(normalizedImageUrl);
    const candidate = {
      title,
      imageUrl,
      pageUrl,
      sourceFile: basename(filePath),
      score: scored.score,
      reasons: scored.reasons,
    };

    if (!previous || candidate.score > previous.score) {
      seen.set(normalizedImageUrl, candidate);
    }
  }
}

const candidates = [...seen.values()].sort((a, b) => b.score - a.score || a.imageUrl.localeCompare(b.imageUrl));
mkdirSync(outputRoot, { recursive: true });
writeFileSync(jsonOutputPath, `${JSON.stringify(candidates, null, 2)}\n`);

const headers = ["score", "title", "imageUrl", "pageUrl", "sourceFile", "reasons"];
const csvRows = [
  headers.join(","),
  ...candidates.map((candidate) =>
    [
      candidate.score,
      candidate.title,
      candidate.imageUrl,
      candidate.pageUrl,
      candidate.sourceFile,
      candidate.reasons.join(";"),
    ]
      .map(csvEscape)
      .join(","),
  ),
];
writeFileSync(csvOutputPath, `${csvRows.join("\n")}\n`);

console.log(`Đã tìm thấy ${candidates.length} ứng viên bìa mới.`);
console.log(`JSON: ${jsonOutputPath}`);
console.log(`CSV: ${csvOutputPath}`);
