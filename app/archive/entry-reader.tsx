'use client';
import { relatedReferences } from '@/lib/archive-data.js';
import { noteBlocks } from '@/lib/note-blocks';
type ReadEntry = {id:string;title:string;date:string;summary:string;notes?:string;category:string;source?:string;issuer?:string;awardLevel?:string;role?:string;proof?:string;tags:string[];related?:string;relatedRefs?:{id?:string;title:string}[]};
export function EntryReader({entry, returnHref, onEdit, related, hrefFor}: {entry:ReadEntry | undefined;returnHref:string;onEdit:()=>void;related:ReadEntry[];hrefFor:(id:string)=>string}) {
  if (!entry) return <article className="entry-reader"><h1>找不到这条档案</h1><p>该记录可能已被删除，或属于另一份浏览器档案。条目链接只适用于保存了这份数据的浏览器。</p><a href={returnHref}>返回档案列表</a></article>;
  const blocks=noteBlocks(entry.notes ?? '');
  const headings=blocks.filter(block=>block.level);
  return <article className="entry-reader" aria-labelledby="reader-title">
    <a href={returnHref}>← 返回档案列表</a>
    <header><p className="section-kicker">{'// LOCAL ARCHIVE / READ'}</p><h1 id="reader-title">{entry.title}</h1><p><time>{entry.date}</time> · {entry.category}</p><button type="button" onClick={onEdit}>编辑记录</button></header>
    {entry.summary && <section aria-label="摘要"><p className="reader-summary">{entry.summary}</p></section>}
    <div className="reader-columns">
      {headings.length >= 2 && <nav className="reader-toc" aria-label="章节目录"><h2>目录</h2><ol>{headings.map(h=><li key={h.id}><a href={`#${h.id}`}>{h.text}</a></li>)}</ol></nav>}
      <div className="reader-body">{blocks.length ? blocks.map(block=>block.level === 2 ? <h2 id={block.id} key={block.id}>{block.text}</h2> : block.level === 3 ? <h3 id={block.id} key={block.id}>{block.text}</h3> : block.level === 4 ? <h4 id={block.id} key={block.id}>{block.text}</h4> : <p key={block.id}>{block.text}</p>) : <p>还没有详细笔记，可以通过编辑记录补充。</p>}</div>
    </div>
    <footer><dl>{[['学习来源',entry.source],['颁发机构',entry.issuer],['获奖级别',entry.awardLevel],['个人角色',entry.role]].filter(([,value])=>value).map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>{entry.tags.length > 0 && <p>{entry.tags.map(t=>`#${t}`).join(' ')}</p>}{entry.proof && <a href={entry.proof} target="_blank" rel="noreferrer">打开证明链接 ↗</a>}
      {(entry.relatedRefs?.length || entry.related) && <section><h2>关联记录</h2>{(entry.relatedRefs ?? relatedReferences(entry.related ?? '', related)).map((ref,index)=>{const target=related.find(e=>e.id===ref.id);return <p key={index}>{target ? <a href={hrefFor(target.id)}>{target.title}</a> : <span>{ref.title}（{ref.id ? '目标已删除或不在此快照' : '未绑定，请编辑确认目标'}）</span>}</p>;})}</section>}
      <p>此阅读入口使用当前浏览器中的档案，复制链接不会公开或同步内容。</p>
    </footer>
  </article>;
}
