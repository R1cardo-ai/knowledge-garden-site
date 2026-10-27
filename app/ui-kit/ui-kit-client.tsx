'use client';

import { useEffect, useState, type MouseEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { ArrowLeft, ArrowUpRight, Moon, Sun } from 'lucide-react';
import styles from './page.module.css';
import { transitionTheme } from '@/lib/theme-transition';
import { withBasePath } from '@/lib/site-path';

const previews = [
  { number: '01', file: 'showcase', name: '主页展示', label: 'SHOWCASE', description: '大字标、主页主视觉与最近记录的展示布局。', type: '展示' },
  { number: '02', file: 'reading', name: '阅读详情', label: 'READING', description: '窄栏正文、档案字段、目录与相关文章。', type: '阅读' },
  { number: '03', file: 'console', name: '档案总览', label: 'CONSOLE', description: '命令栏、分段圆盘、真实读数与工作列表。', type: '控制台' },
  { number: '04', file: 'specimen', name: '网页部件', label: 'SPECIMEN', description: '颜色、标签、按钮、表格、状态与空白状态。', type: '样张' },
  { number: '05', file: 'motion', name: '交互动效', label: 'MOTION', description: '入场、按压、切换、提示、弹层与减少动态效果。', type: '动效' },
  { number: '06', file: 'antipatterns', name: '规则对照', label: 'COMPARISON', description: '常见误区与对应做法，逐项并排查看。', type: '对照' },
];

const variants = [
  { id: 'standard', name: '标准', accent: '黄', detail: '中性纸色 / 标准切角' },
  { id: 'coldstore', name: '冷库', accent: '冰蓝', detail: '冷灰纸色 / 紧凑切角' },
  { id: 'site', name: '工地', accent: '琥珀', detail: '暖纸色 / 宽切角' },
  { id: 'nightshift', name: '夜班', accent: '荧光绿', detail: '深色主题 / 紧凑排布' },
];

const presetAxes = {
  standard: { accent: 'yellow', paper: 'neutral', cut: 'standard', ground: 'contours', density: 'standard', motion: 'full' },
  coldstore: { accent: 'ice', paper: 'cool', cut: 'tight', ground: 'grid', density: 'standard', motion: 'calm' },
  site: { accent: 'amber', paper: 'warm', cut: 'wide', ground: 'hatch', density: 'standard', motion: 'full' },
  nightshift: { accent: 'lime', paper: 'neutral', cut: 'standard', ground: 'plain', density: 'compact', motion: 'calm' },
};

const axes = [
  { name: 'accent', label: '强调色', options: [['yellow', '信号黄'], ['lime', '荧光绿'], ['ice', '冰蓝'], ['amber', '琥珀']] },
  { name: 'paper', label: '纸面', options: [['neutral', '中性'], ['warm', '暖色'], ['cool', '冷色']] },
  { name: 'cut', label: '切角', options: [['tight', '紧凑'], ['standard', '标准'], ['wide', '宽切角']] },
  { name: 'ground', label: '底纹', options: [['contours', '等高线'], ['grid', '网格'], ['hatch', '斜线'], ['plain', '无底纹']] },
  { name: 'density', label: '密度', options: [['compact', '紧凑'], ['standard', '标准'], ['roomy', '宽松']] },
  { name: 'motion', label: '动效', options: [['full', '完整'], ['calm', '安静']] },
] as const;

export default function UIKitPage() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [variant, setVariant] = useState('standard');
  const [values, setValues] = useState({ accent: 'yellow', paper: 'neutral', cut: 'standard', ground: 'contours', density: 'standard', motion: 'full' });

  useEffect(() => {
    const saved = window.localStorage.getItem('theme');
    const next = saved === 'dark' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.dataset.theme = next;
  }, []);

  function trackTerrainPointer(event: ReactPointerEvent<HTMLElement>) {
    if (event.pointerType !== 'mouse' || !window.matchMedia('(prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine)').matches) return;
    const x = event.clientX / Math.max(window.innerWidth, 1) - 0.5;
    const y = event.clientY / Math.max(window.innerHeight, 1) - 0.5;
    event.currentTarget.style.setProperty('--terrain-x', `${(-x * 18).toFixed(2)}px`);
    event.currentTarget.style.setProperty('--terrain-y', `${(-y * 12).toFixed(2)}px`);
  }

  function resetTerrainPointer(event: ReactPointerEvent<HTMLElement>) {
    event.currentTarget.style.setProperty('--terrain-x', '0px');
    event.currentTarget.style.setProperty('--terrain-y', '0px');
  }

  function trackSurfacePointer(event: ReactPointerEvent<HTMLElement>) {
    if (event.pointerType !== 'mouse' || !window.matchMedia('(prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine)').matches) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const y = Math.max(0, Math.min(100, ((event.clientY - rect.top) / Math.max(rect.height, 1)) * 100));
    event.currentTarget.style.setProperty('--pointer-y', `${y.toFixed(1)}%`);
  }

  function resetSurfacePointer(event: ReactPointerEvent<HTMLElement>) {
    event.currentTarget.style.removeProperty('--pointer-y');
  }

  function toggleTheme(event: MouseEvent<HTMLButtonElement>) {
    const next = theme === 'dark' ? 'light' : 'dark';
    transitionTheme(event.currentTarget, () => {
      setTheme(next);
      document.documentElement.dataset.theme = next;
      try { window.localStorage.setItem('theme', next); } catch {}
    });
  }

  const previewUrl = new URLSearchParams({ variant, ...values }).toString();

  return (
    <main className={styles.shell} onPointerMove={trackTerrainPointer} onPointerLeave={resetTerrainPointer}>
      <div className={styles.tri} aria-hidden="true"><i /><i /><i /></div>
      <div className={styles.terrain} aria-hidden="true" />
      <header className={styles.topbar}>
        <a className={styles.brand} href={withBasePath('/')} aria-label="返回知识花园"><span>K</span><strong>知识花园</strong><small>DESKTOP UI / 06 SCREENS</small></a>
        <div className={styles.topActions}>
          <a className={styles.back} href={withBasePath('/')}><ArrowLeft size={15} />返回档案</a>
          <button className={styles.theme} type="button" aria-label="深色主题" aria-pressed={theme === 'dark'} onClick={toggleTheme}>{theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}<span>{theme === 'dark' ? '浅色' : '深色'}</span></button>
        </div>
      </header>

      <div className={styles.content}>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>// DESIGN TOOLKIT <span> / 01</span></p>
            <h1>把界面拆成<br /><em>可复用的部分。</em></h1>
            <p className={styles.lede}>这里集中展示知识花园的桌面网页规范：页面布局、常用部件、交互反馈，以及四组外观预设。</p>
            <div className={styles.heroLinks}><a className={styles.primary} href={withBasePath('/ui-kit/templates/showcase.html?variant=standard')}>打开主页展示 <ArrowUpRight size={15} /></a><a className={styles.secondary} href="#previews">浏览全部样张 <span>06</span></a></div>
          </div>
          <div className={styles.readouts} aria-label="设计样张统计">
            <div><span>WEB PAGES</span><strong>06</strong><small>桌面样张</small></div>
            <div><span>PRESETS</span><strong>04</strong><small>外观预设</small></div>
            <div><span>AXES</span><strong>06</strong><small>独立外观选项</small></div>
            <p>亮黄只标记当前位置、主要操作和需要注意的状态。</p>
          </div>
        </section>

        <section className={styles.section} id="previews">
          <div className={styles.sectionHead}><div><p className={styles.eyebrow}>// PAGE TYPES <span>/ 网页样张</span></p><h2>六个页面，覆盖从阅读到交互</h2></div><span className={styles.count}>06 / 06</span></div>
          <div className={styles.grid}>
            {previews.map((preview) => <a className={styles.card} href={withBasePath(`/ui-kit/templates/${preview.file}.html`)} key={preview.file} onPointerMove={trackSurfacePointer} onPointerLeave={resetSurfacePointer}>
              <div className={styles.cardHead}><span className={styles.index}>{preview.number}</span><span className={styles.type}>{preview.type}</span><ArrowUpRight size={16} /></div>
              <p className={styles.cardLabel}>// {preview.label}</p><h3>{preview.name}</h3><p className={styles.cardDescription}>{preview.description}</p>
            </a>)}
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHead}><div><p className={styles.eyebrow}>// APPEARANCE <span>/ 四组预设</span></p><h2>固定规则不变，外观按需调整</h2></div><span className={styles.count}>04 / 04</span></div>
          <div className={styles.variants}>
            {variants.map((item) => <a className={styles.variant} href={withBasePath(`/ui-kit/templates/showcase.html?variant=${item.id}`)} key={item.id} onPointerMove={trackSurfacePointer} onPointerLeave={resetSurfacePointer}>
              <span className={styles.variantMark} data-variant={item.id} aria-hidden="true" /><span className={styles.variantText}><strong>{item.name}</strong><small>{item.accent} / {item.detail}</small></span><ArrowUpRight size={15} />
            </a>)}
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHead}><div><p className={styles.eyebrow}>// CUSTOM PREVIEW <span>/ 独立组合</span></p><h2>调整六项外观，打开组合预览</h2></div></div>
          <div className={styles.customizer}>
            {axes.map((axis) => <label className={styles.axis} key={axis.name}><span>{axis.label}</span><select value={values[axis.name]} onChange={(event) => setValues((current) => ({ ...current, [axis.name]: event.target.value }))}>{axis.options.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>)}
            <label className={styles.axis}><span>预设基础</span><select value={variant} onChange={(event) => { const next = event.target.value as keyof typeof presetAxes; setVariant(next); setValues(presetAxes[next]); }}>{variants.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
            <a className={styles.primary} href={withBasePath(`/ui-kit/templates/showcase.html?${previewUrl}`)}>预览当前组合 <ArrowUpRight size={15} /></a>
          </div>
          <p className={styles.note}>每个样张支持深浅主题和地址参数；预览页可继续切换主题，选择会保存在当前浏览器。</p>
        </section>

        <footer className={styles.footer}><span>知识花园 / 桌面网页规范</span><a href={withBasePath('/')}>返回个人档案 <ArrowUpRight size={13} /></a></footer>
      </div>
    </main>
  );
}
