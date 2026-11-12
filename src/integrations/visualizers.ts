import type { AstroIntegration } from 'astro';
import { cp, mkdir, readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { IncomingMessage, ServerResponse } from 'node:http';

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

function createStaticMiddleware(sourceDir: string, urlPrefixes: readonly string[]) {
  const resolvedRoot = resolve(sourceDir);

  return async (
    req: IncomingMessage,
    res: ServerResponse,
    next: () => void,
  ): Promise<void> => {
    const rawUrl = req.url?.split('?')[0] ?? '';
    const matchedPrefix = urlPrefixes.find((prefix) => rawUrl.startsWith(prefix));
    if (!matchedPrefix) {
      next();
      return;
    }

    const relativePath = decodeURIComponent(rawUrl.slice(matchedPrefix.length)).replace(/^\/+/, '');
    const candidatePath = normalize(join(resolvedRoot, relativePath));
    if (candidatePath !== resolvedRoot && !candidatePath.startsWith(`${resolvedRoot}${sep}`)) {
      res.statusCode = 403;
      res.end('Forbidden');
      return;
    }

    try {
      const info = await stat(candidatePath);
      if (!info.isFile()) {
        next();
        return;
      }
      const ext = extname(candidatePath).toLowerCase();
      res.setHeader('Content-Type', MIME_TYPES[ext] ?? 'application/octet-stream');
      const content = await readFile(candidatePath);
      res.end(content);
    } catch {
      next();
    }
  };
}

/**
 * Serves root-level `visualizers/` during `astro dev` and copies it into
 * `dist/visualizers/` during `astro build` so iframes resolve cleanly on GitHub Pages.
 */
export function visualizersIntegration(): AstroIntegration {
  let rootDir = process.cwd();
  let basePath = '/';

  return {
    name: 'algorithm-hub-visualizers',
    hooks: {
      'astro:config:done': ({ config }) => {
        rootDir = fileURLToPath(config.root);
        basePath = config.base.replace(/\/+$/, '');
      },
      'astro:server:setup': ({ server }) => {
        const sourceDir = join(rootDir, 'visualizers');
        // Vite/Astro devBaseMiddleware strips `config.base` from `req.url` before downstream middlewares run
        const prefixes = basePath && basePath !== '/'
          ? [`${basePath}/visualizers/`, '/visualizers/']
          : ['/visualizers/'];
        server.middlewares.use(createStaticMiddleware(sourceDir, prefixes));
      },
      'astro:build:done': async ({ dir }) => {
        const sourceDir = join(rootDir, 'visualizers');
        const targetDir = join(fileURLToPath(dir), 'visualizers');
        await mkdir(targetDir, { recursive: true });
        await cp(sourceDir, targetDir, { recursive: true });
      },
    },
  };
}

