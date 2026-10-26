import { lookup } from "node:dns/promises";
import { request } from "node:https";
import ipaddr from "ipaddr.js";
import sharp from "sharp";
import { imageTypes, MAX_IMAGE_BYTES, parseImageUrl } from "./meme-media.ts";

export class ImageInputError extends Error {}

export function isPublicAddress(address: string) {
  try { return ipaddr.process(address).range() === "unicast"; } catch { return false; }
}

export async function resolveImageHost(hostname: string) {
  const host = hostname.replace(/^\[|\]$/g, "");
  const addresses = await lookup(host, { all: true });
  if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) {
    throw new ImageInputError("That image link is not on a public internet server.");
  }
  return addresses[0];
}

// Pin the checked DNS result to the connection, including every redirect hop.
export async function fetchRemoteImage(value: string, redirects = 0, signal = AbortSignal.timeout(15_000)): Promise<Buffer> {
  const url = parseImageUrl(value);
  const address = await resolveImageHost(url.hostname);
  return new Promise((resolve, reject) => {
    const req = request(url, {
      method: "GET",
      agent: false,
      signal,
      headers: { Accept: "image/jpeg,image/png,image/webp", "User-Agent": "HumorProject/1.0" },
      lookup: (_hostname, options, callback) => {
        if (options.all) callback(null, [address]);
        else callback(null, address.address, address.family);
      },
    }, res => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode || 0)) {
        res.destroy();
        if (!res.headers.location || redirects >= 3) return reject(new ImageInputError("Too many image-link redirects."));
        let next: string;
        try { next = new URL(res.headers.location, url).href; } catch { return reject(new ImageInputError("Invalid image redirect.")); }
        fetchRemoteImage(next, redirects + 1, signal).then(resolve, reject);
        return;
      }
      if (res.statusCode !== 200) {
        res.destroy();
        return reject(new ImageInputError("That photo could not be downloaded. Try uploading it instead."));
      }
      const type = res.headers["content-type"]?.split(";")[0].trim().toLowerCase() || "";
      if (!imageTypes.includes(type)) {
        res.destroy();
        return reject(new ImageInputError("The link must point directly to a JPEG, PNG, or WebP photo."));
      }
      if (Number(res.headers["content-length"]) > MAX_IMAGE_BYTES) {
        res.destroy();
        return reject(new ImageInputError("Choose a photo smaller than 3 MB."));
      }
      const chunks: Buffer[] = [];
      let size = 0;
      res.on("data", (chunk: Buffer) => {
        size += chunk.length;
        if (size > MAX_IMAGE_BYTES) {
          reject(new ImageInputError("Choose a photo smaller than 3 MB."));
          res.destroy();
        } else chunks.push(chunk);
      });
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    });
    req.on("error", reject);
    req.end();
  });
}

export async function normalizeImage(bytes: Buffer) {
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) throw new ImageInputError("Choose a photo smaller than 3 MB.");
  try {
    const image = sharp(bytes, { limitInputPixels: 25_000_000, failOn: "warning" });
    const meta = await image.metadata();
    if (!meta.format || !["jpeg", "png", "webp"].includes(meta.format) || (meta.pages || 1) > 1) {
      throw new Error("Unsupported image");
    }
    // Re-encoding strips metadata, including GPS, and rejects disguised non-image files.
    const { data, info } = await image.rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" }).jpeg({ quality: 85 }).toBuffer({ resolveWithObject: true });
    if (data.length > MAX_IMAGE_BYTES) throw new Error("Image too large");
    return { bytes: data, width: info.width, height: info.height };
  } catch {
    throw new ImageInputError("This photo could not be read. Try a different JPEG, PNG, or WebP.");
  }
}

export function parsePhotoCaption(text: string) {
  let result: { caption?: unknown; alt?: unknown };
  try { result = JSON.parse(text); } catch { throw new Error("Invalid AI response"); }
  if (!result || typeof result.caption !== "string" || !result.caption.trim() || result.caption.trim().length > 500
    || typeof result.alt !== "string" || !result.alt.trim() || result.alt.trim().length > 500) {
    throw new Error("Invalid AI response");
  }
  return { caption: result.caption.trim(), alt: result.alt.trim() };
}
