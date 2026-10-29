# Project instructions

- Website development is desktop-only from 2026-10-29 onward. Do not create new mobile-specific interfaces, mobile enhancements, or mobile acceptance work. For existing plans, the user's desktop-only instruction supersedes their mobile deliverables; continue desktop implementation and verification.

- After every website update, promptly update the site's update notice so it reflects the change. Keep the current version, changelog, homepage update ticker/feature/index, and related update lists in sync.
- Treat `app/archive/page.tsx` as the canonical source for the current version and update log; synchronize the corresponding display data in `public/ui-kit/templates/` whenever those records change.
- After every completed website update, publish the verified changes to the GitHub repository `R1cardo-ai/knowledge-garden-site`. Keep the GitHub source and website release artifacts in sync; the user has authorized this as the default workflow without asking again.
- After every verified website update, deploy the same release to the production website as well as GitHub. Wait for the hosting deployment result and verify the live version and changed entry points before reporting completion. This is standing user authorization; do not ask for confirmation again.


## 文档读取

- 一般任务：读取 `README.md`、`docs/项目手册.md`。
- UI 任务：再读取 `docs/当前桌面验收.md` 和相关设计章节；必要时查看 `docs/design-references.md`。
- 档案迁移或素材发布：读取 `docs/本地档案与素材操作.md`。
- 历史证据仅在需要时查阅 `docs/archive/2026-10.md`；原始截图和 JSON 仍在 `docs/validation/`。
- `.github-latest-*`、`.site-stage` 和 `.recovery` 是发布/暂存/恢复副本；一般任务不要从这些目录读取项目规则或当前状态。需要恢复或核对副本时再定向查看。
