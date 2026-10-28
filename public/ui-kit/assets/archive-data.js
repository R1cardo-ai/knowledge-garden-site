export const entryFormatLabels = {note:'笔记',book:'书籍',course:'课程',article:'文章',video:'视频',project:'项目'};
export function formatDisplayDate(value) {
    return `${value.getFullYear()}.${String(value.getMonth() + 1).padStart(2, '0')}.${String(value.getDate()).padStart(2, '0')}`;
}
export function normalizeEntryDate(value, fallback) {
    const match = value.trim().replace(/[/-]/g, '.').match(/^(\d{4})\.(\d{1,2})\.(\d{1,2})$/);
    if (!match)
        return fallback;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day)
        return fallback;
    return `${year}.${String(month).padStart(2, '0')}.${String(day).padStart(2, '0')}`;
}
export function entryDateTimestamp(value) {
    const match = value.match(/^(\d{4})\.(\d{2})\.(\d{2})$/);
    if (!match)
        return 0;
    return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}
export function normalizeHttpUrl(value) {
    const trimmed = value.trim();
    if (!trimmed)
        return '';
    try {
        const url = new URL(trimmed);
        return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
    }
    catch {
        return null;
    }
}
export function normalizeEntries(value, fallbackDate) {
    if (value && !Array.isArray(value) && typeof value === 'object' && (Number(value.schemaVersion) > 2 || Number(value.version) > 2)) throw new Error('Unsupported archive schema');
    const raw = Array.isArray(value) ? value : value && typeof value === 'object' && Array.isArray(value.entries) ? value.entries : [];
    if (!(Array.isArray(value) || (value && typeof value === 'object' && Array.isArray(value.entries))) || raw.some(item => !item || typeof item !== 'object' || Array.isArray(item)))
        throw new Error('Invalid archive');
    const usedIds = new Set();
    function stableId(item, index) {
        const text = JSON.stringify(item);
        let hash = 2166136261;
        for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
        const base = typeof item.id === 'string' && item.id.trim() ? item.id : `legacy-${index}-${(hash >>> 0).toString(36)}`;
        let id = base;
        let suffix = 1;
        while (usedIds.has(id)) id = `${base}-${suffix++}`;
        usedIds.add(id);
        return id;
    }
    const normalized = raw.filter((item) => Boolean(item) && typeof item === 'object').map((item, index) => ({
        ...item,
        id: stableId(item, index),
        type: item.type === 'award' ? 'award' : 'knowledge',
        format: ['note', 'book', 'course', 'article', 'video', 'project'].includes(item.format) ? item.format : 'note',
        title: typeof item.title === 'string' ? item.title : '未命名记录',
        category: typeof item.category === 'string' ? item.category : '未分类',
        date: typeof item.date === 'string' ? normalizeEntryDate(item.date, fallbackDate) : fallbackDate,
        summary: typeof item.summary === 'string' ? item.summary : '',
        tags: Array.isArray(item.tags) ? item.tags.filter((tag) => typeof tag === 'string') : [],
        color: typeof item.color === 'string' ? item.color : item.type === 'award' ? 'gold' : 'coral',
        notes: typeof item.notes === 'string' ? item.notes : '',
        source: typeof item.source === 'string' ? item.source : '',
        issuer: typeof item.issuer === 'string' ? item.issuer : '',
        awardLevel: typeof item.awardLevel === 'string' ? item.awardLevel : '',
        role: typeof item.role === 'string' ? item.role : '',
        proof: typeof item.proof === 'string' ? normalizeHttpUrl(item.proof) ?? '' : '',
        related: typeof item.related === 'string' ? item.related : '',
        ...(Array.isArray(item.relatedRefs) ? {relatedRefs:item.relatedRefs.filter(ref => ref && typeof ref === 'object' && typeof ref.title === 'string' && (ref.id === undefined || typeof ref.id === 'string')).map(ref => ({title:ref.title, ...(ref.id ? {id:ref.id} : {})}))} : {}),
        updatedAt: typeof item.updatedAt === 'number' && Number.isFinite(item.updatedAt) ? item.updatedAt : entryDateTimestamp(typeof item.date === 'string' ? normalizeEntryDate(item.date, fallbackDate) : fallbackDate),
    }));
    return normalized.map(entry => ({...entry, relatedRefs: entry.relatedRefs ?? relatedReferences(entry.related, normalized)}));
}

export function compareRecent(a, b) { return (b.updatedAt ?? entryDateTimestamp(b.date)) - (a.updatedAt ?? entryDateTimestamp(a.date)); }

// Selection follows record date; editing an old award does not make it the newest achievement.
export function selectFeaturedAward(entries) {
    return entries.filter(entry => entry.type === 'award').sort((a, b) => b.date.localeCompare(a.date) || compareRecent(a, b))[0];
}
export function proofImageUrl(value = '') {
    const safe = normalizeHttpUrl(value);
    if (!safe) return '';
    const url = new URL(safe);
    return /\.(?:png|jpe?g|webp|gif|avif)$/i.test(url.pathname) ? safe : '';
}

// IDs are authoritative once bound. Deleted targets must never rebind by title.
export function relatedReferences(text, entries, previous = []) {
    return text.split(/[,，]/).map(title => title.trim()).filter(Boolean).map(title => {
        const retained = previous.find(ref => (entries.find(entry => entry.id === ref.id)?.title ?? ref.title) === title);
        if (retained) return {...retained};
        const matches = entries.filter(entry => entry.title === title);
        return matches.length === 1 ? {id:matches[0].id, title} : {title};
    });
}
export function relatedLabels(entry, entries) {
    return (entry.relatedRefs ?? relatedReferences(entry.related ?? '', entries)).map(ref => entries.find(target => target.id === ref.id)?.title ?? ref.title).join(', ');
}
