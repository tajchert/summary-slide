import type { Card, SlideDocument } from "../../schema/slide";
import { RichText } from "../RichText";

type ImageCardType = Extract<Card, { type: "image" }>;

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
      {overlay && (overlay.placement === "center-pill" ? (
        <div style={{ position: "absolute", inset: 0, display: "flex",
          alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "rgba(0,0,0,0.45)", border: "1.5px solid rgba(255,255,255,0.8)",
            borderRadius: 999, padding: "10px 28px", color: "#fff" }}>
            <RichText value={overlay.text} editPath="content.overlay.text"
              baseStyle={{ fontSize: 30, fontWeight: 600 }} />
          </div>
        </div>
      ) : (
        <div style={{ position: "absolute", left: 24, bottom: 20, color: "#fff" }}>
          <RichText value={overlay.text} editPath="content.overlay.text"
            baseStyle={{ fontSize: 30, fontWeight: 600, textShadow: "0 1px 8px rgba(0,0,0,0.5)" }} />
        </div>
      ))}
    </div>
  );
}
