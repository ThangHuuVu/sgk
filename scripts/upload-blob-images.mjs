import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const imageRoot = join(root, "images");
const mapPath = join(root, "blob-map.json");

function uploadWithCli(pathname, file) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "vercel",
      [
        "blob",
        "put",
        file,
        "--pathname",
        pathname,
        "--force",
        "true",
      ],
      {
        cwd: root,
        env: {
          ...process.env,
          BLOB_READ_WRITE_TOKEN: "",
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr || stdout || `vercel blob put exited ${code}`));
        return;
      }

      const output = `${stdout}\n${stderr}`;
      const match = output.match(/https:\/\/\S+\.public\.blob\.vercel-storage\.com\/\S+/);
      if (!match) {
        reject(new Error(`Không đọc được URL Blob từ output:\n${output}`));
        return;
      }

      resolve(match[0]);
    });
  });
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
const concurrency = Number(process.env.BLOB_UPLOAD_CONCURRENCY ?? 6);

async function worker() {
  while (cursor < files.length) {
    const file = files[cursor];
    cursor += 1;
    const pathname = relative(root, file);

    if (nextMap[pathname]) {
      continue;
    }

    nextMap[pathname] = await uploadWithCli(pathname, file);
    uploaded += 1;

    if (uploaded % 25 === 0) {
      writeFileSync(mapPath, `${JSON.stringify(nextMap, null, 2)}\n`);
      console.log(`Đã tải ${uploaded} ảnh mới lên Blob...`);
    }
  }
}

await Promise.all(Array.from({ length: concurrency }, worker));

mkdirSync(dirname(mapPath), { recursive: true });
writeFileSync(mapPath, `${JSON.stringify(nextMap, null, 2)}\n`);

console.log(`Hoàn tất Blob: ${files.length} ảnh, ${uploaded} ảnh mới.`);
