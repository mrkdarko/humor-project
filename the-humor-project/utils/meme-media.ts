export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
export const imageTypes = ["image/jpeg", "image/png", "image/webp"];
export const mediaFilters = ["all", "text", "photos"] as const;
export type MediaFilter = (typeof mediaFilters)[number];

export function parseImageUrl(value: string) {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error("Use a direct HTTPS image link."); }
  if (value.length > 2048 || url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) {
    throw new Error("Use a public HTTPS image link without a password or custom port.");
  }
  url.hash = "";
  return url;
}

export function validateMedia(form: FormData) {
  const kind = form.get("post_type") || "text";
  if (kind !== "text" && kind !== "photo") return { error: "Choose text or photo." } as const;
  if (kind === "text") return { data: { kind } } as const;
  if (form.get("mode") !== "publish") return { error: "Photo memes must be generated and published." } as const;
  const source = form.get("image_source");
  if (source === "upload") {
    const file = form.get("image_file");
    if (!(file instanceof File) || !file.size) return { error: "Choose a photo first." } as const;
    if (file.size > MAX_IMAGE_BYTES) return { error: "Choose a photo smaller than 3 MB." } as const;
    if (!imageTypes.includes(file.type)) return { error: "Choose a JPEG, PNG, or WebP photo." } as const;
    return { data: { kind, source, file } } as const;
  }
  if (source === "link") {
    const value = form.get("image_url");
    try {
      const url = parseImageUrl(typeof value === "string" ? value.trim() : "");
      return { data: { kind, source, url: url.href } } as const;
    } catch (error) {
      return { error: (error as Error).message } as const;
    }
  }
  return { error: "Choose an upload or image link." } as const;
}
