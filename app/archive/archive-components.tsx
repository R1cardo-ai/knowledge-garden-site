'use client';
import type { ReactNode } from 'react';
import { Plus } from 'lucide-react';

export type ArchiveStateKind = 'empty' | 'filter' | 'read' | 'write';

export function ArchiveStateIllustration({kind}:{kind:ArchiveStateKind}) {
  const isFailure = kind === 'read' || kind === 'write';
  return <svg className={`archive-state-art is-${kind}`} viewBox="0 0 176 96" aria-label={{empty:'空档案示意',filter:'筛选未匹配示意',read:'档案读取失败示意',write:'档案写入失败示意'}[kind]}>
    <path className="state-art-frame" d="M12 18h60l10 10h82v54H12z" fill="none" stroke="currentColor" strokeWidth="2" />
    <path className="state-art-rule" d="M23 43h60M23 53h43M23 63h50" fill="none" stroke="currentColor" strokeWidth="2" />
    {kind === 'empty' && <><path d="M113 54h31M128.5 38v32" fill="none" stroke="currentColor" strokeWidth="3" /><circle cx="128.5" cy="54" r="22" fill="none" stroke="currentColor" strokeWidth="2" /></>}
    {kind === 'filter' && <><circle cx="120" cy="48" r="20" fill="none" stroke="currentColor" strokeWidth="3" /><path d="m134 62 19 19M113 48h14" fill="none" stroke="currentColor" strokeWidth="3" /></>}
    {isFailure && <><path d="M128 31 152 73h-48z" fill="none" stroke="currentColor" strokeWidth="2" /><path d={kind === 'read' ? 'M128 43v14m0 7v3' : 'M116 54h24m-12-12v24'} fill="none" stroke="currentColor" strokeWidth="3" /></>}
  </svg>;
}

export function ArchiveNavItem({label,active,onClick,children}:{label:string;active:boolean;onClick:()=>void;children:ReactNode}) {
  return <button className={`nav-item ${active ? 'active' : ''}`} type="button" aria-label={label} title={label} aria-pressed={active} onClick={onClick}>{children}</button>;
}
export function ArchiveEmptyState({title,description,action,onAction,kind='empty'}:{title:string;description:string;action:string;onAction:()=>void;kind?:'empty'|'filter'}) {
  return <div className="empty-state"><ArchiveStateIllustration kind={kind} /><h3>{title}</h3><p>{description}</p><button className="empty-state-action" type="button" onClick={onAction}>{kind==='empty' && <Plus size={14} />}{action}</button></div>;
}
