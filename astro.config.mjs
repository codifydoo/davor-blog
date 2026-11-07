// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
import { rehypeAttachments } from './src/lib/rehype-attachments.mjs';

/** Two-colour "receipt printer" syntax theme: keywords blue, strings green, comments grey. */
/** @type {import("shiki").ThemeRegistrationRaw} */
const receiptTheme = {
  name: 'receipt',
  type: 'light',
  colors: { 'editor.background': '#00000000', 'editor.foreground': '#1a1a1a' },
  settings: [
    { settings: { foreground: '#1a1a1a', background: '#00000000' } },
    { scope: ['comment', 'punctuation.definition.comment'], settings: { foreground: '#5c5751' } },
    { scope: ['string.quoted'], settings: { foreground: '#2b6b3a' } },
    { scope: ['keyword', 'keyword.control', 'storage', 'storage.type', 'support.function.builtin', 'constant.language'], settings: { foreground: '#1f4fa3' } },
    { scope: ['keyword.operator'], settings: { foreground: '#1a1a1a' } },
  ],
};

export default defineConfig({
  site: 'https://davor.codify.hr',
  trailingSlash: 'always',
  integrations: [sitemap()],
  markdown: {
    shikiConfig: {
      theme: receiptTheme,
      transformers: [
        {
          // Carry the fence meta (title="x.sh") onto the <pre> for the rehype plugin.
          pre(node) {
            const raw = this.options.meta?.__raw ?? '';
            const m = /(?:^|\s)title=(["'])(.*?)\1/.exec(raw);
            if (m) node.properties['data-title'] = m[2];
          },
        },
      ],
    },
    processor: unified({ rehypePlugins: [rehypeAttachments] }),
  },
  build: { inlineStylesheets: 'always' },
});
