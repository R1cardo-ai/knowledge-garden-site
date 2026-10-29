import { normalizeEntries, formatDisplayDate, compareRecent, selectFeaturedEntry, featuredEntryStorageKey } from './archive-data.js';
(() => {
  function refreshArchive() {
  try {
    const saved = localStorage.getItem('knowledge-garden-entries');
    const entries = saved === null ? [] : normalizeEntries(JSON.parse(saved), formatDisplayDate(new Date()));
    let preferredId = '';
    try { preferredId = localStorage.getItem(featuredEntryStorageKey) || ''; } catch {}
    const featured = selectFeaturedEntry(entries, preferredId);
    const setFeatureText = (selector, value) => { const node = document.querySelector(selector); if (node) node.textContent = value; };
    setFeatureText('[data-feature-heading]', featured && featured.id === preferredId ? 'Featured entry / 精选档案' : 'Latest entry / 最近档案');
    setFeatureText('[data-feature-note]', featured && featured.id === preferredId ? '当前浏览器手动精选的档案。' : '档案保存在当前浏览器，按最近更新选取。');
    setFeatureText('[data-feature-title]', featured?.title || '从第一条记录开始');
    setFeatureText('[data-feature-meta]', featured ? `${featured.date} / ${featured.category} / ${featured.type === 'award' ? '成果' : '知识'}` : '当前浏览器的个人档案');
    setFeatureText('[data-feature-summary]', featured ? (featured.summary || '这条档案还没有摘要，打开记录查看详细内容。') : '把今天学到的知识或收获保存下来，这里将展示最近更新的档案。');
    const featuredLink = document.querySelector('[data-feature-link]');
    if (featuredLink) { featuredLink.href = featured ? `/archive?${new URLSearchParams({view:featured.type,entry:featured.id})}` : '/archive'; featuredLink.textContent = featured ? '阅读这条档案 ↗' : '打开个人档案 ↗'; }
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
    document.querySelectorAll('[data-feature-title]').forEach(node => {node.textContent = '暂时无法读取档案';});
    document.querySelectorAll('[data-feature-summary]').forEach(node => {node.textContent = '请打开个人档案下载原始备份并恢复。';});
    document.querySelectorAll('[data-feature-meta]').forEach(node => {node.textContent = '读取失败';});
    document.querySelectorAll('[data-feature-link]').forEach(node => {node.href = '/archive'; node.textContent = '打开个人档案 ↗';});
    document.querySelectorAll('[data-archive-count], [data-archive-stat]').forEach(node => {node.textContent = '—';});
    const status = document.querySelector('[data-archive-status]');
    if (status) status.textContent = '无法读取本地档案。请打开个人档案下载原始备份并恢复。';
    document.querySelectorAll('[data-recent]').forEach(node => {node.textContent = '读取失败，暂不显示记录';});
    document.querySelectorAll('[data-archive-categories]').forEach(node => {node.textContent = '读取失败，暂不显示分类';});
  }

  }
  refreshArchive();
  window.addEventListener('pageshow', refreshArchive);
  window.addEventListener('storage', (event) => { if (event.key === 'knowledge-garden-entries' || event.key === featuredEntryStorageKey || event.key === null) refreshArchive(); });
  document.querySelectorAll('.ef-ticker').forEach(ticker => {
    ticker.addEventListener('focusin', event => {
      const link = event.target.closest('a');
      if (link && ticker.contains(link) && link.matches(':focus-visible')) link.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});
    });
    ticker.addEventListener('focusout', event => {
      if (!ticker.contains(event.relatedTarget) && !matchMedia('(prefers-reduced-motion: reduce)').matches) ticker.scrollLeft = 0;
    });
  });

  document.querySelectorAll('[data-archive-date]').forEach((node) => {
    const now = new Date();
    node.textContent = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;
  });

  const home = document.createElement('a');
  home.className = 'ef-kit-home';
  home.href = '/ui-kit/';
  home.setAttribute('aria-label', '返回桌面样张索引');
  home.innerHTML = '<span aria-hidden="true">K</span><span>知识花园</span><small>样张索引</small>';

  const target = document.querySelector('.ef-cmdbar .util, .top .ef-actions, .ef-rail, .ef-head > p');
  if (target) target.prepend(home);

  // Carry appearance only between template pages; archive filters keep their own query.
  const appearanceKeys = ['variant', 'accent', 'paper', 'cut', 'ground', 'density', 'motion', 'theme'];
  const current = new URL(location.href);
  document.querySelectorAll('a[href]').forEach(link => {
    const url = new URL(link.getAttribute('href'), current);
    if (url.origin !== current.origin || !url.pathname.includes('/ui-kit/templates/')) return;
    for (const key of appearanceKeys) {
      if (current.searchParams.has(key) && !url.searchParams.has(key)) url.searchParams.set(key, current.searchParams.get(key));
    }
    link.href = url.href;
  });
})();
