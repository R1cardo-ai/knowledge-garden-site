# Knowledge Garden

个人知识档案网站，当前网站版本见 `app/archive/page.tsx`。该文件也是更新日志的唯一来源，更新时需同步 `public/ui-kit/templates/` 的版本展示。

## 本地运行

需要 Node.js 22.13 或更高版本。

```sh
npm ci
npm run dev -- --host 127.0.0.1
```

生产构建与本地预览：

```sh
npm run build
npm start -- --ip 127.0.0.1 --port 5201
```

构建输出位于 `.local-build/`。重新构建前请停止正在运行的生产预览。
本地运行无需 `.openai/hosting.json`，未提供时使用空存储绑定；账户配置、凭据、浏览器档案及构建产物不包含在源码中。

## 检查与数据

```sh
npm test
npx tsc --noEmit
```

启动生产预览后可运行 `npm run check:production`。浏览器测试辅助脚本 `scripts/serve-storage-qa.mjs` 需要本机测试夹具，不是启动网站的必要步骤。

知识档案保存在当前浏览器来源的 localStorage 中，不会随 Git 仓库上传，也不会自动迁移到另一域名或端口。迁移前请从网站导出备份，参见 `docs/本地档案备份与迁移.md`。

GitHub 源码同步不等于网站部署。当前验收进度和待办见 `docs/规划逐项验收状态_2026-10-28.md`。

## Cloudflare Pages

已有项目 `knowledge-garden-site` 从 GitHub 的 `source` 分支构建。构建命令为 `npm run build:pages`，输出目录为 `.pages-build/site`，根目录留空，框架预设选“无”。使用锁定依赖及 Node.js 22.13 或更高版本。

Pages 构建在隔离目录内静态导出实际应用，包含 `/archive`、`/ui-kit` 和首页模板；根路径转到首页模板，未知路径返回 404。只发布静态产物，不上传源文件、个人档案、账户配置或未使用的人物背景。

本机复现构建：`npm run build:pages`。Pages 产物不依赖 Worker、D1 或 R2 绑定。部署失败时先区分仓库拉取错误与构建错误；旧成功部署可在 Cloudflare 控制台回退。更换域名不会自动迁移浏览器 localStorage。
