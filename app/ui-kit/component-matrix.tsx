'use client';
import { useState, useRef, type SyntheticEvent } from 'react';
import { BookOpen, Medal } from 'lucide-react';
import { ArchiveNavItem, ArchiveEmptyState, ArchiveStateIllustration } from '@/app/archive/archive-components';
import { ArchiveRecordRow, type RecordRowEntry } from '@/app/archive/archive-record-row';
import { FeaturedAward } from '@/app/archive/featured-award';
import { EntryReader } from '@/app/archive/entry-reader';
import { ArchiveInsights } from '@/app/archive/archive-insights';
import { categoryDistribution, monthlyRecordCounts } from '@/lib/archive-data.js';
import { Button } from '@/components/ui/button';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Label } from '@/components/ui/label';
import { ButtonGroup } from '@/components/ui/button-group';
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from '@/components/ui/carousel';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';

const samples: RecordRowEntry[] = [
  {id:'matrix-knowledge',type:'knowledge',title:'演示知识：把长标题整理成清晰的档案行',date:'2026.10.28',category:'演示知识',summary:'查看标题、摘要、日期和独立操作；这些数据只用于样张。',tags:['演示'],color:'coral'},
  {id:'matrix-award',type:'award',title:'演示成果：文字与已有字段并列',date:'2026.10.28',category:'演示成果',summary:'没有证明图片时使用文字版式，不显示虚构进度。',tags:['演示'],color:'gold'},
  {id:'matrix-second',type:'knowledge',title:'演示知识：另一个记录日期',date:'2026.09.18',category:'阅读整理',summary:'用于验证月份和分类图的真实数量。',tags:['演示'],color:'coral'},
];

export function ComponentMatrix() {
  const [view,setView] = useState<'knowledge'|'award'>('knowledge');
  const [filter,setFilter] = useState('all');
  const [category,setCategory] = useState('all');
  const [month,setMonth] = useState('');
  const [title,setTitle] = useState('');
  const [error,setError] = useState(false);
  const [notice,setNotice] = useState('');
  const detailTrigger = useRef<HTMLButtonElement | null>(null);
  const [detail,setDetail] = useState<RecordRowEntry | null>(null);
  const visible = samples.filter(entry=>entry.type===view && filter!=='empty' && (category==='all'||entry.category===category) && (!month||entry.date.startsWith(month)));
  const chartEntries=samples.filter(entry=>entry.type===view);
  function submit(event:SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(!title.trim());
    setNotice(title.trim() ? `演示预览：${title.trim()}。未写入个人档案。` : '');
  }
  return <section className="component-matrix" id="component-matrix" aria-labelledby="matrix-heading">
    <header><p className="section-kicker">{'// COMPONENT STATES'}</p><h2 id="matrix-heading">实际组件状态矩阵</h2><p>演示数据不读取或写入个人档案。可用 Tab 检查焦点、Enter 操作按钮、Escape 关闭弹层。</p></header>
    <section className="matrix-section" aria-labelledby="matrix-nav"><h3 id="matrix-nav">01 / 导航与筛选</h3><p>当前项同时以填充、字重和按下状态标识。切换导航或筛选可观察下方档案行。</p><nav className="matrix-nav" aria-label="组件演示导航"><ArchiveNavItem label="演示知识" active={view==='knowledge'} onClick={()=>setView('knowledge')}><BookOpen size={18}/><span>演示知识</span></ArchiveNavItem><ArchiveNavItem label="演示成果" active={view==='award'} onClick={()=>setView('award')}><Medal size={18}/><span>演示成果</span></ArchiveNavItem></nav><div className="matrix-filter"><Select value={filter} itemToStringLabel={value=>value==='empty'?'无匹配结果':'全部演示记录'} onValueChange={value=>value && setFilter(value)}><SelectTrigger className={`filter-trigger ${filter!=='all'?'filter-active':''}`} aria-label="演示筛选"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">全部演示记录</SelectItem><SelectItem value="empty">无匹配结果</SelectItem></SelectContent></Select></div></section>
    <section className="matrix-section" id="matrix-records" aria-labelledby="matrix-rows"><h3 id="matrix-rows">02 / 档案行与空状态</h3><p>“查看详情”打开演示弹层；“阅读”前往个人档案。演示删除按钮只显示反馈。</p>{visible.length ? <div className="entry-grid list-view">{visible.map((entry,index)=><ArchiveRecordRow key={entry.id} entry={entry} index={index} href="/archive" onDetails={event=>{detailTrigger.current=event.currentTarget;setDetail(entry);}} onDelete={()=>setNotice('演示删除操作：没有修改任何记录。')}/>)}</div> : <ArchiveEmptyState kind="filter" title="当前演示条件没有匹配记录" description="当前筛选没有匹配记录，清除后恢复演示档案行。" action="清除演示筛选" onAction={()=>{setFilter('all');setCategory('all');setMonth('');}}/>}</section>
    <section className="matrix-section" aria-labelledby="matrix-insights"><h3 id="matrix-insights">03 / 真实分类与日期图</h3><p>复用档案页图形；样张数量来自本页三条隔离演示记录。选择分类或月份会筛选上方档案行。</p><ArchiveInsights categoryStats={categoryDistribution(chartEntries,view)} monthStats={monthlyRecordCounts(chartEntries)} categoryFilter={category} monthFilter={month} onCategorySelect={setCategory} onMonthSelect={value=>setMonth(value===month?'':value)} onMonthClear={()=>setMonth('')} /></section>
    <section className="matrix-section" aria-labelledby="matrix-states"><h3 id="matrix-states">04 / 空与异常状态</h3><p>四种真实状态的辅助插图。读取和写入异常只在实际错误发生时出现在档案页。</p><div className="matrix-state-art">{(['empty','filter','read','write'] as const).map(kind=><figure key={kind}><ArchiveStateIllustration kind={kind}/><figcaption>{{empty:'空档案',filter:'无匹配结果',read:'读取失败',write:'写入失败'}[kind]}</figcaption></figure>)}</div></section>
    <section className="matrix-section" aria-labelledby="matrix-cover"><h3 id="matrix-cover">05 / 精选封面</h3><p>复用成果页的实际精选组件；此处展示无图片时的状态。</p><FeaturedAward entry={samples[1]} href="/archive?view=award"/></section>
    <section className="matrix-section" aria-labelledby="matrix-form"><h3 id="matrix-form">06 / 表单与反馈</h3><form className="matrix-form" onSubmit={submit} noValidate><Label htmlFor="matrix-title">演示记录标题</Label><InputGroup aria-label="演示标题输入分组"><InputGroupAddon><span>标题</span></InputGroupAddon><InputGroupInput id="matrix-title" value={title} onChange={event=>{setTitle(event.target.value);setError(false);}} aria-invalid={error} aria-describedby={error?'matrix-title-error':'matrix-form-help'}/></InputGroup><p id="matrix-form-help">空标题提交显示错误；有效标题只生成当前页面内的反馈。</p>{error && <p id="matrix-title-error" className="matrix-error" role="alert">请先填写演示记录标题。</p>}<ButtonGroup aria-label="演示表单操作"><Button type="submit">预览表单反馈</Button><Button type="button" disabled>不可用状态</Button></ButtonGroup></form><output className="matrix-status" aria-live="polite">{notice || '尚未执行演示操作。'}</output></section>
    <section className="matrix-section" aria-labelledby="matrix-dialog"><h3 id="matrix-dialog">07 / 弹层与焦点返回</h3><Dialog><DialogTrigger render={<Button>打开演示弹层</Button>}/><DialogContent className="entry-dialog matrix-dialog"><DialogTitle>演示弹层</DialogTitle><DialogDescription>这里复用网站的 Dialog。关闭后焦点应返回打开按钮；此演示不更改档案。</DialogDescription></DialogContent></Dialog></section>
    <section className="matrix-section" aria-labelledby="matrix-carousel"><h3 id="matrix-carousel">08 / 轮播与桌面布局</h3><p>桌面布局。使用左右按钮或方向键切换两张演示页面。</p><Carousel className="matrix-carousel" opts={{loop:false}} aria-label="演示内容轮播"><CarouselContent>{['记录知识','整理成果'].map((text,index)=><CarouselItem key={text}><div className="matrix-slide"><strong>0{index+1} / {text}</strong><p>此页仅展示轮播的首尾状态与按钮反馈。</p></div></CarouselItem>)}</CarouselContent><div className="matrix-carousel-controls"><CarouselPrevious/><CarouselNext/></div></Carousel></section>
    <section className="matrix-section" aria-labelledby="matrix-reader"><h3 id="matrix-reader">09 / 阅读与章节状态</h3><p>复用档案阅读组件。点击章节目录查看当前位置；编辑按钮仅显示演示反馈。</p><EntryReader entry={{...samples[0],title:'演示阅读：章节、代码与关联记录',notes:'# 阅读正文\n这里是演示笔记，验证正文、标题和目录的对齐。\n\n## 代码与链接\n```js\nconst archive = "演示内容";\n```\n\n# 关联记录\n关联入口保留日期与分类。',relatedRefs:[{id:samples[1].id,title:samples[1].title}]}} returnHref="/archive" onEdit={()=>setNotice('演示编辑入口：未修改个人档案。')} related={samples} hrefFor={()=>'/archive'}/><output className="matrix-status" aria-live="polite">{notice}</output></section>
    <Dialog open={Boolean(detail)} onOpenChange={open=>{if(!open)setDetail(null);}}><DialogContent className="entry-dialog matrix-dialog" finalFocus={detailTrigger}><DialogTitle>{detail?.title || '演示档案详情'}</DialogTitle><DialogDescription>{detail?.summary}</DialogDescription>{detail && <p>{detail.date} │ {detail.category}</p>}</DialogContent></Dialog>
  </section>;
}
