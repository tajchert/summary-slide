import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";
import { SharePage } from "./SharePage";
import { kitchenSinkDocument } from "../render/fixtures";

const renderAt = (path: string) => render(
  <MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route path="/s/:id" element={<SharePage />} />
    </Routes>
  </MemoryRouter>
);

describe("SharePage", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("fetches and renders the shared slide with an open-in-editor link", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(kitchenSinkDocument()), { status: 200 }) as never
    );
    renderAt("/s/abc12345");
    expect(await screen.findByText("48MP")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open in editor/i })).toBeInTheDocument();
  });

  it("shows not-found for missing slides", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("{}", { status: 404 }) as never
    );
    renderAt("/s/missing1");
    expect(await screen.findByText(/slide not found/i)).toBeInTheDocument();
  });
});
