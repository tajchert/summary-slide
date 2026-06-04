import { BrowserRouter, Routes, Route } from "react-router";
import { StartPage } from "./pages/StartPage";
import { EditorPage } from "./editor/EditorPage";
import { SharePage } from "./pages/SharePage";
import { RenderPage } from "./pages/RenderPage";
import { NotFoundPage } from "./pages/NotFoundPage";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<StartPage />} />
        <Route path="/edit" element={<EditorPage />} />
        <Route path="/s/:id" element={<SharePage />} />
        <Route path="/render/:id" element={<RenderPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
