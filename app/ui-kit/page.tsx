import type { Metadata } from 'next';
import UIKitClient from './ui-kit-client';

const siteUrl = 'https://knowledge-garden-site.pages.dev';

export const metadata: Metadata = {
  title: '桌面 UI 样张',
  description: '知识花园桌面网页的页面范式、部件、动效与外观预设。',
  alternates: { canonical: `${siteUrl}/ui-kit/` },
  openGraph: {
    type: 'website',
    url: `${siteUrl}/ui-kit/`,
    title: '桌面 UI 样张 · 知识花园',
    description: '知识花园桌面网页的页面范式、部件、动效与外观预设。',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: '知识花园设计样张。' }],
  },
};

export default function UIKitPage() {
  return <UIKitClient />;
}
