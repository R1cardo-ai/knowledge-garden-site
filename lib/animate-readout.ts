type Options = {from?:number;to:number|string;scramble?:boolean;delay?:number;onStart?:()=>void;onValue?:(value:number)=>void};
export function animateReadout(element: Pick<HTMLElement,'textContent'>, {from=0,to,scramble=false,delay=0,onStart,onValue}:Options) {
  const target = typeof to === 'number' ? String(to).padStart(2,'0') : to;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    element.textContent = target;
    if (typeof to === 'number') onValue?.(to);
    return () => {};
  }
  let frame = 0;
  let start: number | undefined;
  let cancelled = false;
  const timer = window.setTimeout(() => {
    if (cancelled) return;
    onStart?.();
    const tick = (now:number) => {
      if (cancelled) return;
      start ??= now;
      const progress = Math.min(1,(now-start)/320);
      if (progress === 1) {
        element.textContent = target;
        if (typeof to === 'number') onValue?.(to);
        return;
      }
      if (scramble) {
        const chars='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const locked=Math.floor(progress*target.length);
        element.textContent=Array.from(target,(char,index)=>index>=locked && /[A-Z0-9]/i.test(char) ? chars[Math.floor(Math.random()*chars.length)] : char).join('');
      } else if (typeof to === 'number') {
        const value=Math.round(from+(to-from)*(1-Math.pow(1-progress,4)));
        element.textContent=String(value).padStart(2,'0');
        onValue?.(value);
      }
      frame=window.requestAnimationFrame(tick);
    };
    frame=window.requestAnimationFrame(tick);
  },Math.min(140,Math.max(0,delay)));
  return () => { cancelled=true; window.clearTimeout(timer); window.cancelAnimationFrame(frame); };
}
