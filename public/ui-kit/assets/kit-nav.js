import { normalizeEntries, formatDisplayDate, compareRecent } from './archive-data.js';
(() => {
  function refreshArchive() {
  try {
    const saved = localStorage.getItem('knowledge-garden-entries');
    const entries = saved === null ? [] : normalizeEntries(JSON.parse(saved), formatDisplayDate(new Date()));
    const award = entries.filter((entry) => entry.type === 'award').length;
    const knowledge = entries.length - award;
    const counts = { all: entries.length, knowledge, award };
    document.querySelectorAll('[data-archive-count]').forEach((node) => {
      const key = node.getAttribute('data-archive-count');
      if (key in counts) {
        const value = counts[key];
        const unit = key === 'award' ? ' 项' : ' 条';
        node.textContent = node.tagName === 'SPAN' ? `${value}${unit}` : String(value);
      }
    });
    const categories = new Set(entries.map((entry) => entry.category).filter(Boolean));
    const tags = new Set(entries.flatMap((entry) => Array.isArray(entry?.tags) ? entry.tags : []).filter(Boolean));
    document.querySelectorAll('[data-archive-stat="categories"]').forEach((node) => { node.textContent = String(categories.size); });
    document.querySelectorAll('[data-archive-stat="tags"]').forEach((node) => { node.textContent = String(tags.size); });
    const status = document.querySelector('[data-archive-status]');
    if (status) status.textContent = saved === null ? '首次访问：从一条知识或成果开始。档案保存在当前浏览器。' : entries.length ? '来自当前浏览器的档案 · 按最近更新排列' : '档案为空，可以打开个人档案添加记录。';
    for (const type of ['knowledge', 'award']) {
      const list = document.querySelector(`[data-recent="${type}"]`);
      if (!list) continue;
      list.replaceChildren();
      const recent = entries.filter(entry => entry.type === type).sort(compareRecent).slice(0, 4);
      if (!recent.length) {
        const empty = document.createElement('li'); empty.textContent = type === 'award' ? '还没有成果记录' : '还没有知识记录'; list.append(empty);
      }
      for (const entry of recent) {
        const li = document.createElement('li');
        const link = document.createElement('a'); link.className = 'ef-record';
        const params = new URLSearchParams({view:type, entry:entry.id});
        link.href = `/archive?${params}`;
        const title = document.createElement('span'); title.className = 'name ef-read'; title.textContent = entry.title;
        const date = document.createElement('time'); date.className = 'ef-field'; date.textContent = entry.date;
        link.append(title, date); li.append(link); list.append(li);
      }
    }
    const categoryList = document.querySelector('[data-archive-categories]');
    if (categoryList) {
      categoryList.replaceChildren();
      for (const category of [...categories].sort((a,b) => a.localeCompare(b))) {
        const link = document.createElement('a'); link.className = 'ef-btn small';
        link.href = `/archive?${new URLSearchParams({category})}`; link.textContent = category; categoryList.append(link);
      }
      if (!categories.size) categoryList.textContent = '添加记录后，这里会显示真实分类。';
    }
  } catch {
    document.querySelectorAll('[data-archive-count], [data-archive-stat]').forEach(node => {node.textContent = '—';});
    const status = document.querySelector('[data-archive-status]');
    if (status) status.textContent = '无法读取本地档案。请打开个人档案下载原始备份并恢复。';
    document.querySelectorAll('[data-recent]').forEach(node => {node.textContent = '读取失败，暂不显示记录';});
    document.querySelectorAll('[data-archive-categories]').forEach(node => {node.textContent = '读取失败，暂不显示分类';});
  }

  }
  refreshArchive();
  window.addEventListener('pageshow', refreshArchive);
  window.addEventListener('storage', (event) => { if (event.key === 'knowledge-garden-entries' || event.key === null) refreshArchive(); });

  document.querySelectorAll('[data-archive-date]').forEach((node) => {
    const now = new Date();
    node.textContent = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;
  });

  const home = document.createElement('a');
  home.className = 'ef-kit-home';
  home.href = '/ui-kit';
  home.setAttribute('aria-label', '返回桌面样张索引');
  home.innerHTML = '<span aria-hidden="true">K</span><span>知识花园</span><small>样张索引</small>';

  const target = document.querySelector('.ef-cmdbar .util, .top .ef-actions, .ef-rail, .hero .copy .ef-actions, .ef-head > p');
  if (target) target.prepend(home);
})();
