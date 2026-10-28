import { cn } from '@/lib/utils';
import { Loader2Icon } from 'lucide-react';

function Spinner({ className, 'aria-label': label = 'Loading', ...props }: React.ComponentProps<'svg'>) {
  return <output data-slot="spinner" aria-label={label} className={cn('inline-flex size-4', className)}><Loader2Icon className="size-full animate-spin" aria-hidden="true" {...props} /></output>;
}
export { Spinner };
