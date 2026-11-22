// Entry program for the make.fun news-image-20261122 competition.
//
// Copies the pre-rendered poster (entry.png, beside this file) to
// $MAKEFUN_OUTPUT_DIR/entry.png (default ./out) and self-checks the
// copy against the competition gate: whole PNG, at most 1024x1024
// pixels, at most 1 MiB. Fails loudly if any check breaches the gate.
//
// Node 22, standard library only, no network. Deterministic: both
// runs write byte-identical output. Never removes the output
// directory itself; it only writes the file inside it.

import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SOURCE = join(HERE, "entry.png");
const MAX_BYTES = 1_048_576;
const MAX_DIM = 1024;
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function pngDimensions(data: Buffer): [number, number] {
  if (data.length < 33 || !data.subarray(0, 8).equals(PNG_MAGIC)) {
    throw new Error("not a PNG file (bad magic bytes)");
  }
  // IHDR: length (4) + type "IHDR" (4) + width (4) + height (4).
  if (data.toString("ascii", 12, 16) !== "IHDR") {
    throw new Error("not a PNG file (missing IHDR chunk)");
  }
  return [data.readUInt32BE(16), data.readUInt32BE(20)];
}

function pngIsWhole(data: Buffer): boolean {
  // IEND chunk: 4-byte length (0) + "IEND" + 4-byte CRC = 12 bytes.
  return (
    data.length >= 12 &&
    data.readUInt32BE(data.length - 12) === 0 &&
    data.toString("ascii", data.length - 8, data.length - 4) === "IEND"
  );
}

function main(): void {
  const outDir = process.env.MAKEFUN_OUTPUT_DIR || join(HERE, "out");
  const outPath = join(outDir, "entry.png");
  mkdirSync(outDir, { recursive: true });
  copyFileSync(SOURCE, outPath);

  const data = readFileSync(outPath);
  if (data.length > MAX_BYTES) {
    throw new Error(
      `entry.png is ${data.length} bytes, over the ${MAX_BYTES} byte cap`,
    );
  }
  const [width, height] = pngDimensions(data);
  if (width > MAX_DIM || height > MAX_DIM) {
    throw new Error(
      `entry.png is ${width}x${height}, over the ${MAX_DIM}x${MAX_DIM} cap`,
    );
  }
  if (!pngIsWhole(data)) {
    throw new Error("entry.png is truncated (no complete IEND chunk)");
  }
  console.log(`wrote ${outPath} (${width}x${height}, ${data.length} bytes)`);
}

main();
