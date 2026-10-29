export function formatDisplayDate(value: Date): string;
export function normalizeEntryDate(value: string, fallback: string): string;
export function entryDateTimestamp(value: string): number;
export function normalizeHttpUrl(value: string): string | null;
export function normalizeEntries(value: unknown, fallbackDate: string): unknown[];
export function compareRecent(a: {updatedAt?: number; date: string}, b: {updatedAt?: number; date: string}): number;
export function categoryDistribution(entries: {type:string;category?:string}[], view?: string): {rows:{category:string;count:number;ratio:number}[];max:number;total:number};
export function monthlyRecordCounts(entries: {date?:string}[], now?: Date): {months:{key:string;label:string;count:number;ratio:number}[];max:number;total:number;unverified:number;outside:number;range:string};

export type RelatedRef = {id?: string;title: string};
export function relatedReferences(text: string, entries: {id:string;title:string}[], previous?:RelatedRef[]): RelatedRef[];
export function relatedLabels(entry: {related?:string;relatedRefs?:RelatedRef[]}, entries:{id:string;title:string}[]): string;
