import { readFileSync, statSync } from "node:fs";
import { test, expect } from "@playwright/test";

test("create from template, edit text, quick-export a PNG", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Summary Slide")).toBeVisible();

  // open a template
  await page.getByRole("link", { name: "Apple Bento Dark" }).click();
  await expect(page).toHaveURL(/\/edit\?t=apple-bento-dark/);

  // canvas has cards
  await expect(page.locator(".react-grid-item").first()).toBeVisible();

  // inline-edit the hero title
  const hero = page.getByText("iPhone", { exact: true });
  await hero.dblclick();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.type("Phone X");
  await page.keyboard.press("Enter");
  await expect(page.getByText("Phone X")).toBeVisible();

  // add a card from the palette
  await page.getByRole("button", { name: /^Stat$/ }).click();

  // quick export downloads a PNG
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Quick PNG" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.png$/);
  const path = await download.path();
  expect(path).toBeTruthy();
  expect(statSync(path!).size).toBeGreaterThan(10_000);

  // The export must contain actual rendered content, not a uniform fill.
  // Downsample in-browser and count bright pixels (white text, light cards).
  const brightPixels = await page.evaluate(async (b64) => {
    const img = new Image();
    img.src = "data:image/png;base64," + b64;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = 192; c.height = 108;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(img, 0, 0, 192, 108);
    const d = ctx.getImageData(0, 0, 192, 108).data;
    let bright = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] + d[i + 1] + d[i + 2] > 150) bright++;
    }
    return bright;
  }, readFileSync(path!).toString("base64"));
  expect(brightPixels).toBeGreaterThan(100);
});

test("undo reverses an edit", async ({ page }) => {
  await page.goto("/edit");
  await page.getByRole("button", { name: /^Headline$/ }).click();
  await expect(page.getByText("New headline")).toBeVisible();
  await page.keyboard.press("ControlOrMeta+z");
  await expect(page.getByText("New headline")).not.toBeVisible();
});
