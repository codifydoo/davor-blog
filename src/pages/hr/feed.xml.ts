import type { APIContext } from 'astro';
import { SITE } from '../../site';
import { getPosts } from '../../lib/posts';
import { feed } from '../../lib/feed';

export async function GET(context: APIContext) {
  const posts = (await getPosts()).filter((p) => p.data.lang === 'hr');
  return feed(context, posts, `${SITE.title} · hrvatski`, '/hr/feed.xml', 'hr');
}
