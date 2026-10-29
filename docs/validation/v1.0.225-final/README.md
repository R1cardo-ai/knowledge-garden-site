# v1.0.225 桌面收口证据

- 逐项结论：../../终末地增强规划桌面验收_2026-10-29.md。
- 自动工程检查：tests.log、lint.log、types.log、build.log、build-pages.log、build-github.log。
- 静态依赖与产物：static-artifacts.json；两套产物各检查 29 个运行依赖。
- 生产 Worker 运行验证：production-http.json，60 个 HTTP 请求。
- 普通/减少动态效果：matrix.json，首页、目录、阅读各 1280/1600px、双主题，两种偏好；templates.json 为其余样张检查。
- 视觉：desktop-contact-home/directory/reader.jpg 以及同名模式、主题、尺寸的完整截图，保存在本地；live-home-desktop.jpg 为公开空状态的最终线上预览。
- 内容、键盘、表单、导入导出、删除与恢复：interactions.json、component-interactions.json。
- 成果日期默认与显式更新排序：award-date-order.json。
- 对比度：contrast-results.json，80 个样本全部通过，最低 5.21:1。
- 字体与资源：resource-audit.json；历史 CSS 清理前后：legacy-css-before/after.json。
- 200% 缩放：user-acceptance.json，为用户人工确认，不宣称自动截图。
- GitHub/Cloudflare 发布：deployment.json；线上实际入口：live-browser.json。

完整合成数据截图仅保存在本地；没有把个人浏览器档案、私人背景或本机测试夹具上传。桌面范围来自用户后续明确指令，原手机验收不再继续。
