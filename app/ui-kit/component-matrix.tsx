'use client';
import { useState, useRef, type SyntheticEvent } from 'react';
import { BookOpen, Medal } from 'lucide-react';
import { ArchiveNavItem, ArchiveEmptyState } from '@/app/archive/archive-components';
import { ArchiveRecordRow, type RecordRowEntry } from '@/app/archive/archive-record-row';
import { FeaturedAward } from '@/app/archive/featured-award';
import { Button } from '@/components/ui/button';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Label } from '@/components/ui/label';
import { ButtonGroup } from '@/components/ui/button-group';
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from '@/components/ui/carousel';
import { useIsMobile } from '@/hooks/use-mobile';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';

const samples: RecordRowEntry[] = [
  {id:'matrix-knowledge',type:'knowledge',title:'演示知识：把长标题整理成清晰的档案行',date:'2026.10.28',category:'演示知识',summary:'查看标题、摘要、日期和独立操作；这些数据只用于样张。',tags:['演示'],color:'coral'},
  {id:'matrix-award',type:'award',title:'演示成果：文字与已有字段并列',date:'2026.10.28',category:'演示成果',summary:'没有证明图片时使用文字版式，不显示虚构进度。',tags:['演示'],color:'gold'},
];

export function ComponentMatrix() {
  const isMobile = useIsMobile();
  const [view,setView] = useState<'knowledge'|'award'>('knowledge');
  const [filter,setFilter] = useState('all');
  const [title,setTitle] = useState('');
  const [error,setError] = useState(false);
  const [notice,setNotice] = useState('');
  const detailTrigger = useRef<HTMLButtonElement | null>(null);
  const [detail,setDetail] = useState<RecordRowEntry | null>(null);
  const visible = samples.filter(entry=>entry.type===view && filter!=='empty');
  function submit(event:SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(!title.trim());
    setNotice(title.trim() ? `演示预览：${title.trim()}。未写入个人档案。` : '');
  }
  return <section className="component-matrix" id="component-matrix" aria-labelledby="matrix-heading">
    <header><p className="section-kicker">{'// COMPONENT STATES'}</p><h2 id="matrix-heading">实际组件状态矩阵</h2><p>演示数据不读取或写入个人档案。可用 Tab 检查焦点、Enter 操作按钮、Escape 关闭弹层。</p></header>
    <section className="matrix-section" aria-labelledby="matrix-nav"><h3 id="matrix-nav">01 / 导航与筛选</h3><p>当前项同时以填充、字重和按下状态标识。切换导航或筛选可观察下方档案行。</p><nav className="matrix-nav" aria-label="组件演示导航"><ArchiveNavItem label="演示知识" active={view==='knowledge'} onClick={()=>setView('knowledge')}><BookOpen size={18}/><span>演示知识</span></ArchiveNavItem><ArchiveNavItem label="演示成果" active={view==='award'} onClick={()=>setView('award')}><Medal size={18}/><span>演示成果</span></ArchiveNavItem></nav><div className="matrix-filter"><Select value={filter} itemToStringLabel={value=>value==='empty'?'无匹配结果':'全部演示记录'} onValueChange={value=>value && setFilter(value)}><SelectTrigger className={`filter-trigger ${filter!=='all'?'filter-active':''}`} aria-label="演示筛选"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">全部演示记录</SelectItem><SelectItem value="empty">无匹配结果</SelectItem></SelectContent></Select></div></section>
    <section className="matrix-section" id="matrix-records" aria-labelledby="matrix-rows"><h3 id="matrix-rows">02 / 档案行与空状态</h3><p>“查看详情”打开演示弹层；“阅读”前往个人档案。演示删除按钮只显示反馈。</p>{visible.length ? <div className="entry-grid list-view">{visible.map((entry,index)=><ArchiveRecordRow key={entry.id} entry={entry} index={index} href="/archive" onDetails={event=>{detailTrigger.current=event.currentTarget;setDetail(entry);}} onDelete={()=>setNotice('演示删除操作：没有修改任何记录。')}/>)}</div> : <ArchiveEmptyState title="当前演示条件没有匹配记录" description="筛选为“无匹配结果”，清除后恢复演示档案行。" action="清除演示筛选" onAction={()=>setFilter('all')}/>}</section>
    <section className="matrix-section" aria-labelledby="matrix-cover"><h3 id="matrix-cover">03 / 精选封面</h3><p>复用成果页的实际精选组件；此处展示无图片时的状态。</p><FeaturedAward entry={samples[1]} href="/archive?view=award"/></section>
    <section className="matrix-section" aria-labelledby="matrix-form"><h3 id="matrix-form">04 / 表单与反馈</h3><form className="matrix-form" onSubmit={submit} noValidate><Label htmlFor="matrix-title">演示记录标题</Label><InputGroup aria-label="演示标题输入分组"><InputGroupAddon><span>标题</span></InputGroupAddon><InputGroupInput id="matrix-title" value={title} onChange={event=>{setTitle(event.target.value);setError(false);}} aria-invalid={error} aria-describedby={error?'matrix-title-error':'matrix-form-help'}/></InputGroup><p id="matrix-form-help">空标题提交显示错误；有效标题只生成当前页面内的反馈。</p>{error && <p id="matrix-title-error" className="matrix-error" role="alert">请先填写演示记录标题。</p>}<ButtonGroup aria-label="演示表单操作"><Button type="submit">预览表单反馈</Button><Button type="button" disabled>不可用状态</Button></ButtonGroup></form><output className="matrix-status" aria-live="polite">{notice || '尚未执行演示操作。'}</output></section>
    <section className="matrix-section" aria-labelledby="matrix-dialog"><h3 id="matrix-dialog">05 / 弹层与焦点返回</h3><Dialog><DialogTrigger render={<Button>打开演示弹层</Button>}/><DialogContent className="entry-dialog matrix-dialog"><DialogTitle>演示弹层</DialogTitle><DialogDescription>这里复用网站的 Dialog。关闭后焦点应返回打开按钮；此演示不更改档案。</DialogDescription></DialogContent></Dialog></section>
    <section className="matrix-section" aria-labelledby="matrix-carousel"><h3 id="matrix-carousel">06 / 轮播与响应布局</h3><p>当前为{isMobile ? '手机布局' : '桌面布局'}。使用左右按钮或方向键切换两张演示页面。</p><Carousel className="matrix-carousel" opts={{loop:false}} aria-label="演示内容轮播"><CarouselContent>{['记录知识','整理成果'].map((text,index)=><CarouselItem key={text}><div className="matrix-slide"><strong>0{index+1} / {text}</strong><p>此页仅展示轮播的首尾状态与按钮反馈。</p></div></CarouselItem>)}</CarouselContent><div className="matrix-carousel-controls"><CarouselPrevious/><CarouselNext/></div></Carousel></section>
    <Dialog open={Boolean(detail)} onOpenChange={open=>{if(!open)setDetail(null);}}><DialogContent className="entry-dialog matrix-dialog" finalFocus={detailTrigger}><DialogTitle>{detail?.title || '演示档案详情'}</DialogTitle><DialogDescription>{detail?.summary}</DialogDescription>{detail && <p>{detail.date} │ {detail.category}</p>}</DialogContent></Dialog>
  </section>;
}
