export type ArchiveUrlState = {
  view: 'all' | 'knowledge' | 'award';
  category: string;
  month: string;
  format?: 'all' | 'note' | 'book' | 'course' | 'article' | 'video' | 'project';
  search: string;
  sort: 'updated' | 'latest' | 'oldest' | 'title';
  layout: 'cards' | 'list';
};
export function readArchiveUrl(url: URL): ArchiveUrlState {
  const p = url.searchParams;
  const view = p.get('view');
  const sort = p.get('sort');
  const format = p.get('format');
  const rawMonth = p.get('month') || '';
  return {
    view: view === 'knowledge' || view === 'award' ? view : 'all',
    category: p.get('category') || 'all',
    month: /^(?:19|20|21)\d{2}\.(?:0[1-9]|1[0-2])$/.test(rawMonth) ? rawMonth : '',
    format: format === 'note' || format === 'book' || format === 'course' || format === 'article' || format === 'video' || format === 'project' ? format : 'all',
    search: p.get('q') || '',
    sort: sort === 'updated' || sort === 'latest' || sort === 'oldest' || sort === 'title' ? sort : view === 'award' || view === 'knowledge' ? 'latest' : 'updated',
    layout: p.get('layout') === 'cards' ? 'cards' : 'list',
  };
}
export function writeArchiveUrl(url: URL, state: ArchiveUrlState): URL {
  const next = new URL(url);
  const defaultSort = state.view === 'award' || state.view === 'knowledge' ? 'latest' : 'updated';
  const values = { view: state.view === 'all' ? '' : state.view, category: state.category === 'all' ? '' : state.category, month: state.month, format: !state.format || state.format === 'all' ? '' : state.format, q: state.search, sort: state.sort === defaultSort ? '' : state.sort, layout: state.layout === 'list' ? '' : state.layout };
  for (const [key, value] of Object.entries(values)) {
    if (value) next.searchParams.set(key, value);
    else next.searchParams.delete(key);
  }
  return next;
}
