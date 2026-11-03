import { normalizeEntries, formatDisplayDate, compareRecent, compareEssayDate, essayExcerpt, selectFeaturedEntry, selectFeaturedAward, proofImageUrl, categoryDistribution, featuredEntryStorageKey } from './archive-data.js';
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
    setFeatureText('[data-feature-meta]', featured ? `${featured.date} / ${featured.category} / ${featured.type === 'award' ? '成果' : '随笔'}` : '当前浏览器的个人档案');
    setFeatureText('[data-feature-summary]', featured ? (featured.summary || '这条档案还没有摘要，打开记录查看详细内容。') : '把今天的想法或收获保存下来，这里将展示最近更新的档案。');
    const featuredLink = document.querySelector('[data-feature-link]');
    if (featuredLink) { featuredLink.href = featured ? `/knowledge-garden-site/archive?${new URLSearchParams({view:featured.type,entry:featured.id})}` : '/knowledge-garden-site/archive'; featuredLink.textContent = featured ? '阅读这条档案 ↗' : '打开个人档案 ↗'; }
    const award = entries.filter((entry) => entry.type === 'award').length;
    const knowledge = entries.length - award;
    const counts = { all: entries.length, knowledge, award };
    document.querySelectorAll('[data-archive-count]').forEach((node) => {
      const key = node.getAttribute('data-archive-count');
      if (key in counts) {
        const value = counts[key];
        const unit = key === 'award' ? ' 项' : key === 'knowledge' ? ' 篇' : ' 条';
        node.textContent = node.tagName === 'SPAN' ? `${value}${unit}` : String(value);
      }
    });
    const categories = new Set(entries.map((entry) => entry.category).filter(Boolean));
    const tags = new Set(entries.flatMap((entry) => Array.isArray(entry?.tags) ? entry.tags : []).filter(Boolean));
    document.querySelectorAll('[data-archive-stat="categories"]').forEach((node) => { node.textContent = String(categories.size); });
    document.querySelectorAll('[data-archive-stat="tags"]').forEach((node) => { node.textContent = String(tags.size); });
    // 主题书架：把真实标签按记录数聚合，取前六个；点选进入档案搜索，不新造标签或第二个数据源。
    const shelf = document.querySelector('[data-shelf-grid]');
    if (shelf) {
      const byTag = new Map();
      for (const entry of entries) {
        for (const rawTag of Array.isArray(entry.tags) ? entry.tags : []) {
          const tag = String(rawTag).trim();
          if (!tag) continue;
          const item = byTag.get(tag) || { tag, count: 0, latest: null };
          item.count += 1;
          if (!item.latest || compareRecent(entry, item.latest) > 0) item.latest = entry;
          byTag.set(tag, item);
        }
      }
      const top = [...byTag.values()]
        .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'zh'))
        .slice(0, 6);
      shelf.replaceChildren();
      top.forEach((item, index) => {
        const listItem = document.createElement('li');
        const link = document.createElement('a');
        link.className = 'shelf-item';
        link.href = `/knowledge-garden-site/archive?${new URLSearchParams({ q: item.tag })}`;
        const number = document.createElement('span');
        number.className = 'shelf-index';
        number.setAttribute('aria-hidden', 'true');
        number.textContent = String(index + 1).padStart(2, '0');
        const name = document.createElement('span');
        name.className = 'shelf-name';
        name.textContent = `#${item.tag}`;
        const count = document.createElement('span');
        count.className = 'shelf-count';
        count.textContent = `${item.count} 条记录`;
        const desc = document.createElement('span');
        desc.className = 'shelf-desc';
        desc.textContent = `最近：${item.latest?.title || '暂无标题'}`;
        link.append(number, name, count, desc);
        listItem.append(link);
        shelf.append(listItem);
      });
      shelf.hidden = top.length === 0;
      const empty = document.querySelector('[data-shelf-empty]');
      if (empty) empty.hidden = top.length > 0;
      const note = document.querySelector('[data-shelf-note]');
      if (note) note.textContent = top.length
        ? `${entries.length} 条记录 / ${byTag.size} 个标签；显示记录数前 6 个，点选在档案中搜索。`
        : '按当前浏览器档案的真实标签聚合；点选标签在档案中搜索该词。';
    }
    // 从这里开始：用当前档案生成三步，不另建推荐数据或手写路线。
    const route = document.querySelector('[data-start-route]');
    if (route) {
      const newestEssay = entries.filter((entry) => entry.type === 'knowledge').sort(compareEssayDate)[0];
      const newestAward = entries.filter((entry) => entry.type === 'award').sort(compareRecent)[0];
      const steps = [
        {
          label: '读一篇随笔',
          entry: newestEssay,
          fallback: '还没有随笔',
          href: newestEssay ? `/knowledge-garden-site/archive?${new URLSearchParams({ view: 'knowledge', entry: newestEssay.id })}` : '/knowledge-garden-site/archive?view=knowledge#quick-capture-title',
        },
        {
          label: '看一项成果',
          entry: newestAward,
          fallback: '还没有成果',
          href: newestAward ? `/knowledge-garden-site/archive?${new URLSearchParams({ view: 'award', entry: newestAward.id })}` : '/knowledge-garden-site/archive?view=award',
        },
        {
          label: '打开全部目录',
          entry: null,
          fallback: '全部目录',
          meta: `${entries.length} 条记录`,
          href: '/knowledge-garden-site/archive?view=knowledge&layout=list',
        },
      ];
      route.replaceChildren();
      steps.forEach((step, index) => {
        const listItem = document.createElement('li');
        const link = document.createElement('a');
        link.className = 'route-step';
        link.href = step.href;
        const number = document.createElement('span');
        number.className = 'route-index';
        number.setAttribute('aria-hidden', 'true');
        number.textContent = String(index + 1).padStart(2, '0');
        const label = document.createElement('span');
        label.className = 'route-label';
        label.textContent = step.label;
        const title = document.createElement('strong');
        title.className = 'route-title';
        title.textContent = step.entry?.title || step.fallback;
        const meta = document.createElement('span');
        meta.className = 'route-meta';
        meta.textContent = step.entry ? `${step.entry.date} / ${step.entry.category}` : (step.meta || '');
        link.append(number, label, title, meta);
        listItem.append(link);
        route.append(listItem);
      });
      const note = document.querySelector('[data-route-note]');
      if (note) note.textContent = entries.length
        ? `按当前 ${entries.length} 条档案生成：读最近一篇随笔、看最近一项成果、打开全部目录。`
        : '档案为空时，这里是三步空状态：写第一篇随笔、记录第一项成果、打开目录。';
    }
    // 影像墙：只展示真实成果证据图，低饱和预览；没有图片时不生成占位图。
    const gallery = document.querySelector('[data-evidence-gallery]');
    if (gallery) {
      const images = entries
        .filter((entry) => entry.type === 'award' && proofImageUrl(entry.proof || ''))
        .sort(compareRecent)
        .slice(0, 3);
      gallery.replaceChildren();
      images.forEach((entry) => {
        const listItem = document.createElement('li');
        const link = document.createElement('a');
        link.className = 'gallery-card';
        link.href = `/knowledge-garden-site/archive?${new URLSearchParams({ view: 'award', entry: entry.id })}`;
        const media = document.createElement('span');
        media.className = 'gallery-media';
        const image = document.createElement('img');
        image.src = proofImageUrl(entry.proof || '');
        image.alt = entry.title;
        image.loading = 'lazy';
        media.append(image);
        const caption = document.createElement('span');
        caption.className = 'gallery-caption';
        const title = document.createElement('strong');
        title.className = 'gallery-title';
        title.textContent = entry.title;
        const meta = document.createElement('span');
        meta.className = 'gallery-meta';
        meta.textContent = `${entry.date} / ${entry.category}`;
        caption.append(title, meta);
        link.append(media, caption);
        listItem.append(link);
        gallery.append(listItem);
      });
      if (images.length > 0 && images.length < 3) {
        const more = document.createElement('li');
        more.className = 'gallery-more';
        more.style.setProperty('--gallery-span', String(3 - images.length));
        const link = document.createElement('a');
        link.href = '/knowledge-garden-site/archive?view=award';
        const label = document.createElement('span');
        label.className = 'gallery-meta';
        label.textContent = '全部成果';
        const title = document.createElement('b');
        title.textContent = '查看全部成果 ↗';
        const count = document.createElement('small');
        count.textContent = `共 ${entries.filter((entry) => entry.type === 'award').length} 项成果`;
        link.append(label, title, count);
        more.append(link);
        gallery.append(more);
      }
      gallery.hidden = images.length === 0;
      const empty = document.querySelector('[data-gallery-empty]');
      if (empty) empty.hidden = images.length > 0;
      const note = document.querySelector('[data-gallery-note]');
      if (note) note.textContent = images.length
        ? `当前 ${images.length} 张成果证据图；指针移入或键盘聚焦时还原全彩。`
        : '按当前档案收集带图片的成果证据；暂时只有证据图，灵感收藏等有素材再扩展。';
    }
    const status = document.querySelector('[data-archive-status]');
    if (status) status.textContent = saved === null ? '首次访问：从一篇随笔或一项成果开始。档案保存在当前浏览器。' : entries.length ? '来自当前浏览器的档案 · 随笔按记录日期排列' : '档案为空，可以打开个人档案添加记录。';
    // 内容概览：真实分类分布。条长为该类记录数 / 最大类记录数，点击进入已有分类筛选。
    const chart = document.querySelector('[data-archive-chart]');
    if (chart) {
      chart.replaceChildren();
      const distribution = categoryDistribution(entries, 'all');
      for (const row of distribution.rows) {
        const item = document.createElement('li');
        const link = document.createElement('a');
        link.className = 'chart-row';
        link.href = `/knowledge-garden-site/archive?${new URLSearchParams({ category: row.category })}`;
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
      const recent = entries.filter(entry => entry.type === type).sort(type === 'knowledge' ? compareEssayDate : compareRecent);
      // 随笔按记录日期回看；成果展陈仍按原有规则选主记录。
      const lead = type === 'award' ? selectFeaturedAward(entries) : recent[0];
      const rows = recent.filter(entry => entry.id !== lead?.id).slice(0, 3);
      if (leadHost) {
        leadHost.replaceChildren();
        if (!lead) {
          leadHost.append(leadEntry(`/knowledge-garden-site/archive?view=${type}`, '01', null, type === 'award' ? '还没有成果记录' : '还没有随笔', '打开个人档案，记下第一篇；首页会在同一浏览器里自动更新。', '前往个人档案 ↗', true));
        } else {
          const link = leadEntry(
            `/knowledge-garden-site/archive?${new URLSearchParams({ view: type, entry: lead.id })}`,
            '01',
            { date: lead.date, category: lead.category },
            lead.title,
            (type === 'knowledge' ? essayExcerpt(lead) : lead.summary) || '打开记录查看详细内容。',
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
        item.textContent = recent.length ? '以上是当前分区的全部记录。' : type === 'award' ? '还没有更多成果记录。' : '还没有更多随笔。';
        list.append(item);
        continue;
      }
      for (const entry of rows) {
        const item = document.createElement('li');
        const link = document.createElement('a'); link.className = 'recent-row';
        link.href = `/knowledge-garden-site/archive?${new URLSearchParams({ view: type, entry: entry.id })}`;
        const title = document.createElement('strong'); title.className = 'recent-row-title'; title.textContent = entry.title;
        const date = document.createElement('time'); date.textContent = entry.date;
        const summary = document.createElement('span'); summary.className = 'recent-row-summary'; summary.textContent = (type === 'knowledge' ? essayExcerpt(entry) : entry.summary) || '打开记录查看详细内容。';
        link.append(title, date, summary);
        item.append(link);
        list.append(item);
      }
    }
  } catch {
    document.querySelectorAll('[data-feature-title]').forEach(node => {node.textContent = '暂时无法读取档案';});
    document.querySelectorAll('[data-feature-summary]').forEach(node => {node.textContent = '请打开个人档案下载原始备份并恢复。';});
    document.querySelectorAll('[data-feature-meta]').forEach(node => {node.textContent = '读取失败';});
    document.querySelectorAll('[data-feature-link]').forEach(node => {node.href = '/knowledge-garden-site/archive'; node.textContent = '打开个人档案 ↗';});
    document.querySelectorAll('[data-archive-count], [data-archive-stat]').forEach(node => {node.textContent = '—';});
    const status = document.querySelector('[data-archive-status]');
    if (status) status.textContent = '无法读取本地档案。请打开个人档案下载原始备份并恢复。';
    document.querySelectorAll('[data-recent]').forEach(node => {node.textContent = '读取失败，暂不显示记录';});
    document.querySelectorAll('[data-recent-lead]').forEach(node => {node.textContent = '读取失败，暂不显示记录';});
    document.querySelectorAll('[data-archive-chart]').forEach(node => {node.textContent = '读取失败，暂不显示分类分布';});
    document.querySelectorAll('[data-archive-chart-total]').forEach(node => {node.textContent = '读取失败';});
    document.querySelectorAll('[data-shelf-grid]').forEach(node => {node.hidden = true;});
    document.querySelectorAll('[data-shelf-empty]').forEach(node => {node.hidden = false; node.textContent = '读取失败，暂不显示主题书架。';});
    document.querySelectorAll('[data-start-route]').forEach(node => {node.textContent = '读取失败，暂不显示推荐路线';});
    document.querySelectorAll('[data-evidence-gallery]').forEach(node => {node.hidden = true;});
    document.querySelectorAll('[data-gallery-empty]').forEach(node => {node.hidden = false; node.textContent = '读取失败，暂不显示影像墙。';});
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
  home.href = '/knowledge-garden-site/ui-kit/';
  home.setAttribute('aria-label', '返回桌面样张索引');
  home.innerHTML = '<svg class="kg-mark" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M1 8V1h7M16 1h7v7M23 16v7h-7M8 23H1v-7" /><rect x="9" y="9" width="6" height="6" /></svg><span class="kg-text"><b>知识花园</b><small>样张索引</small></span>';

  const target = document.querySelector('.ef-cmdbar .util, .top .ef-actions, .ef-rail, .ef-head > p');
  if (target) target.prepend(home);

  // Carry appearance only between template pages; archive filters keep their own query.
  const appearanceKeys = ['variant', 'accent', 'paper', 'cut', 'ground', 'density', 'motion', 'theme'];
  const current = new URL(location.href);
  document.querySelectorAll('a[href]').forEach(link => {
    const url = new URL(link.getAttribute('href'), current);
    if (url.origin !== current.origin || !url.pathname.includes('/knowledge-garden-site/ui-kit/templates/')) return;
    for (const key of appearanceKeys) {
      if (current.searchParams.has(key) && !url.searchParams.has(key)) url.searchParams.set(key, current.searchParams.get(key));
    }
    link.href = url.href;
  });
})();
