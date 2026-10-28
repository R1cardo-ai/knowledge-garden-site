'use client';
import { useSyncExternalStore } from 'react';

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {attributes:true, attributeFilter:['data-theme']});
  return () => observer.disconnect();
}
function snapshot(): 'light' | 'dark' {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}
// The document is shared by React pages and the early theme bootstrap.
export function useDocumentTheme() {
  return useSyncExternalStore(subscribe, snapshot, (): 'light' => 'light');
}
