'use client';

import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  ReactNode,
} from 'react';

type CollapsibleProps = HTMLAttributes<HTMLDivElement> & {
  open?: boolean;
  children?: ReactNode;
};

function Collapsible({ open = false, ...props }: CollapsibleProps) {
  return (
    <div
      data-slot="collapsible"
      data-state={open ? 'open' : 'closed'}
      {...props}
    />
  );
}

function CollapsibleTrigger({
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} data-slot="collapsible-trigger" {...props} />;
}

function CollapsibleContent({
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="collapsible-content" {...props} />;
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
