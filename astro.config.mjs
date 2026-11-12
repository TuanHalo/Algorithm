import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { visualizersIntegration } from './src/integrations/visualizers';

export default defineConfig({
  site: 'https://tuanhalo.github.io',
  base: '/Algorithm',
  output: 'static',
  integrations: [mdx(), sitemap(), visualizersIntegration()],
  markdown: {
    shikiConfig: {
      theme: 'github-light',
      wrap: true,
    },
  },
});
