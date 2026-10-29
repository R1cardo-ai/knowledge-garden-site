# Project instructions

- Website development is desktop-only from 2026-10-29 onward. Do not create new mobile-specific interfaces, mobile enhancements, or mobile acceptance work. For existing plans, the user's desktop-only instruction supersedes their mobile deliverables; continue desktop implementation and verification.

- After every website update, promptly update the site's update notice so it reflects the change. Keep the current version, changelog, homepage update ticker/feature/index, and related update lists in sync.
- Treat `app/archive/page.tsx` as the canonical source for the current version and update log; synchronize the corresponding display data in `public/ui-kit/templates/` whenever those records change.
- After every completed website update, publish the verified changes to the GitHub repository `R1cardo-ai/knowledge-garden-site`. Keep the GitHub source and website release artifacts in sync; the user has authorized this as the default workflow without asking again.
- After every verified website update, deploy the same release to the production website as well as GitHub. Wait for the hosting deployment result and verify the live version and changed entry points before reporting completion. This is standing user authorization; do not ask for confirmation again.
