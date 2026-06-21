import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const source = join(root, "images");
const target = join(root, "public", "images");

if (!existsSync(source)) {
  throw new Error("Không tìm thấy thư mục images.");
}

mkdirSync(dirname(target), { recursive: true });
cpSync(source, target, { recursive: true, force: true });

console.log("Đã đồng bộ images/ sang public/images/");
