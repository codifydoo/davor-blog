import type { APIContext } from 'astro';
import { getPosts, type Post } from '@/lib/posts';
import { ogImage } from '@/lib/og';

/** One link-preview image per post, written at build time to /og/<post id>.png. */
export async function getStaticPaths() {
  const posts = await getPosts();
  return posts.map((post) => ({ params: { id: post.id }, props: { post } }));
}

export async function GET({ props }: APIContext<{ post: Post }>) {
  return new Response(await ogImage(props.post), { headers: { 'Content-Type': 'image/png' } });
}
