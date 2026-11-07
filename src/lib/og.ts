import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import opentype from 'opentype.js';
import { SITE } from '../site';
import { fmtDate, pad, readingMinutes, type Post } from './posts';

/** Link-preview card for a post: 1200x630, the size LinkedIn, X and Slack crop to. */
export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

const fontPkg = dirname(createRequire(import.meta.url).resolve('@fontsource/ibm-plex-mono/package.json'));
const fontDir = join(fontPkg, 'files');
const font = (name: string, subset: string, weight: 400 | 700) => ({
  name, weight, style: 'normal' as const,
  data: readFileSync(join(fontDir, `ibm-plex-mono-${subset}-${weight}-normal.woff`)),
});
// latin-ext carries most Croatian letters (č, đ, š, ž). Satori only falls back across family
// names, not across files that share one, so it is its own family listed second in fontFamily.
const fonts = [
  font('Plex', 'latin', 400), font('Plex', 'latin', 700),
  font('PlexExt', 'latin-ext', 400), font('PlexExt', 'latin-ext', 700),
];

/** Glyphs the font files really contain. Fontsource's unicode-range lists are much wider. */
const parsed = fonts.map(({ data }) => opentype.parse(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)));
// Satori lays these out as spacing, so they need no glyph.
// Explicit list: \s would also admit U+000B, U+1680 and U+2028, which satori draws as boxes.
const SPACING = /^[ \t\n\r\u00A0\u2000-\u200D\u202F\u205F\u2060\u3000\uFEFF]$/u;
const drawable = (ch: string) => SPACING.test(ch) || parsed.some((f) => f.charToGlyphIndex(ch) > 0);

/** Satori draws a missing glyph as an empty box without a word, so stop the build instead. */
function assertDrawable(post: Post, text: string) {
  const missing = [...new Set([...text].filter((ch) => !drawable(ch)))];
  if (missing.length === 0) return;
  const list = missing.map((ch) => `"${ch}" (U+${ch.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')})`).join(', ');
  throw new Error(`Link-preview image for post "${post.id}": IBM Plex Mono (latin, latin-ext) has no glyph for ${list}. Change the title or tags, or add a font in src/lib/og.ts.`);
}

/** Past this many characters the title would run over the footer, so it ends in an ellipsis. */
const MAX_TITLE = 140;
const clip = (text: string) => {
  const chars = [...text];
  return chars.length <= MAX_TITLE ? text : `${chars.slice(0, MAX_TITLE - 1).join('').trimEnd()}…`;
};

const PAPER = '#f4efe3';
const INK = '#1a1a1a';
const SOFT = '#5c5751';

type Node = { type: string; props: Record<string, unknown> };
const h = (type: string, style: Record<string, unknown>, ...children: (Node | string)[]): Node =>
  ({ type, props: { style, children } });

/** A row of paper teeth, pointing up (top edge) or down (bottom edge). */
function teeth(width: number, up: boolean): Node {
  const w = 26, d = 13;
  let path = up ? `M0 ${d}` : 'M0 0';
  for (let x = 0; x < width; x += w) path += up ? ` L${x + w / 2} 0 L${x + w} ${d}` : ` L${x + w / 2} ${d} L${x + w} 0`;
  path += up ? ` L${width} ${d} Z` : ` L${width} 0 Z`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${d}"><path d="${path}" fill="${PAPER}"/></svg>`;
  // Overlap the paper by 1px so no anti-aliased seam shows where the two rotated pieces meet.
  const style = up ? { marginBottom: -1 } : { marginTop: -1 };
  return { type: 'img', props: { src: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`, width, height: d, style } };
}

function titleSize(title: string): number {
  if (title.length <= 36) return 66;
  if (title.length <= 60) return 56;
  return 46;
}

export async function ogImage(post: Post): Promise<Uint8Array> {
  const { number, date } = post.data;
  // NFC first: a decomposed č (c + combining caron) has no glyph, the composed one does.
  const title = clip(post.data.title.normalize('NFC'));
  const tags = post.data.tags.map((t) => t.normalize('NFC'));
  const meta = [fmtDate(date), `${readingMinutes(post)} MIN`, tags.join(', ')].filter(Boolean).join(' · ').toUpperCase();
  const receiptWidth = 1040;
  assertDrawable(post, `${SITE.name} ${title} ${meta}`);

  const tree = h('div', {
    width: OG_WIDTH, height: OG_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#1c1e24', fontFamily: 'Plex, PlexExt', color: INK,
  },
    h('div', { display: 'flex', flexDirection: 'column', width: receiptWidth, transform: 'rotate(-1.2deg)' },
      teeth(receiptWidth, true),
      h('div', {
        display: 'flex', flexDirection: 'column', backgroundColor: PAPER, padding: '28px 56px 30px', height: 496,
      },
        h('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' },
          h('div', { display: 'flex', alignItems: 'baseline' },
            h('div', { fontSize: 38, fontWeight: 700, letterSpacing: 10 }, SITE.name),
            h('div', { fontSize: 20, color: SOFT, marginLeft: 22 }, 'personal blog · davor.codify.hr'),
          ),
          h('div', { fontSize: 22, letterSpacing: 2 }, `ITEM #${pad(number, 4)}`),
        ),
        h('div', { display: 'flex', borderTop: `3px dashed ${INK}`, marginTop: 18 }),
        h('div', {
          display: 'flex', flexGrow: 1, flexShrink: 1, minHeight: 0, overflow: 'hidden', alignItems: 'center', paddingRight: 150,
          fontSize: titleSize(title), fontWeight: 700, lineHeight: 1.15,
        },
          // Clamp from the top: the box centres its text, so overflow alone would hide the first line.
          h('div', { display: 'block', lineClamp: 6 }, title),
        ),
        h('div', { display: 'flex', borderTop: `3px dashed ${INK}` }),
        h('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 18 },
          h('div', { fontSize: 20, color: SOFT, letterSpacing: 1.5 }, meta),
          h('div', { fontSize: 20, fontWeight: 700, letterSpacing: 2 }, 'DAVOR.CODIFY.HR'),
        ),
        h('div', {
          position: 'absolute', right: 52, top: 104, width: 150, height: 150, display: 'flex',
          alignItems: 'center', justifyContent: 'center', borderRadius: 75, border: `4px solid ${SITE.accent}`,
          color: SITE.accent, fontSize: 30, fontWeight: 700, letterSpacing: 5, transform: 'rotate(-14deg)', opacity: 0.88,
        }, 'READ'),
      ),
      teeth(receiptWidth, false),
    ),
  );

  const svg = await satori(tree as Parameters<typeof satori>[0], { width: OG_WIDTH, height: OG_HEIGHT, fonts });
  return new Uint8Array(new Resvg(svg, { fitTo: { mode: 'width', value: OG_WIDTH } }).render().asPng());
}
