export interface EmphasisSegment { text: string; em: boolean }

/**
 * Split `*marked*` runs out of a RichText string. Only used when the field opts
 * in via `emphasis`, so existing docs with literal asterisks render unchanged.
 * Unpaired or empty (`**`) markers stay literal.
 */
export function parseEmphasis(text: string): EmphasisSegment[] {
  const out: EmphasisSegment[] = [];
  const re = /\*([^*]+)\*/g;
  let last = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) out.push({ text: text.slice(last, m.index), em: false });
    out.push({ text: m[1], em: true });
    last = m.index + m[0].length;
  }
  if (last < text.length || out.length === 0) out.push({ text: text.slice(last), em: false });
  return out;
}
