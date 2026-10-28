import base from '../vite.config';
import { defineConfig } from 'vite';
import path from 'node:path';
export default defineConfig(async (env) => {
 const config = await (base as Function)(env);
 config.plugins.push({name:'local-production-output', enforce:'post', configEnvironment(name: string) {
   return {build:{outDir:path.resolve('.local-build', name === 'rsc' ? 'server' : name === 'ssr' ? 'server/ssr' : name), emptyOutDir:true}};
 }});
 return config;
});
