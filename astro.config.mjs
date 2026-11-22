import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import { visualizersIntegration } from './src/integrations/visualizers';

export default defineConfig({
  site: 'https://tuanhalo.github.io',
  base: '/Algorithm',
  output: 'static',
  integrations: [mdx(), sitemap(), visualizersIntegration()],
  markdown: {
    // `$O(n)$` in lessons and problem feedback renders as math (KaTeX CSS loads in BaseLayout).
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
    shikiConfig: {
      theme: 'github-light',
      wrap: true,
    },
  },
});
