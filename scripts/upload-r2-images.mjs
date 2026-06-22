import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, extname, join, relative } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const imageRoot = join(root, "generated", "r2-images");
const mapPath = join(root, "r2-map.json");
const bucket = process.env.R2_BUCKET ?? "sgk-covers";
const publicBaseUrl = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");
const forceUpload = process.env.R2_FORCE_UPLOAD === "1";

if (!publicBaseUrl) {
  throw new Error("Thiếu R2_PUBLIC_URL, ví dụ: https://covers.example.com");
}

function contentType(path) {
  const ext = extname(path).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  return "application/octet-stream";
}

function uploadWithWrangler(pathname, file) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "npx",
      [
        "wrangler",
        "r2",
        "object",
        "put",
        `${bucket}/${pathname}`,
        "--file",
        file,
        "--content-type",
        contentType(file),
        "--cache-control",
        "public, max-age=31536000, immutable",
        "--remote",
      ],
      {
        cwd: root,
        env: process.env,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk;
    });
    child.stderr.on("data", (chunk) => {
      output += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(output || `wrangler r2 object put exited ${code}`));
        return;
      }
      resolve(`${publicBaseUrl}/${pathname}`);
    });
  });
}

async function uploadWithRetry(pathname, file) {
  const attempts = Number(process.env.R2_UPLOAD_ATTEMPTS ?? 4);

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await uploadWithWrangler(pathname, file);
    } catch (error) {
      if (attempt === attempts) {
        throw error;
      }

      const waitMs = 1500 * attempt;
      console.warn(`Thử lại ${pathname} sau lỗi upload (${attempt}/${attempts})...`);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }
}

function listFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? listFiles(path) : [path];
  });
}

const existingMap = existsSync(mapPath)
  ? JSON.parse(readFileSync(mapPath, "utf8"))
  : {};
const nextMap = { ...existingMap };
const files = listFiles(imageRoot);
let uploaded = 0;
let cursor = 0;
const concurrency = Number(process.env.R2_UPLOAD_CONCURRENCY ?? 3);

async function worker() {
  while (cursor < files.length) {
    const file = files[cursor];
    cursor += 1;
    const pathname = `images/${relative(imageRoot, file)}`;

    if (nextMap[pathname] && !forceUpload) continue;

    nextMap[pathname] = await uploadWithRetry(pathname, file);
    uploaded += 1;

    if (uploaded % 25 === 0) {
      writeFileSync(mapPath, `${JSON.stringify(nextMap, null, 2)}\n`);
      console.log(`Đã tải ${uploaded} ảnh lên R2...`);
    }
  }
}

await Promise.all(Array.from({ length: concurrency }, worker));

mkdirSync(dirname(mapPath), { recursive: true });
writeFileSync(mapPath, `${JSON.stringify(nextMap, null, 2)}\n`);

console.log(`Hoàn tất R2: ${files.length} ảnh, ${uploaded} ảnh mới.`);
