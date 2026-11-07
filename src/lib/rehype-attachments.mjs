import { visit } from 'unist-util-visit';

const CLIP_ICON = {
  type: 'element', tagName: 'svg',
  properties: { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', ariaHidden: 'true' },
  children: [
    { type: 'element', tagName: 'circle', properties: { cx: 6, cy: 6, r: 3 }, children: [] },
    { type: 'element', tagName: 'circle', properties: { cx: 6, cy: 18, r: 3 }, children: [] },
    { type: 'element', tagName: 'path', properties: { d: 'M20 4L8.1 15.9M14.5 14.5L20 20M8.1 8.1L12 12' }, children: [] },
  ],
};

/** Wraps each fenced code block in a receipt "attachment" figure: ATTACHMENT n/N · filename. */
export function rehypeAttachments() {
  return (tree) => {
    const pres = [];
    visit(tree, 'element', (node, index, parent) => {
      if (node.tagName === 'pre' && parent && typeof index === 'number') pres.push({ node, index, parent });
    });
    pres.forEach(({ node, index, parent }, i) => {
      const title = node.properties?.['data-title'] ?? node.properties?.dataLanguage ?? 'code';
      delete node.properties['data-title'];
      const label = `ATTACHMENT ${i + 1}/${pres.length} · ${title}`;
      parent.children[index] = {
        type: 'element', tagName: 'figure', properties: { className: ['attachment'] },
        children: [
          { type: 'element', tagName: 'figcaption', properties: {}, children: [CLIP_ICON, { type: 'element', tagName: 'span', properties: {}, children: [{ type: 'text', value: label }] }] },
          node,
        ],
      };
    });
  };
}
