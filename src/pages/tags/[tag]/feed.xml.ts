import type { APIContext } from 'astro';
import { SITE } from '@/site';
import { getPosts, tagCounts } from '@/lib/posts';
import { feed } from '@/lib/feed';

export async function getStaticPaths() {
  const posts = await getPosts();
  return [...tagCounts(posts).keys()].map((tag) => ({ params: { tag } }));
}

export async function GET(context: APIContext) {
  const tag = context.params.tag!;
  const posts = (await getPosts()).filter((p) => p.data.tags.includes(tag));
  return feed(context, posts, `${SITE.title} · #${tag}`, `/tags/${tag}/feed.xml`);
}
