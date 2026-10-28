export type NoteBlock = { id: string; level: number; text: string };
// Existing notes stay plain text. Only explicit Markdown-style headings define sections.
export function noteBlocks(notes: string): NoteBlock[] {
  return notes.replace(/\r\n?/g, '\n').split(/\n\s*\n/).flatMap(block => {
    return block.split(/\n(?=#{1,3} )/).flatMap(part => {
      const match = part.match(/^(#{1,3}) ([^\n]+)(?:\n([\s\S]*))?$/);
      return match ? [{id:'',level:Math.min(match[1].length + 1, 4),text:match[2]}, ...(match[3] ? [{id:'',level:0,text:match[3]}] : [])] : [{id:'',level:0,text:part}];
    });
  }).filter(block=>block.text.trim()).map((block,index)=>({...block,id:`note-section-${index}`}));
}
