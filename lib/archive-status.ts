// One transient status channel per mounted archive. No records or preferences live here.
export function createArchiveStatus() {
  let message = '';
  const listeners = new Set<() => void>();
  return {
    getSnapshot: () => message,
    getServerSnapshot: () => '',
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    report: (next: string) => {
      if (next === message) return;
      message = next;
      for (const listener of listeners) listener();
    },
  };
}
