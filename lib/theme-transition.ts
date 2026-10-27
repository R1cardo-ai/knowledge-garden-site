type ViewTransition = {
  ready: Promise<void>;
  finished: Promise<void>;
};

type TransitionDocument = Document & {
  startViewTransition?: (update: () => void) => ViewTransition;
};

export function transitionTheme(
  origin: HTMLElement,
  update: () => void,
) {
  const root = document.documentElement;
  const startViewTransition = (document as TransitionDocument).startViewTransition;
  if (!startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    update();
    return;
  }

  const box = origin.getBoundingClientRect();
  const x = box.left + box.width / 2;
  const y = box.top + box.height / 2;
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  root.classList.add('ef-theming');

  const transition = startViewTransition.call(document, update);
  void transition.ready.then(() => {
    root.animate(
      { clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      {
        duration: Math.max(240, Math.min(600, radius / 3)),
        easing: 'cubic-bezier(0.7, 0, 0.2, 1)',
        pseudoElement: '::view-transition-new(root)',
      },
    );
  }).catch(() => undefined);
  void transition.finished.finally(() => root.classList.remove('ef-theming')).catch(() => undefined);
}
