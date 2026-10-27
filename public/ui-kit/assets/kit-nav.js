(() => {
  try {
    const saved = localStorage.getItem('knowledge-garden-entries');
    const parsed = saved ? JSON.parse(saved) : [];
    const raw = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === 'object' && Array.isArray(parsed.entries)
        ? parsed.entries
        : [];
    const entries = raw.filter((entry) => Boolean(entry) && typeof entry === 'object');
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
  } catch {}

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
