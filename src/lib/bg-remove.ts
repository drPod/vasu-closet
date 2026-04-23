/**
 * Cheap in-browser background removal. Samples the four corners, floods
 * inward from each, and punches out pixels whose color is within a
 * tolerance of any sampled background color. Good for product shots on
 * uniform backgrounds; falls back gracefully (returns original blob)
 * when the result looks too aggressive.
 */

const MAX_DIM = 1024;
const COLOR_TOLERANCE = 36; // per-channel
const BG_FRACTION_ABORT = 0.88; // if we'd erase >88% of pixels, bail

function loadImage(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

function colorCloseTo(
  r: number,
  g: number,
  b: number,
  targets: Array<[number, number, number]>,
): boolean {
  for (const [tr, tg, tb] of targets) {
    if (
      Math.abs(r - tr) <= COLOR_TOLERANCE &&
      Math.abs(g - tg) <= COLOR_TOLERANCE &&
      Math.abs(b - tb) <= COLOR_TOLERANCE
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Scan-line flood fill from a seed pixel. Marks visited pixels in `out` with
 * `1` when they belong to the background.
 */
function floodFrom(
  data: Uint8ClampedArray,
  out: Uint8Array,
  width: number,
  height: number,
  startX: number,
  startY: number,
  targets: Array<[number, number, number]>,
) {
  const stack: number[] = [startX, startY];
  while (stack.length) {
    const y = stack.pop()!;
    const x = stack.pop()!;
    if (x < 0 || y < 0 || x >= width || y >= height) continue;
    const idx = y * width + x;
    if (out[idx]) continue;
    const p = idx * 4;
    if (!colorCloseTo(data[p], data[p + 1], data[p + 2], targets)) continue;
    out[idx] = 1;
    stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
  }
}

function sampleBackgroundColors(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): Array<[number, number, number]> {
  const pts: Array<[number, number]> = [
    [2, 2],
    [width - 3, 2],
    [2, height - 3],
    [width - 3, height - 3],
    [Math.floor(width / 2), 2],
    [Math.floor(width / 2), height - 3],
  ];
  const targets: Array<[number, number, number]> = [];
  for (const [x, y] of pts) {
    const i = (y * width + x) * 4;
    targets.push([data[i], data[i + 1], data[i + 2]]);
  }
  return targets;
}

export async function removeBackground(blob: Blob): Promise<Blob> {
  const img = await loadImage(blob);

  // Downsize so flood fill doesn't take forever.
  const scale = Math.min(1, MAX_DIM / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return blob;
  ctx.drawImage(img, 0, 0, width, height);

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const mask = new Uint8Array(width * height);

  const targets = sampleBackgroundColors(data, width, height);

  // Flood from each of the four corners.
  const corners: Array<[number, number]> = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
  ];
  for (const [x, y] of corners) floodFrom(data, mask, width, height, x, y, targets);

  // Abort if we'd erase almost everything — target garment would be gone.
  let marked = 0;
  for (let i = 0; i < mask.length; i++) if (mask[i]) marked++;
  if (marked / mask.length > BG_FRACTION_ABORT) return blob;

  for (let i = 0; i < mask.length; i++) {
    if (mask[i]) data[i * 4 + 3] = 0;
  }
  ctx.putImageData(imageData, 0, 0);

  return new Promise<Blob>((resolve) => {
    canvas.toBlob((b) => resolve(b ?? blob), "image/png");
  });
}
