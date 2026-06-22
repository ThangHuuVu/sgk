import sharp from "sharp";

const trimBackground = process.env.IMAGE_TRIM_BACKGROUND ?? "#ffffff";
const trimThreshold = Number(process.env.IMAGE_TRIM_THRESHOLD ?? 18);

export function processedImage(file) {
  return sharp(file, { failOn: "none" })
    .rotate()
    .trim({
      background: trimBackground,
      threshold: trimThreshold,
    });
}

export async function writeProcessedImage(inputFile, outputFile, extension) {
  const image = processedImage(inputFile);

  if (extension === ".jpg" || extension === ".jpeg") {
    await image
      .jpeg({
        quality: 90,
        mozjpeg: true,
      })
      .toFile(outputFile);
    return;
  }

  if (extension === ".png") {
    await image
      .png({
        compressionLevel: 9,
        palette: false,
      })
      .toFile(outputFile);
    return;
  }

  await image.toFile(outputFile);
}
