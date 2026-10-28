'use client';
import { useState } from 'react';
import { proofImageUrl, normalizeHttpUrl } from '@/lib/archive-data.js';
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';

type Award = {id:string;title:string;date:string;category:string;summary:string;issuer?:string;awardLevel?:string;role?:string;proof?:string};

function AwardImage({entry, image}:{entry:Award;image:string}) {
  const [failed, setFailed] = useState(false);
  if (failed) return <p className="award-image-fallback">图片暂时无法加载，可通过证明链接查看原始内容。</p>;
  // User-linked media keeps its original dimensions; the static export has no image optimizer.
  /* eslint-disable next/no-img-element */
  return <Dialog>
    <DialogTrigger className="award-image-trigger" aria-label={`预览成果图片：${entry.title}`}><img src={image} alt={entry.title} loading="lazy" onError={() => setFailed(true)} /><span>预览成果图片 ↗</span></DialogTrigger>
    <DialogContent className="entry-dialog award-image-dialog">
      <DialogTitle>{entry.title}</DialogTitle>
      <DialogDescription>{entry.summary || `${entry.date} / ${entry.category}`}</DialogDescription>
      <img src={image} alt={entry.title} />
      <a className="award-action" href={image} target="_blank" rel="noreferrer">查看原图 ↗</a>
    </DialogContent>
  </Dialog>;
  /* eslint-enable next/no-img-element */
}

export function FeaturedAward({entry, href}:{entry:Award;href:string}) {
  const image = proofImageUrl(entry.proof);
  const proof = normalizeHttpUrl(entry.proof || '');
  const fields = [['记录日期',entry.date],['类别',entry.category],['颁发机构',entry.issuer],['获奖级别',entry.awardLevel],['个人角色',entry.role]].filter(([,value])=>value);
  return <section className={`featured-award ${image ? 'has-image' : ''}`} aria-labelledby="featured-award-title">
    <div className="featured-award-copy"><p className="section-kicker">{'// FEATURED ACHIEVEMENT'}</p><p className="award-selection-note">成果精选 / 按当前筛选中的记录日期选取</p><h3 id="featured-award-title">{entry.title}</h3>{entry.summary && <p className="award-summary">{entry.summary}</p>}<div className="award-actions"><a className="award-action" href={href}>阅读成果记录 ↗</a>{proof && <a className="award-action" href={proof} target="_blank" rel="noreferrer">打开证明链接 ↗</a>}</div></div>
    {image && <figure className="featured-award-media"><AwardImage key={`${entry.id}:${image}`} entry={entry} image={image} /><figcaption>{entry.title} / {entry.date}</figcaption></figure>}
    <dl className="featured-award-fields">{fields.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
  </section>;
}
