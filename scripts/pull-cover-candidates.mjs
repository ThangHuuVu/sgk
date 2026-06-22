import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { writeProcessedImage } from "./image-processing.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const candidatePath = join(root, "generated", "cover-candidates.json");
const outputRoot = join(root, "generated", "candidate-images");
const manifestPath = join(root, "generated", "pulled-cover-candidates.json");
const pullLimit = Number(process.env.COVER_PULL_LIMIT ?? 40);
const minScore = Number(process.env.COVER_PULL_MIN_SCORE ?? 7);

function extensionFor(url) {
  try {
    const extension = extname(new URL(url).pathname).toLowerCase();
    if ([".jpg", ".jpeg", ".png", ".webp"].includes(extension)) return extension;
  } catch {
    // Fall through to jpeg.
  }

  return ".jpg";
}

function slugify(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

async function download(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "sgk-archive-candidate-review/0.1",
    },
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) {
    throw new Error(`Không phải ảnh: ${contentType}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

if (!existsSync(candidatePath)) {
  throw new Error("Chưa có generated/cover-candidates.json. Chạy npm run covers:discover trước.");
}

const candidates = JSON.parse(readFileSync(candidatePath, "utf8"))
  .filter((candidate) => candidate.score >= minScore)
  .slice(0, pullLimit);

mkdirSync(outputRoot, { recursive: true });

const pulled = [];
for (const [index, candidate] of candidates.entries()) {
  const extension = extensionFor(candidate.imageUrl);
  const filename = `${String(index + 1).padStart(3, "0")}-${slugify(candidate.title || candidate.sourceFile)}${extension}`;
  const outputPath = join(outputRoot, filename);

  try {
    const buffer = await download(candidate.imageUrl);
    await writeProcessedImage(buffer, outputPath, extension);
    pulled.push({
      ...candidate,
      localFile: `generated/candidate-images/${filename}`,
      status: "downloaded",
    });
    console.log(`Đã kéo ${filename}`);
  } catch (error) {
    pulled.push({
      ...candidate,
      localFile: "",
      status: "failed",
      error: error.message,
    });
    console.warn(`Không kéo được ${candidate.imageUrl}: ${error.message}`);
  }
}

writeFileSync(manifestPath, `${JSON.stringify(pulled, null, 2)}\n`);

const downloaded = pulled.filter((candidate) => candidate.status === "downloaded").length;
console.log(`Hoàn tất kéo ứng viên: ${downloaded}/${pulled.length} ảnh.`);
console.log(`Manifest: ${manifestPath}`);
