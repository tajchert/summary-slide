export const MAX_UPLOAD_IMAGE_EDGE = 2560;
export const WEBP_UPLOAD_QUALITY = 0.82;

type CanvasLike = Pick<HTMLCanvasElement, "width" | "height" | "getContext" | "toBlob">;

export interface ImagePrepareDeps {
  createImageBitmap: (file: File) => Promise<ImageBitmap>;
  createCanvas: () => CanvasLike;
}

const CONVERTIBLE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function browserDeps(): ImagePrepareDeps | null {
  if (typeof createImageBitmap !== "function") return null;
  if (typeof document === "undefined") return null;
  return {
    createImageBitmap,
    createCanvas: () => document.createElement("canvas"),
  };
}

function targetSize(width: number, height: number) {
  const longEdge = Math.max(width, height);
  if (longEdge <= MAX_UPLOAD_IMAGE_EDGE) return { width, height };
  const scale = MAX_UPLOAD_IMAGE_EDGE / longEdge;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

function webpName(name: string) {
  return name.replace(/\.[^.]+$/u, "") + ".webp";
}

function canvasToWebp(canvas: CanvasLike) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Image conversion failed"));
    }, "image/webp", WEBP_UPLOAD_QUALITY);
  });
}

export async function prepareImageForUpload(file: File, deps = browserDeps()): Promise<File> {
  if (!CONVERTIBLE_TYPES.has(file.type)) return file;
  if (!deps) return file;

  const bitmap = await deps.createImageBitmap(file);
  try {
    const size = targetSize(bitmap.width, bitmap.height);
    if (file.type === "image/webp" && size.width === bitmap.width && size.height === bitmap.height) return file;

    const canvas = deps.createCanvas();
    canvas.width = size.width;
    canvas.height = size.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, size.width, size.height);

    const blob = await canvasToWebp(canvas);
    return new File([blob], webpName(file.name), { type: "image/webp" });
  } finally {
    bitmap.close?.();
  }
}
