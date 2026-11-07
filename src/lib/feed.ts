import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { SITE } from '../site';
import { readingMinutes, type Post } from './posts';

/** Build an RSS 2.0 response for a list of posts. */
export function feed(context: APIContext, posts: Post[], title: string, feedPath: string, lang = 'en') {
  return rss({
    title,
    description: SITE.description,
    site: context.site!,
    customData: `<language>${lang}</language><atom:link href="${new URL(feedPath, context.site)}" rel="self" type="application/rss+xml"/>`,
    xmlns: { atom: 'http://www.w3.org/2005/Atom' },
    items: posts.map((p) => ({
      title: p.data.title,
      pubDate: p.data.date,
      link: `/posts/${p.id}/`,
      categories: p.data.tags,
      description: p.data.description ?? `${readingMinutes(p)} min read`,
      content: p.rendered?.html,
    })),
  });
}
