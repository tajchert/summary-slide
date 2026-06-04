import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});

// jsdom does not implement isContentEditable; polyfill it
if (!Object.getOwnPropertyDescriptor(Element.prototype, "isContentEditable")) {
  Object.defineProperty(Element.prototype, "isContentEditable", {
    get() {
      const v = this.getAttribute("contenteditable");
      if (v === "true" || v === "") return true;
      if (v === "false") return false;
      // inherit from parent
      if (this.parentElement) return this.parentElement.isContentEditable;
      return false;
    },
  });
}
