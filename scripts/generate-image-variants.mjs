import { mkdirSync, readdirSync } from "node:fs";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { processedImage } from "./image-processing.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const imageRoot = join(root, "images");
const outputRoot = join(root, "generated", "r2-variants");
const widths = (process.env.IMAGE_VARIANT_WIDTHS ?? "220,440,768")
  .split(",")
  .map((width) => Number(width.trim()))
  .filter(Boolean);

function listFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? listFiles(path) : [path];
  });
}

function outputPathFor(file, width) {
  const relativePath = relative(imageRoot, file);
  const extension = extname(relativePath);
  const withoutExtension = relativePath.slice(0, -extension.length);
  return join(outputRoot, String(width), `${withoutExtension}.webp`);
}

const files = listFiles(imageRoot);
let completed = 0;

for (const file of files) {
  const image = processedImage(file);

  await Promise.all(
    widths.map(async (width) => {
      const outputPath = outputPathFor(file, width);
      mkdirSync(dirname(outputPath), { recursive: true });

      await image
        .clone()
        .resize({
          width,
          withoutEnlargement: true,
        })
        .webp({
          quality: 78,
          effort: 4,
          smartSubsample: true,
        })
        .toFile(outputPath);
    }),
  );

  completed += 1;
  if (completed % 50 === 0) {
    console.log(`Đã tạo biến thể WebP cho ${completed} ảnh...`);
  }
}

console.log(`Hoàn tất WebP: ${files.length} ảnh, ${widths.length} kích thước.`);
