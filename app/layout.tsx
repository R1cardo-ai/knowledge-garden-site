import type { Metadata } from 'next';
import './globals.css';
import './endfield-theme.css';
import './endfield-desktop-controls.css';
import './endfield-refined.css';

const siteUrl = 'https://knowledge-garden-site.pages.dev';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: '知识花园 · 随笔与成果',
    template: '%s · 知识花园',
  },
  description: '记录日常观察、个人思考与获奖经历的本地档案；随笔、成果、搜索、阅读与更新记录都在同一座花园里。',
  applicationName: '知识花园',
  icons: { icon: '/favicon.svg' },
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    siteName: '知识花园',
    title: '知识花园 · 随笔与成果',
    description: '记录日常观察、个人思考与获奖经历的本地档案。',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: '知识花园：把想到的，写成以后能重读的片段。' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '知识花园 · 随笔与成果',
    description: '记录日常观察、个人思考与获奖经历的本地档案。',
    images: ['/og.png'],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" data-ark-theme="endfield" data-ark-depth="maximal" data-ef-variant="standard" data-ef-accent="yellow" data-ef-paper="neutral" data-ef-cut="standard" data-ef-ground="contours" data-ef-density="standard" data-ef-motion="full">
      <body className="antialiased">
        {/* oxlint-disable-next-line next/no-css-tags -- The generated unicode-range font sheet lives in public/fonts so the static templates and the React archive share one file. */}
        <link rel="stylesheet" href="/fonts/garden-serif.css" />
        {children}
      </body>
    </html>
  );
}
