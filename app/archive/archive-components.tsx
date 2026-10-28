'use client';
import type { ReactNode } from 'react';
import { FolderOpen, Plus } from 'lucide-react';

export function ArchiveNavItem({label,active,onClick,children}:{label:string;active:boolean;onClick:()=>void;children:ReactNode}) {
  return <button className={`nav-item ${active ? 'active' : ''}`} type="button" aria-label={label} title={label} aria-pressed={active} onClick={onClick}>{children}</button>;
}
export function ArchiveEmptyState({title,description,action,onAction}:{title:string;description:string;action:string;onAction:()=>void}) {
  return <div className="empty-state"><FolderOpen size={27} /><h3>{title}</h3><p>{description}</p><button className="empty-state-action" type="button" onClick={onAction}><Plus size={14} />{action}</button></div>;
}
