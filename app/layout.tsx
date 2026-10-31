import type { Metadata } from 'next';
import './globals.css';
import './endfield-theme.css';
import './endfield-desktop-controls.css';
import './endfield-refined.css';

export const metadata: Metadata = {
  title: '我的知识花园 | 随笔与成果',
  description: '记录日常观察、个人思考与获奖经历的本地档案。',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" data-ark-theme="endfield" data-ark-depth="maximal" data-ef-variant="standard" data-ef-accent="yellow" data-ef-paper="neutral" data-ef-cut="standard" data-ef-ground="contours" data-ef-density="standard" data-ef-motion="full">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
