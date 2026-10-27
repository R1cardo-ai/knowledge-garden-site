import type { Metadata } from 'next';
import './globals.css';
import './endfield-theme.css';
import './endfield-desktop-controls.css';

export const metadata: Metadata = {
  title: '我的知识花园 | 个人知识库',
  description: '记录学习路径、知识卡片与获奖经历的个人知识库。',
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
