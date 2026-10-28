export type ArchiveUrlState = {
  view: 'all' | 'knowledge' | 'award';
  category: string;
  search: string;
  sort: 'updated' | 'latest' | 'oldest' | 'title';
  layout: 'cards' | 'list';
};
export function readArchiveUrl(url: URL): ArchiveUrlState {
  const p = url.searchParams;
  const view = p.get('view');
  const sort = p.get('sort');
  return {
    view: view === 'knowledge' || view === 'award' ? view : 'all',
    category: p.get('category') || 'all',
    search: p.get('q') || '',
    sort: sort === 'latest' || sort === 'oldest' || sort === 'title' ? sort : 'updated',
    layout: p.get('layout') === 'list' ? 'list' : 'cards',
  };
}
export function writeArchiveUrl(url: URL, state: ArchiveUrlState): URL {
  const next = new URL(url);
  const values = { view: state.view === 'all' ? '' : state.view, category: state.category === 'all' ? '' : state.category, q: state.search, sort: state.sort === 'updated' ? '' : state.sort, layout: state.layout === 'cards' ? '' : state.layout };
  for (const [key, value] of Object.entries(values)) {
    if (value) next.searchParams.set(key, value);
    else next.searchParams.delete(key);
  }
  return next;
}
