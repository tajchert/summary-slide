import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { toPng } from "html-to-image";
import type { SlideDocument } from "../schema/slide";
import { SlideRenderer } from "../render/SlideRenderer";

/** Render doc off-screen at full canvas size and download a PNG at the given pixelRatio. */
export async function quickExport(doc: SlideDocument, pixelRatio: 2 | 3 = 2): Promise<void> {
  const mount = document.createElement("div");
  mount.setAttribute("data-export-mount", "");
  // off-screen but rendered (display:none breaks html-to-image)
  mount.style.cssText = "position:fixed;left:-100000px;top:0;";
  document.body.appendChild(mount);
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
    a.download = `${doc.title || "slide"}.png`;
    a.click();
  } finally {
    mount.remove();
  }
}

async function waitForImages(node: HTMLElement): Promise<void> {
  const imgs = Array.from(node.querySelectorAll("img"));
  await Promise.all(imgs.map((img) =>
    img.complete ? Promise.resolve() :
      new Promise<void>((res) => { img.onload = () => res(); img.onerror = () => res(); })
  ));
}
