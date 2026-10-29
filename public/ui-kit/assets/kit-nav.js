import { normalizeEntries, formatDisplayDate, compareRecent, selectFeaturedEntry, selectFeaturedAward, proofImageUrl, categoryDistribution, featuredEntryStorageKey } from './archive-data.js';
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
    // 内容概览：真实分类分布。条长为该类记录数 / 最大类记录数，点击进入已有分类筛选。
    const chart = document.querySelector('[data-archive-chart]');
    if (chart) {
      chart.replaceChildren();
      const distribution = categoryDistribution(entries, 'all');
      for (const row of distribution.rows) {
        const item = document.createElement('li');
        const link = document.createElement('a');
        link.className = 'chart-row';
        link.href = `/archive?${new URLSearchParams({ category: row.category })}`;
        link.setAttribute('aria-label', `${row.category}：${row.count} 条记录，打开该分类的档案列表`);
        const name = document.createElement('span'); name.className = 'chart-name'; name.textContent = row.category;
        const count = document.createElement('span'); count.className = 'chart-count'; count.textContent = String(row.count);
        const track = document.createElement('span'); track.className = 'chart-track';
        const bar = document.createElement('span'); bar.className = 'chart-bar'; bar.style.setProperty('--ratio', row.ratio.toFixed(4));
        track.append(bar);
        link.append(name, count, track);
        item.append(link);
        chart.append(item);
      }
      if (!distribution.rows.length) {
        const empty = document.createElement('li');
        empty.className = 'chart-empty';
        empty.textContent = '还没有分类记录。添加第一条记录后，这里会显示真实分布。';
        chart.append(empty);
      }
      document.querySelectorAll('[data-archive-chart-total]').forEach((node) => {
        node.textContent = `${distribution.rows.length} 个分类 / ${distribution.total} 条记录`;
      });
    }
    const leadEntry = (href, index, meta, title, summary, action, empty = false) => {
      const link = document.createElement('a');
      link.className = empty ? 'lead-entry is-empty' : 'lead-entry';
      link.href = href;
      const indexNode = document.createElement('span'); indexNode.className = 'lead-index'; indexNode.setAttribute('aria-hidden', 'true'); indexNode.textContent = index;
      const metaNode = document.createElement('span'); metaNode.className = 'lead-meta';
      if (meta) {
        const date = document.createElement('time'); date.textContent = meta.date;
        metaNode.append(date);
        if (meta.category) { const category = document.createElement('span'); category.textContent = meta.category; metaNode.append(category); }
      }
      const titleNode = document.createElement('strong'); titleNode.className = 'lead-title'; titleNode.textContent = title;
      const summaryNode = document.createElement('span'); summaryNode.className = 'lead-summary'; summaryNode.textContent = summary;
      const actionNode = document.createElement('span'); actionNode.className = 'lead-action'; actionNode.textContent = action;
      link.append(indexNode, metaNode, titleNode, summaryNode, actionNode);
      return link;
    };
    for (const type of ['knowledge', 'award']) {
      const list = document.querySelector(`[data-recent="${type}"]`);
      const leadHost = document.querySelector(`[data-recent-lead="${type}"]`);
      const recent = entries.filter(entry => entry.type === type).sort(compareRecent);
      // 成果按记录日期选主展陈，其余沿用最近更新顺序；知识直接取最近更新的一条。
      const lead = type === 'award' ? selectFeaturedAward(entries) : recent[0];
      const rows = recent.filter(entry => entry.id !== lead?.id).slice(0, 3);
      if (leadHost) {
        leadHost.replaceChildren();
        if (!lead) {
          leadHost.append(leadEntry(`/archive?view=${type}`, '01', null, type === 'award' ? '还没有成果记录' : '还没有知识记录', '打开个人档案，记下第一条；首页会在同一浏览器里自动更新。', '前往个人档案 ↗', true));
        } else {
          const link = leadEntry(
            `/archive?${new URLSearchParams({ view: type, entry: lead.id })}`,
            '01',
            { date: lead.date, category: lead.category },
            lead.title,
            lead.summary || '这条档案还没有摘要，打开记录查看详细内容。',
            '阅读这条档案 ↗',
          );
          const image = type === 'award' ? proofImageUrl(lead.proof || '') : '';
          if (image) {
            const figure = document.createElement('figure'); figure.className = 'lead-proof';
            const picture = document.createElement('img'); picture.src = image; picture.alt = lead.title; picture.loading = 'lazy';
            const caption = document.createElement('figcaption'); caption.textContent = '成果证据图片 / 打开档案可查看原图';
            figure.append(picture, caption);
            link.querySelector('.lead-title').before(figure);
          }
          leadHost.append(link);
        }
      }
      if (!list) continue;
      list.replaceChildren();
      if (!rows.length) {
        const item = document.createElement('li');
        item.className = 'recent-empty';
        item.textContent = recent.length ? '以上是当前分区的全部记录。' : type === 'award' ? '还没有更多成果记录。' : '还没有更多知识记录。';
        list.append(item);
        continue;
      }
      for (const entry of rows) {
        const item = document.createElement('li');
        const link = document.createElement('a'); link.className = 'recent-row';
        link.href = `/archive?${new URLSearchParams({ view: type, entry: entry.id })}`;
        const title = document.createElement('strong'); title.className = 'recent-row-title'; title.textContent = entry.title;
        const date = document.createElement('time'); date.textContent = entry.date;
        const summary = document.createElement('span'); summary.className = 'recent-row-summary'; summary.textContent = entry.summary || '这条档案还没有摘要。';
        link.append(title, date, summary);
        item.append(link);
        list.append(item);
      }
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
    document.querySelectorAll('[data-recent-lead]').forEach(node => {node.textContent = '读取失败，暂不显示记录';});
    document.querySelectorAll('[data-archive-chart]').forEach(node => {node.textContent = '读取失败，暂不显示分类分布';});
    document.querySelectorAll('[data-archive-chart-total]').forEach(node => {node.textContent = '读取失败';});
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
