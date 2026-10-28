export type ArchiveUrlState = {
  view: 'all' | 'knowledge' | 'award';
  category: string;
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
  return {
    view: view === 'knowledge' || view === 'award' ? view : 'all',
    category: p.get('category') || 'all',
    format: format === 'note' || format === 'book' || format === 'course' || format === 'article' || format === 'video' || format === 'project' ? format : 'all',
    search: p.get('q') || '',
    sort: sort === 'latest' || sort === 'oldest' || sort === 'title' ? sort : 'updated',
    layout: p.get('layout') === 'cards' ? 'cards' : 'list',
  };
}
export function writeArchiveUrl(url: URL, state: ArchiveUrlState): URL {
  const next = new URL(url);
  const values = { view: state.view === 'all' ? '' : state.view, category: state.category === 'all' ? '' : state.category, format: !state.format || state.format === 'all' ? '' : state.format, q: state.search, sort: state.sort === 'updated' ? '' : state.sort, layout: state.layout === 'list' ? '' : state.layout };
  for (const [key, value] of Object.entries(values)) {
    if (value) next.searchParams.set(key, value);
    else next.searchParams.delete(key);
  }
  return next;
}
