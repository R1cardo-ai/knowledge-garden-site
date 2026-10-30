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
// Stable sort keeps the saved order when two essays share a record date.
export function compareEssayDate(a, b) { return b.date.localeCompare(a.date); }
export function essayExcerpt(entry) {
    if (entry.summary?.trim()) return entry.summary.trim();
    if (!entry.notes?.trim()) return '';
    return entry.notes.replace(/```[\s\S]*?```/g, ' ')
        .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        .replace(/^\s{0,3}#{1,6}\s+/gm, '')
        .replace(/\s+/g, ' ').trim().slice(0, 180);
}

// A browser preference points to an existing stable ID; snapshots remain schema v2.
export const featuredEntryStorageKey = 'knowledge-garden-featured-entry';
export function selectFeaturedEntry(entries, preferredId = '') {
    return entries.find(entry => entry.id === preferredId) ?? [...entries].sort(compareRecent)[0];
}

// Selection follows record date; editing an old award does not make it the newest achievement.
export function selectFeaturedAward(entries) {
    return entries.filter(entry => entry.type === 'award').sort((a, b) => b.date.localeCompare(a.date) || compareRecent(a, b))[0];
}
// Category totals for one partition. Search never shrinks the denominator, so the
// numbers here always match the archive list for the same partition.
export function categoryDistribution(entries, view = 'all') {
    const counts = new Map();
    for (const entry of entries) {
        if (view !== 'all' && entry.type !== view)
            continue;
        const category = typeof entry.category === 'string' && entry.category.trim() ? entry.category.trim() : '未分类';
        counts.set(category, (counts.get(category) ?? 0) + 1);
    }
    const alphabetical = [...counts.keys()].sort((a, b) => a.localeCompare(b));
    const rows = [...counts].map(([category, count]) => ({ category, count }));
    rows.sort((a, b) => b.count - a.count || alphabetical.indexOf(a.category) - alphabetical.indexOf(b.category));
    const max = rows.reduce((largest, row) => Math.max(largest, row.count), 0);
    const total = rows.reduce((sum, row) => sum + row.count, 0);
    return { rows: rows.map(row => ({ ...row, ratio: max ? row.count / max : 0 })), max, total };
}

// Twelve calendar months ending with the local current month, counted from the
// record date only. Invalid dates are reported apart; records outside the window
// stay out of the chart instead of being folded into the newest month.
export function monthlyRecordCounts(entries, now = new Date()) {
    const end = new Date(now.getFullYear(), now.getMonth(), 1);
    const months = [];
    for (let offset = 11; offset >= 0; offset--) {
        const cursor = new Date(end.getFullYear(), end.getMonth() - offset, 1);
        const label = `${cursor.getFullYear()}.${String(cursor.getMonth() + 1).padStart(2, '0')}`;
        months.push({ key: label, label, count: 0 });
    }
    const position = new Map(months.map((month, index) => [month.key, index]));
    let unverified = 0;
    let outside = 0;
    for (const entry of entries) {
        const date = typeof entry.date === 'string' ? entry.date.trim() : '';
        // Impossible dates (2026.13.01, 2026.02.31) are reported apart, not folded into a month.
        const normalized = normalizeEntryDate(date, '');
        if (!normalized) {
            unverified += 1;
            continue;
        }
        const index = position.get(normalized.slice(0, 7));
        if (index === undefined) {
            outside += 1;
            continue;
        }
        months[index].count += 1;
    }
    const max = months.reduce((largest, month) => Math.max(largest, month.count), 0);
    const total = months.reduce((sum, month) => sum + month.count, 0);
    return {
        months: months.map(month => ({ ...month, ratio: max ? month.count / max : 0 })),
        max,
        total,
        unverified,
        outside,
        range: `${months[0].label} – ${months[months.length - 1].label}`,
    };
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
// Diagram nodes use only stable, present IDs. The complete relation list stays separate.
export function resolvedRelatedTargets(refs, entries, limit = 6) {
    const byId = new Map(entries.map(entry => [entry.id, entry]));
    const seen = new Set();
    const resolved = [];
    for (const ref of refs) {
        if (!ref.id || seen.has(ref.id)) continue;
        seen.add(ref.id);
        const target = byId.get(ref.id);
        if (target) resolved.push(target);
    }
    return {targets: resolved.slice(0, limit), total: resolved.length};
}
