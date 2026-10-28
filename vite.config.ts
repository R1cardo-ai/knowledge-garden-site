import { sites } from '@openai/sites-vite-plugin';
import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
import { defineConfig } from 'vite';
import { existsSync, readFileSync } from 'node:fs';

// Fresh clones can run locally without account-specific Sites metadata.
const hostingConfigPath = new URL('./.openai/hosting.json', import.meta.url);
const hostingConfig: { d1?: string | null; r2?: string | null } = existsSync(hostingConfigPath)
  ? JSON.parse(readFileSync(hostingConfigPath, 'utf8'))
  : { d1: null, r2: null };

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  '00000000-0000-4000-8000-000000000000';

const { d1, r2 } = hostingConfig;

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === 'seatbelt';

const localBindingConfig = {
  main: 'vinext/server/fetch-handler',
  compatibility_flags: ['nodejs_compat'],
  d1_databases: d1
    ? [
        {
          binding: d1,
          database_name: 'site-creator-d1',
          database_id: SITE_CREATOR_PLACEHOLDER_DATABASE_ID,
        },
      ]
    : [],
  r2_buckets: r2
    ? [
        {
          binding: r2,
          bucket_name: 'site-creator-r2',
        },
      ]
    : [],
};

// The published static output uses the repository name as its project-page
// prefix. Strip that prefix only in the local Vite server so the same output
// can be previewed from localhost without changing production URLs.
const localProjectPath = '/knowledge-garden-site';
const localStaticPrefixes = ['/ui-kit/templates/', '/ui-kit/assets/', '/ui-kit/fonts/', '/_next/', '/fonts/'];
const localStaticFiles = new Set(['/favicon.svg', '/knowledge-garden-logo.svg', '/terrain-contours.jpg', '/anime-girl-bg.png']);
const localProjectPathAlias = {
  name: 'local-project-path-alias',
  enforce: 'pre' as const,
  configureServer(server: import('vite').ViteDevServer) {
    server.middlewares.use((request, _response, next) => {
      const pathname = request.url?.split('?', 1)[0];
      if (pathname?.startsWith(`${localProjectPath}/`)) {
        const localPath = pathname.slice(localProjectPath.length);
        if (localStaticPrefixes.some((prefix) => localPath.startsWith(prefix)) || localStaticFiles.has(localPath)) {
          request.url = request.url?.slice(localProjectPath.length);
        }
      }
      next();
    });

  },
};

export default defineConfig(async ({ command }) => {
  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= 'false';
  process.env.WRANGLER_LOG_PATH ??= '.wrangler/logs';
  process.env.MINIFLARE_REGISTRY_PATH ??= '.wrangler/registry';

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import('@cloudflare/vite-plugin');

  return {
    css: { postcss: { plugins: [tailwindcss()] } },
    server: isCodexSeatbeltSandbox
      ? { watch: { useFsEvents: false, usePolling: true } }
      : undefined,
    plugins: [
      localProjectPathAlias,
      vinext(),
      sites(),
      ...(command === 'serve' ? [] : [cloudflare({
        viteEnvironment: { name: 'rsc', childEnvironments: ['ssr'] },
        config: localBindingConfig,
      })]),
    ],
  };
});
