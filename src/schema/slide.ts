import { z } from "zod";

export const GRID_COLS = 12;
export const GRID_ROWS = 6;

export const richTextSchema = z.object({
  text: z.string(),
  size: z.number().positive().optional(),       // px at 1920x1080 canvas scale
  weight: z.number().min(100).max(900).optional(),
  letterSpacing: z.number().optional(),          // px
  align: z.enum(["left", "center", "right"]).optional(),
  color: z.string().optional(),                  // hex / css color
  gradient: z.object({ from: z.string(), to: z.string(), angle: z.number() }).optional(),
});
export type RichText = z.infer<typeof richTextSchema>;

export const backgroundSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("solid"), color: z.string() }),
  z.object({ type: z.literal("gradient"), from: z.string(), to: z.string(), angle: z.number() }),
  z.object({ type: z.literal("image"), src: z.string() }),
]);
export type Background = z.infer<typeof backgroundSchema>;

export const gridSchema = z.object({
  x: z.number().int().min(0).max(GRID_COLS - 1),
  y: z.number().int().min(0).max(GRID_ROWS - 1),
  w: z.number().int().min(1).max(GRID_COLS),
  h: z.number().int().min(1).max(GRID_ROWS),
})
  .refine((g) => g.x + g.w <= GRID_COLS, { message: "card overflows grid columns" })
  .refine((g) => g.y + g.h <= GRID_ROWS, { message: "card overflows grid rows" });
export type GridRect = z.infer<typeof gridSchema>;

export const iconSourceSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("emoji"), value: z.string() }),
  z.object({ kind: z.literal("image"), src: z.string() }),
]);
export type IconSource = z.infer<typeof iconSourceSchema>;

const cardBase = {
  id: z.string().min(1),
  grid: gridSchema,
  style: z.object({
    background: backgroundSchema.optional(),
    textColor: z.string().optional(),
  }).optional(),
};

export const cardSchema = z.discriminatedUnion("type", [
  z.object({ ...cardBase, type: z.literal("stat"), content: z.object({
    value: richTextSchema,
    caption: richTextSchema,
    prefix: richTextSchema.optional(),
  }) }),
  z.object({ ...cardBase, type: z.literal("headline"), content: z.object({
    text: richTextSchema,
  }) }),
  z.object({ ...cardBase, type: z.literal("image"), content: z.object({
    src: z.string(),
    fit: z.enum(["cover", "contain"]),
    position: z.string().optional(),             // CSS object-position, default "center"
    overlay: z.object({
      text: richTextSchema,
      placement: z.enum(["corner", "center-pill"]),
    }).optional(),
  }) }),
  z.object({ ...cardBase, type: z.literal("icon"), content: z.object({
    icon: iconSourceSchema,
    label: richTextSchema,
    caption: richTextSchema.optional(),
    layout: z.enum(["top", "left", "right"]),
  }) }),
  z.object({ ...cardBase, type: z.literal("hero"), content: z.object({
    title: richTextSchema,
    image: z.string().optional(),
    imagePlacement: z.enum(["behind", "above", "below"]).optional(),
  }) }),
  z.object({ ...cardBase, type: z.literal("list"), content: z.object({
    title: richTextSchema,
    items: z.array(richTextSchema),
    marker: z.enum(["bullet", "none"]),
  }) }),
  z.object({ ...cardBase, type: z.literal("iconRow"), content: z.object({
    items: z.array(z.object({
      icon: iconSourceSchema,
      label: richTextSchema.optional(),
    })).min(1).max(12),
    caption: richTextSchema.optional(),
  }) }),
]);
export type Card = z.infer<typeof cardSchema>;
export type CardType = Card["type"];

export const slideDocumentSchema = z.object({
  version: z.literal(1),
  title: z.string(),
  canvas: z.object({
    format: z.literal("16:9"),
    width: z.number().positive(),
    height: z.number().positive(),
  }),
  theme: z.object({
    mode: z.enum(["light", "dark"]),
    accent: z.string(),
    background: backgroundSchema,
    cardStyle: z.object({ radius: z.number(), gap: z.number() }),
  }),
  cards: z.array(cardSchema),
});
export type SlideDocument = z.infer<typeof slideDocumentSchema>;

export function blankDocument(): SlideDocument {
  return {
    version: 1,
    title: "Untitled slide",
    canvas: { format: "16:9", width: 1920, height: 1080 },
    theme: {
      mode: "dark",
      accent: "#0a84ff",
      background: { type: "solid", color: "#000000" },
      cardStyle: { radius: 24, gap: 24 },
    },
    cards: [],
  };
}
