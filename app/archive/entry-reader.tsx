'use client';
import type { CSSProperties } from 'react';
import { relatedReferences, resolvedRelatedTargets, entryFormatLabels } from '@/lib/archive-data.js';
import { noteBlocks, noteInline } from '@/lib/note-blocks';
import { ReaderToc } from './reader-toc';

function NoteText({text}:{text:string}) {
  // Arbitrary user-linked images keep intrinsic dimensions; the static export has no image optimizer.
  // eslint-disable-next-line next/no-img-element
  return <>{noteInline(text).map((part,index) => part.href ? <a key={index} href={part.href} target="_blank" rel="noreferrer">{part.image ? <img src={part.href} alt={part.text || '笔记图片'} loading="lazy" /> : part.text}{part.image && <span className="reader-image-caption">{part.text || '笔记图片'} / 查看原图 ↗</span>}</a> : <span key={index}>{part.text}</span>)}</>;
}
type ReadEntry = {id:string;type?:'knowledge'|'award';format?:string;title:string;date:string;summary:string;notes?:string;category:string;source?:string;issuer?:string;awardLevel?:string;role?:string;proof?:string;tags:string[];related?:string;relatedRefs?:{id?:string;title:string}[]};
export function EntryReader({entry, returnHref, onEdit, related, hrefFor}: {entry:ReadEntry | undefined;returnHref:string;onEdit:()=>void;related:ReadEntry[];hrefFor:(id:string)=>string}) {
  if (!entry) return <article className="entry-reader"><h1>找不到这条档案</h1><p>该记录可能已被删除，或属于另一份浏览器档案。条目链接只适用于保存了这份数据的浏览器。</p><a href={returnHref}>返回档案列表</a></article>;
  const blocks=noteBlocks(entry.notes ?? '');
  const headings=blocks.filter(block=>block.level);
  const headingNumbers=new Map(headings.map((heading,index)=>[heading.id,String(index+1).padStart(2,'0')]));
  const relationRefs=entry.relatedRefs ?? relatedReferences(entry.related ?? '', related);
  const diagram=resolvedRelatedTargets(relationRefs,related.filter(target=>target.id!==entry.id));
  const nodePositions=[{x:15,y:18},{x:50,y:18},{x:85,y:18},{x:15,y:82},{x:50,y:82},{x:85,y:82}];
  return <article className="entry-reader" data-entry-type={entry.type} aria-labelledby="reader-title">
    <a href={returnHref}>← 返回{entry.type === 'award' ? '成果' : '随笔'}列表</a>
    <header className="reader-cover"><div className="reader-cover-top"><p className="section-kicker">{'// LOCAL ARCHIVE / READ'}</p><span>{entry.type === 'award' ? '成果阅读' : '随笔阅读'} / {headings.length ? `${String(headings.length).padStart(2,'0')} 节` : '正文'}</span></div><h1 id="reader-title">{entry.title}</h1><div className="reader-cover-meta"><p><time>{entry.date}</time> │ {entry.category} │ {entryFormatLabels[entry.format || 'note'] || '笔记'}</p><button type="button" onClick={onEdit}>{entry.type === 'award' ? '编辑记录' : '编辑随笔'}</button></div>{entry.summary && <section className="reader-cover-summary" aria-label="摘要"><span>摘要</span><p className="reader-summary">{entry.summary}</p></section>}</header>
    <div className="reader-columns">
      {headings.length >= 2 && <ReaderToc key={entry.id} headings={headings} />}
      {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- Wide code needs a keyboard focus target for horizontal scrolling. */}
      <div className="reader-body">{blocks.length ? blocks.map(block=>block.kind === 'code' ? <figure className="reader-code" key={block.id}><figcaption><span>{block.language || '代码'}</span><span>长行可在代码区横向滚动</span></figcaption><pre tabIndex={0} aria-label="代码，可横向滚动"><code>{block.text}</code></pre></figure> : block.level === 2 ? <h2 id={block.id} key={block.id}><span className="reader-section-index" aria-hidden="true">{headingNumbers.get(block.id)}</span>{block.text}</h2> : block.level === 3 ? <h3 id={block.id} key={block.id}><span className="reader-section-index" aria-hidden="true">{headingNumbers.get(block.id)}</span>{block.text}</h3> : block.level === 4 ? <h4 id={block.id} key={block.id}><span className="reader-section-index" aria-hidden="true">{headingNumbers.get(block.id)}</span>{block.text}</h4> : <p key={block.id}><NoteText text={block.text} /></p>) : <p>{entry.type === 'award' ? '还没有详细说明，可以通过编辑记录补充。' : '这篇随笔还没有正文，可以通过编辑随笔补充。'}</p>}</div>
    </div>
    <footer><dl>{[['学习来源',entry.source],['颁发机构',entry.issuer],['获奖级别',entry.awardLevel],['个人角色',entry.role]].filter(([,value])=>value).map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>{entry.tags.length > 0 && <p>{entry.tags.map(t=>`#${t}`).join(' ')}</p>}{entry.proof && <a href={entry.proof} target="_blank" rel="noreferrer">打开证明链接 ↗</a>}
      {relationRefs.length > 0 && <section className="reader-related"><h2>相关记录</h2>{diagram.targets.length > 0 && <fieldset className="reader-relation-map"><legend className="sr-only">当前记录与 {diagram.targets.length} 条有效关联的连接示意</legend><svg viewBox="0 0 800 280" preserveAspectRatio="none" aria-hidden="true">{diagram.targets.map((target,index)=><line key={target.id} x1="400" y1="140" x2={nodePositions[index].x*8} y2={nodePositions[index].y*2.8} />)}</svg><div className="reader-relation-center"><span>当前记录</span><strong>{entry.title}</strong></div><ol>{diagram.targets.map((target,index)=><li key={target.id} style={{'--node-x':`${nodePositions[index].x}%`,'--node-y':`${nodePositions[index].y}%`} as CSSProperties}><a href={hrefFor(target.id)} title={target.title}><small>{String(index+1).padStart(2,'0')} / {target.category}</small><strong>{target.title}</strong></a></li>)}</ol></fieldset>}{diagram.total>diagram.targets.length && <p className="reader-relation-overflow">示意图只显示前六条有效关联；其余 {diagram.total-diagram.targets.length} 条仍列在下方。</p>}<ol>{relationRefs.map((ref,index)=>{const target=related.find(e=>e.id===ref.id);return <li key={index}>{target ? <a href={hrefFor(target.id)}><strong>{target.title}</strong><span>{target.date} │ {target.type === 'award' ? '成果' : '随笔'} │ {target.category} │ {entryFormatLabels[target.format || 'note'] || '笔记'}</span></a> : <span>{ref.title}（{ref.id ? '目标已删除或不在此快照' : '未绑定，请编辑确认目标'}）</span>}</li>;})}</ol></section>}
      <p>此阅读入口使用当前浏览器中的档案，复制链接不会公开或同步内容。</p>
    </footer>
  </article>;
}
