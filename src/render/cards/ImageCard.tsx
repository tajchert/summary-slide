import type { Card, SlideDocument } from "../../schema/slide";
import { RichText } from "../RichText";

type ImageCardType = Extract<Card, { type: "image" }>;
type ImageOverlay = NonNullable<ImageCardType["content"]["overlay"]>;

const OVERLAY_TEXT_STYLE = { fontSize: 30, fontWeight: 600 } as const;
const SHADOWED_TEXT_STYLE = { ...OVERLAY_TEXT_STYLE, textShadow: "0 1px 8px rgba(0,0,0,0.5)" } as const;

function OverlayLabel({ overlay }: { overlay: ImageOverlay }) {
  if (overlay.placement === "center-pill") return (
    <div style={{ position: "absolute", inset: 0, display: "flex",
      alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "rgba(0,0,0,0.45)", border: "1.5px solid rgba(255,255,255,0.8)",
        borderRadius: 999, padding: "10px 28px", color: "#fff" }}>
        <RichText value={overlay.text} editPath="content.overlay.text"
          baseStyle={OVERLAY_TEXT_STYLE} />
      </div>
    </div>
  );
  if (overlay.placement === "bottom") return (
    <div data-overlay-bottom style={{ position: "absolute", left: 0, right: 0, bottom: 20,
      textAlign: "center", color: "#fff" }}>
      <RichText value={overlay.text} editPath="content.overlay.text"
        baseStyle={SHADOWED_TEXT_STYLE} />
    </div>
  );
  // "corner" — default
  return (
    <div style={{ position: "absolute", left: 24, bottom: 20, color: "#fff" }}>
      <RichText value={overlay.text} editPath="content.overlay.text"
        baseStyle={SHADOWED_TEXT_STYLE} />
    </div>
  );
}

export function ImageCard({ card }: { card: ImageCardType; theme: SlideDocument["theme"] }) {
  const { src, fit, position, overlay } = card.content;
  return (
    <div style={{ position: "relative", height: "100%" }}>
      {src ? (
        <img src={src} alt="" role="img" style={{ width: "100%", height: "100%",
          objectFit: fit, objectPosition: position ?? "center", display: "block" }} />
      ) : (
        <div style={{ height: "100%", display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: 28, opacity: 0.4 }}>Add an image</div>
      )}
      {overlay && <OverlayLabel overlay={overlay} />}
    </div>
  );
}
