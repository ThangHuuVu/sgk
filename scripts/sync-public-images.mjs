import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const processedSource = join(root, "generated", "r2-images");
const originalSource = join(root, "images");
const source = existsSync(processedSource) ? processedSource : originalSource;
const target = join(root, "public", "images");

if (!existsSync(source)) {
  throw new Error("Không tìm thấy thư mục ảnh đã xử lý hoặc images.");
}

mkdirSync(dirname(target), { recursive: true });
cpSync(source, target, { recursive: true, force: true });

console.log("Đã đồng bộ ảnh sang public/images/");
