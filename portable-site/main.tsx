import React from 'react';
import { createRoot } from 'react-dom/client';
import Page from '../app/archive/page';
import '../app/globals.css';
import '../app/endfield-theme.css';
import '../app/endfield-desktop-controls.css';

const root = document.getElementById('root');
if (!root) throw new Error('页面容器不存在');
createRoot(root).render(<Page />);
