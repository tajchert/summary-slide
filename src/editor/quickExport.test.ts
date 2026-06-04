import { describe, it, expect, vi } from "vitest";

vi.mock("html-to-image", () => ({
  toPng: vi.fn(async () => "data:image/png;base64,AAAA"),
}));

import { toPng } from "html-to-image";
import { quickExport } from "./quickExport";
import { kitchenSinkDocument } from "../render/fixtures";

describe("quickExport", () => {
  it("renders off-screen at full size, calls toPng with pixelRatio, downloads, cleans up", async () => {
    const doc = kitchenSinkDocument();
    const clicks: string[] = [];
    const origClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () { clicks.push(this.download); };

    await quickExport(doc, 2);

    HTMLAnchorElement.prototype.click = origClick;
    expect(toPng).toHaveBeenCalledOnce();
    const [node, opts] = vi.mocked(toPng).mock.calls[0];
    expect((node as HTMLElement).querySelector("[data-slide-root]")).toBeTruthy();
    expect(opts).toMatchObject({ pixelRatio: 2, width: 1920, height: 1080 });
    expect(clicks[0]).toBe("Kitchen sink.png");
    expect(document.querySelector("[data-export-mount]")).toBeNull(); // cleaned up
  });
});
