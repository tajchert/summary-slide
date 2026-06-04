import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { toPng } from "html-to-image";
import type { SlideDocument } from "../schema/slide";
import { SlideRenderer } from "../render/SlideRenderer";

/** Render doc off-screen at full canvas size and download a PNG at the given pixelRatio. */
export async function quickExport(doc: SlideDocument, pixelRatio: 2 | 3 = 2): Promise<void> {
  // Two layers: the OUTER carries the off-screen positioning (display:none breaks
  // html-to-image, so it must stay rendered); the INNER is style-clean and is what
  // we capture. html-to-image clones the target node WITH its inline styles — capturing
  // a node that itself has position:fixed;left:-100000px lays the clone out 100,000px
  // outside the canvas and yields a blank/black PNG.
  const outer = document.createElement("div");
  outer.setAttribute("data-export-mount", "");
  outer.style.cssText = "position:fixed;left:-100000px;top:0;";
  const mount = document.createElement("div");
  outer.appendChild(mount);
  document.body.appendChild(outer);
  const root = createRoot(mount);
  try {
    flushSync(() => {
      root.render(createElement(SlideRenderer, { doc }));
    });
    await (document.fonts?.ready ?? Promise.resolve());
    await waitForImages(mount);
    const dataUrl = await toPng(mount, {
      pixelRatio,
      width: doc.canvas.width,
      height: doc.canvas.height,
      backgroundColor: "#000000",
    });
    const a = document.createElement("a");
    a.href = dataUrl;
    const safeTitle = (doc.title || "slide").replace(/[/\\:*?"<>|]+/g, "-").trim() || "slide";
    a.download = `${safeTitle}.png`;
    a.click();
  } finally {
    outer.remove();
    // Unmount in a macrotask: callers (and tests) may inspect the rendered tree
    // synchronously right after resolution; React 18 unmount() clears it eagerly.
    setTimeout(() => root.unmount(), 0);
  }
}

const IMAGE_WAIT_TIMEOUT_MS = 10_000;

async function waitForImages(node: HTMLElement): Promise<void> {
  const imgs = Array.from(node.querySelectorAll("img"));
  const allLoaded = Promise.all(imgs.map((img) =>
    img.complete ? Promise.resolve() :
      new Promise<void>((res) => { img.onload = () => res(); img.onerror = () => res(); })
  ));
  // Never hang the export on a stalled image request.
  await Promise.race([
    allLoaded,
    new Promise<void>((res) => setTimeout(res, IMAGE_WAIT_TIMEOUT_MS)),
  ]);
}
