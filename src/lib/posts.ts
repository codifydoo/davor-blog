import { getCollection, type CollectionEntry } from 'astro:content';
import { SITE } from '../site';

export type Post = CollectionEntry<'posts'>;

export function readingMinutes(post: Post): number {
  if (post.data.minutes) return post.data.minutes;
  const words = (post.body ?? '').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** Published posts, newest first. Drafts are visible only in `astro dev`. */
export async function getPosts(): Promise<Post[]> {
  const all = await getCollection('posts', ({ data }) => import.meta.env.DEV || !data.draft);
  return all.sort((a, b) => b.data.date.getTime() - a.data.date.getTime() || b.data.number - a.data.number);
}

export const pad = (n: number, width: number) => String(n).padStart(width, '0');

/** Every printed date is in the shop's time zone, whatever machine runs the build. */
const parts = (d: Date) => {
  const p = new Intl.DateTimeFormat('en-GB', {
    timeZone: SITE.timeZone, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).formatToParts(d);
  const get = (t: string) => p.find((x) => x.type === t)!.value;
  return { y: get('year'), m: get('month'), d: get('day'), h: get('hour'), min: get('minute') };
};

export function fmtDate(d: Date): string {
  const t = parts(d);
  return `${t.d}.${t.m}.${t.y}`;
}
export function fmtTime(d: Date): string {
  const t = parts(d);
  return `${t.h}:${t.min}`;
}
/** ddmmyyyy hhmm nnnnnn: the human-readable line under a barcode. */
export function stampDigits(d: Date, serial: number): string {
  const t = parts(d);
  return `${t.d}${t.m}${t.y} ${t.h}${t.min} ${pad(serial, 6)}`;
}

export const monthKey = (d: Date) => { const t = parts(d); return `${t.y}-${t.m}`; };

const MONTHS = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];

export interface MonthGroup {
  key: string;
  label: string;      // 11.2026
  monthName: string;  // NOVEMBER
  receiptNo: number;  // 113
  posts: Post[];
  minutes: number;
}

/** Receipt number for a month: counts calendar months from SITE.firstMonth, so numbers never shift. */
export function receiptNumber(key: string): number {
  const [y, m] = key.split('-').map(Number);
  const [fy, fm] = SITE.firstMonth.split('-').map(Number);
  return SITE.receiptBase + (y * 12 + m) - (fy * 12 + fm);
}

/** Posts grouped by month, newest month first. */
export function groupByMonth(posts: Post[]): MonthGroup[] {
  const map = new Map<string, Post[]>();
  for (const p of posts) {
    const k = monthKey(p.data.date);
    map.set(k, [...(map.get(k) ?? []), p]);
  }
  const keys = [...map.keys()].sort();
  return keys
    .map((key) => {
      const ps = map.get(key)!;
      const [y, m] = key.split('-');
      return {
        key,
        label: `${m}.${y}`,
        monthName: MONTHS[Number(m) - 1],
        receiptNo: receiptNumber(key),
        posts: ps,
        minutes: ps.reduce((s, p) => s + readingMinutes(p), 0),
      };
    })
    .reverse();
}

export function tagCounts(posts: Post[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const p of posts) for (const t of p.data.tags) m.set(t, (m.get(t) ?? 0) + 1);
  return new Map([...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}
