import { describe, it, expect } from "vitest";
import { parseEmphasis } from "./emphasis";

describe("parseEmphasis", () => {
  it("splits *marked* runs into emphasized segments", () => {
    expect(parseEmphasis("The most *powerful* Surface *ever*")).toEqual([
      { text: "The most ", em: false },
      { text: "powerful", em: true },
      { text: " Surface ", em: false },
      { text: "ever", em: true },
    ]);
  });

  it("returns plain text as a single segment", () => {
    expect(parseEmphasis("Hybrid intelligence")).toEqual([{ text: "Hybrid intelligence", em: false }]);
  });

  it("leaves an unpaired asterisk literal", () => {
    expect(parseEmphasis("Up to 2x*")).toEqual([{ text: "Up to 2x*", em: false }]);
    expect(parseEmphasis("*Coming to* Copilot*")).toEqual([
      { text: "Coming to", em: true },
      { text: " Copilot*", em: false },
    ]);
  });

  it("ignores empty pairs", () => {
    expect(parseEmphasis("a ** b")).toEqual([{ text: "a ** b", em: false }]);
  });
});
