import type { APIContext } from 'astro';
import { SITE } from '../site';
import { getPosts } from '../lib/posts';
import { feed } from '../lib/feed';

export async function GET(context: APIContext) {
  return feed(context, await getPosts(), SITE.title, '/feed.xml');
}
