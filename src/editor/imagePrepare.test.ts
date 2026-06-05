import { describe, expect, it } from "vitest";
import { prepareImageForUpload, MAX_UPLOAD_IMAGE_EDGE, WEBP_UPLOAD_QUALITY } from "./imagePrepare";

function imageFile(name: string, type: string) {
  return new File(["original"], name, { type });
}

function depsFor(width: number, height: number) {
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ({ drawImage: () => undefined }),
    toBlob: (cb: BlobCallback, type?: string, quality?: unknown) => {
      canvas.lastBlobType = type;
      canvas.lastQuality = quality;
      cb(new Blob(["webp"], { type: type ?? "image/webp" }));
    },
    lastBlobType: undefined as string | undefined,
    lastQuality: undefined as unknown,
  };

  return {
    canvas,
    deps: {
      createImageBitmap: async () => ({ width, height, close: () => undefined } as ImageBitmap),
      createCanvas: () => canvas as unknown as HTMLCanvasElement,
    },
  };
}

describe("prepareImageForUpload", () => {
  it("converts JPEG uploads to capped WebP files", async () => {
    const { canvas, deps } = depsFor(4000, 2000);
    const result = await prepareImageForUpload(imageFile("camera.jpg", "image/jpeg"), deps);

    expect(result.name).toBe("camera.webp");
    expect(result.type).toBe("image/webp");
    expect(canvas.width).toBe(MAX_UPLOAD_IMAGE_EDGE);
    expect(canvas.height).toBe(1280);
    expect(canvas.lastBlobType).toBe("image/webp");
    expect(canvas.lastQuality).toBe(WEBP_UPLOAD_QUALITY);
  });

  it("keeps WebP uploads that are already within the resolution cap", async () => {
    const file = imageFile("ready.webp", "image/webp");
    const { canvas, deps } = depsFor(1200, 800);

    const result = await prepareImageForUpload(file, deps);

    expect(result).toBe(file);
    expect(canvas.width).toBe(0);
  });

  it("converts PNG uploads to WebP even when they are under the cap", async () => {
    const { canvas, deps } = depsFor(900, 600);
    const result = await prepareImageForUpload(imageFile("transparent.png", "image/png"), deps);

    expect(result.name).toBe("transparent.webp");
    expect(result.type).toBe("image/webp");
    expect(canvas.width).toBe(900);
    expect(canvas.height).toBe(600);
  });
});
