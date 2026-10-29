# Knowledge Garden

个人知识档案网站。**Agent 入口：**先读 [`AGENTS.md`](AGENTS.md) 和 [`docs/项目手册.md`](docs/项目手册.md)，再按任务查阅下方文档。当前产品版本和更新日志以 `app/archive/page.tsx` 为准。

## 文档导航

- 当前实现与桌面验收：[`docs/当前桌面验收.md`](docs/当前桌面验收.md)
- 项目规则与版本要求：[`docs/项目手册.md`](docs/项目手册.md)
- 设计规范与规划：[`docs/设计规范与规划.md`](docs/设计规范与规划.md)
- 下一轮桌面视觉化 UI 升级：[`docs/桌面视觉化UI升级规划_2026-10-29.md`](docs/桌面视觉化UI升级规划_2026-10-29.md)（v1.0.230 已交付首页视觉升级与目录可视化第一版，其余阶段见文中的后续批次）
- 本地档案、迁移及素材操作：[`docs/本地档案与素材操作.md`](docs/本地档案与素材操作.md)
- 外部设计参考：[`docs/design-references.md`](docs/design-references.md)，仅在 UI/设计任务需要时阅读
- 历史记录和验收：[`docs/archive/2026-10.md`](docs/archive/2026-10.md)，按需查阅

## 本地运行与检查

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

构建输出位于 `.local-build/`。重新构建前请停止正在运行的生产预览。本地运行不需要 `.openai/hosting.json`；账户配置、凭据、浏览器档案及构建产物不属于源码。其他项目检查命令见 `package.json`。

知识档案保存在当前浏览器来源的 localStorage 中，不会随 Git 仓库上传，也不会自动迁移到另一域名或端口。迁移前从网站导出备份，操作步骤见 [`docs/本地档案与素材操作.md`](docs/本地档案与素材操作.md)。

## 发布

GitHub 源码同步与网站部署是两步。Cloudflare Pages 从 GitHub `source` 分支构建，命令为 `npm run build:pages`，输出目录为 `.pages-build/site`。发布后需等待托管结果，并核对线上产品版本和变更入口。当前桌面验收入口见 [`docs/当前桌面验收.md`](docs/当前桌面验收.md)。
