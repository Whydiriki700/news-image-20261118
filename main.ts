// The World in One Image, Wednesday 18 November 2026.
// Entry program for the make.fun news-image-20261118 bounty (Node 22, standard library only).
//
// entry.png beside this file is the entry: a one-page newspaper that sums up the day the
// APEC summit put Trump, Xi and Putin in one room in Shenzhen. This program proves the
// picture obeys the competition's limits, then hands it in as /output/entry.png.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const MAX_BYTES = 1_048_576; // 1 MiB, the competition's file size cap
const MAX_SIDE = 1_024; // no side of the picture may exceed 1024 px

const image = readFileSync(new URL('./entry.png', import.meta.url));

if (image.length > MAX_BYTES) {
  throw new Error(`entry image is ${image.length} bytes, over the ${MAX_BYTES} byte limit`);
}

// The file keeps the name entry.png whatever it holds, so the real format
// is read from the magic bytes, never from the name.
function pngSize(buf) {
  // PNG: an 8 byte signature, then IHDR carries width and height as big-endian uint32.
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (!signature.every((byte, i) => buf[i] === byte)) return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), kind: 'PNG' };
}

function jpegSize(buf) {
  // JPEG: opens FF D8, then walks segments until a SOF0 or SOF2 frame header gives the size.
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < buf.length) {
    if (buf[offset] !== 0xff) return null;
    const marker = buf[offset + 1];
    const length = buf.readUInt16BE(offset + 2);
    if (marker === 0xc0 || marker === 0xc2) {
      return { width: buf.readUInt16BE(offset + 7), height: buf.readUInt16BE(offset + 5), kind: 'JPEG' };
    }
    offset += 2 + length;
  }
  return null;
}

const size = pngSize(image) ?? jpegSize(image);
if (!size) throw new Error('entry image is neither a whole PNG nor a whole JPEG');
if (size.width > MAX_SIDE || size.height > MAX_SIDE) {
  throw new Error(`entry image is ${size.width}x${size.height}, over the ${MAX_SIDE} pixel limit`);
}

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
mkdirSync(outDir, { recursive: true });
const target = join(outDir, 'entry.png');
writeFileSync(target, image);

// Read the handed-in copy back and prove it is the same picture, byte for byte:
// the judge scores exactly these bytes, so a short or altered copy fails loudly here.
const digest = (buf) => createHash('sha256').update(buf).digest('hex');
const handedIn = readFileSync(target);
if (handedIn.length !== image.length || digest(handedIn) !== digest(image)) {
  throw new Error('the handed-in entry.png does not match the source image');
}
console.log(`handed in entry.png: ${size.kind} ${size.width}x${size.height}, ${image.length} bytes, sha256 ${digest(image).slice(0, 12)}`);
