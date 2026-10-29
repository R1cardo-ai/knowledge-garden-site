'use client';
import {useEffect,useState} from 'react';
import type {NoteBlock} from '@/lib/note-blocks';
import {activeSection} from '@/lib/reader-outline';

export function ReaderToc({headings}:{headings:NoteBlock[]}) {
  const [current,setCurrent]=useState(headings[0]?.id||'');
  const sectionIds=headings.map(h=>h.id).join('|');
  useEffect(()=>{
    let frame=0;
    const update=()=>{
      frame=0;
      const sections=sectionIds.split('|').flatMap(id=>{
        const node=document.getElementById(id);
        return node?[{id,top:node.getBoundingClientRect().top}]:[];
      });
      const atEnd=window.scrollY>0 && Math.ceil(window.scrollY+window.innerHeight)>=document.documentElement.scrollHeight-2;
      const hashTarget=sections.find(s=>`#${s.id}`===window.location.hash && s.top>=0 && s.top<window.innerHeight)?.id;
      setCurrent(activeSection(sections,128,atEnd,hashTarget));
    };
    const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};
    const article=document.querySelector('.entry-reader');
    const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(schedule);
    if(article)observer?.observe(article);
    document.addEventListener('scroll',schedule,{passive:true,capture:true});
    window.addEventListener('resize',schedule);
    window.addEventListener('hashchange',schedule);
    schedule();
    return ()=>{
      cancelAnimationFrame(frame);
      observer?.disconnect();
      document.removeEventListener('scroll',schedule,true);
      window.removeEventListener('resize',schedule);
      window.removeEventListener('hashchange',schedule);
    };
  },[sectionIds]);
  return <nav className="reader-toc" aria-label="章节目录"><details open><summary>章节目录 / {headings.length}</summary><ol>{headings.map(h=><li key={h.id} data-level={h.level}><a href={`#${h.id}`} aria-current={current===h.id?'location':undefined}>{h.text}</a></li>)}</ol></details></nav>;
}
