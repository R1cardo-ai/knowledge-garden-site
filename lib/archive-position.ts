type SessionStore = Pick<Storage,'getItem'|'setItem'|'removeItem'>;
export type ArchivePosition = {y:number;anchor:string;offset:number};
function positionKey(href:string) {
  const url=new URL(href,'https://local.invalid');
  url.searchParams.delete('entry');
  for (const [key,value] of Object.entries({view:'all',category:'all',format:'all',sort:'updated',layout:'list',q:''})) { if (url.searchParams.get(key)===value) url.searchParams.delete(key); }
  url.searchParams.sort();
  return `knowledge-garden-position-v1:${url.pathname}${url.search}`;
}
export function saveArchivePosition(store:SessionStore,href:string,position:ArchivePosition) {
  try { store.setItem(positionKey(href),JSON.stringify(position)); } catch { /* Position is optional when storage is denied. */ }
}
export function readArchivePosition(store:SessionStore,href:string):ArchivePosition | null {
  try {
    const value=JSON.parse(store.getItem(positionKey(href)) || 'null');
    return value && typeof value.anchor==='string' && Number.isFinite(value.y) && value.y>=0 && Number.isFinite(value.offset) ? value : null;
  } catch { return null; }
}
export function clearArchivePosition(store:SessionStore,href:string) {
  try { store.removeItem(positionKey(href)); } catch { /* No record data is involved. */ }
}
