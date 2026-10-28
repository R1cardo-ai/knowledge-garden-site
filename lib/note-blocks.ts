export type NoteBlock = { id: string; level: number; text: string; kind?: 'code'; language?: string };
// Explicit headings and closed fences add structure; all other notes remain text.
export function noteBlocks(notes: string): NoteBlock[] {
  const lines = notes.replace(/\r\n?/g, '\n').split('\n');
  const blocks: Omit<NoteBlock, 'id'>[] = [];
  let paragraph: string[] = [];
  const flush = () => { if (paragraph.join('\n').trim()) blocks.push({level:0,text:paragraph.join('\n')}); paragraph = []; };
  for (let index = 0; index < lines.length; index++) {
    const fence = lines[index].match(/^```([\w+-]*)\s*$/);
    if (fence) {
      const closing = lines.findIndex((line, next) => next > index && /^```\s*$/.test(line));
      if (closing !== -1) {
        flush();
        blocks.push({level:0,kind:'code',language:fence[1],text:lines.slice(index + 1, closing).join('\n')});
        index = closing;
        continue;
      }
      // An unfinished fence stays literal, including any apparent headings inside it.
      paragraph.push(...lines.slice(index));
      break;
    }
    const heading = lines[index].match(/^(#{1,3}) (.+)$/);
    if (heading) { flush(); blocks.push({level:heading[1].length + 1,text:heading[2]}); }
    else if (!lines[index].trim()) flush();
    else paragraph.push(lines[index]);
  }
  flush();
  return blocks.map((block,index) => ({...block,id:`note-section-${index}`}));
}

export type NoteInline = {text:string; href?:string; image?:boolean};
export function noteInline(text: string): NoteInline[] {
  const tokens: NoteInline[] = [];
  const pattern = /!?\[([^\]\n]*)\]\((https?:\/\/[^\s)]+)\)|https?:\/\/[^\s<>]+/g;
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index;
    if (index > cursor) tokens.push({text:text.slice(cursor,index)});
    const href = match[2] || match[0].replace(/[.,;!?，。；！？]+$/, '');
    try {
      const url = new URL(href);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Unsupported URL');
      tokens.push({text:match[1] ?? href,href:url.href,...(match[0].startsWith('![') ? {image:true} : {})});
      if (!match[2] && match[0].length > href.length) tokens.push({text:match[0].slice(href.length)});
    } catch { tokens.push({text:match[0]}); }
    cursor = index + match[0].length;
  }
  if (cursor < text.length) tokens.push({text:text.slice(cursor)});
  return tokens;
}
