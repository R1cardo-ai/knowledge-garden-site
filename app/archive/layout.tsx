import type { Metadata } from 'next';

const siteUrl = 'https://knowledge-garden-site.pages.dev';

export const metadata: Metadata = {
  title: '随笔与成果',
  description: '按分类、标签和记录日期浏览当前浏览器里的随笔与获奖成果，打开独立阅读页回看全文。',
  alternates: { canonical: `${siteUrl}/archive` },
  openGraph: {
    type: 'website',
    url: `${siteUrl}/archive`,
    title: '随笔与成果 · 知识花园',
    description: '按分类、标签和记录日期浏览当前浏览器里的随笔与获奖成果。',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: '知识花园：把想到的，写成以后能重读的片段。' }],
  },
};

export default function ArchiveLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
