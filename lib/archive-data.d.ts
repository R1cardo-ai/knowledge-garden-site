export const entryFormatLabels: Record<string,string>;
export function formatDisplayDate(value: Date): string;
export function normalizeEntryDate(value: string, fallback: string): string;
export function entryDateTimestamp(value: string): number;
export function normalizeHttpUrl(value: string): string | null;
export function normalizeEntries(value: unknown, fallbackDate: string): unknown[];
export function compareRecent(a: {updatedAt?: number; date: string}, b: {updatedAt?: number; date: string}): number;
export function selectFeaturedAward<T extends {type:string;date:string;updatedAt?:number}>(entries:T[]): T | undefined;
export function proofImageUrl(value?:string): string;

export type RelatedRef = {id?: string;title: string};
export function relatedReferences(text: string, entries: {id:string;title:string}[], previous?:RelatedRef[]): RelatedRef[];
export function relatedLabels(entry: {related?:string;relatedRefs?:RelatedRef[]}, entries:{id:string;title:string}[]): string;
