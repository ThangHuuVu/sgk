import { mkdirSync, readdirSync } from "node:fs";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { writeProcessedImage } from "./image-processing.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const imageRoot = join(root, "images");
const outputRoot = join(root, "generated", "r2-images");

function listFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? listFiles(path) : [path];
  });
}

function outputPathFor(file) {
  return join(outputRoot, relative(imageRoot, file));
}

const files = listFiles(imageRoot);
let completed = 0;

for (const file of files) {
  const outputPath = outputPathFor(file);
  mkdirSync(dirname(outputPath), { recursive: true });
  await writeProcessedImage(file, outputPath, extname(file).toLowerCase());

  completed += 1;
  if (completed % 50 === 0) {
    console.log(`Đã xử lý nền trắng cho ${completed} ảnh...`);
  }
}

console.log(`Hoàn tất xử lý ảnh gốc: ${files.length} ảnh.`);
