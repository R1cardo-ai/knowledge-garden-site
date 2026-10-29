export type SectionPosition = {id:string;top:number};

// Use document order, not IntersectionObserver delivery order. The last section
// may never reach the top when its content is shorter than the viewport.
export function activeSection(sections:SectionPosition[], boundary=128, atEnd=false, visibleHashTarget=''):string {
  if (!sections.length) return '';
  // A native anchor near the end may be clamped by the document's bottom.
  // Keep that visible target selected instead of jumping to a later section.
  if (atEnd && visibleHashTarget && sections.some(s=>s.id===visibleHashTarget && s.top>=0)) return visibleHashTarget;
  if (atEnd) return sections[sections.length-1].id;
  let current=sections[0].id;
  for (const section of sections) {
    if (section.top>boundary) break;
    current=section.id;
  }
  return current;
}
