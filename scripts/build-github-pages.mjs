import { spawnSync } from 'node:child_process';
const result=spawnSync(process.execPath,['scripts/sync-archive-data.mjs'],{stdio:'inherit'});
if(result.status!==0)process.exit(result.status ?? 1);
const build=spawnSync(process.execPath,['scripts/build-pages.mjs'],{stdio:'inherit',env:{...process.env,GITHUB_PAGES_BASE_PATH:'/knowledge-garden-site'}});
process.exit(build.status ?? 1);
