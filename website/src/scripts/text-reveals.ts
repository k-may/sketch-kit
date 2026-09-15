// One observer for every text block. Classes are also hooks for future animations.
const blocks = Array.from(document.querySelectorAll<HTMLElement>('.reveal'));
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

if ('IntersectionObserver' in window && !reducedMotion.matches) {
  const reveal = (block: HTMLElement) => {
    block.classList.remove('is-pending');
    block.classList.add('is-visible');
    observer.unobserve(block);
  };

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) reveal(entry.target as HTMLElement);
    }
  }, {
    threshold: 0,
    rootMargin: '0px 0px -24px 0px',
  });

  // Skip blocks already above the viewport (e.g. a restored scroll position).
  for (const block of blocks) {
    if (block.getBoundingClientRect().bottom <= 0) {
      block.classList.add('is-visible');
    } else {
      block.classList.add('is-pending');
      observer.observe(block);
    }
  }

  // Keyboard navigation must never land on an invisible link or control.
  document.addEventListener('focusin', (event) => {
    if (!(event.target instanceof Element)) return;
    let block = event.target.closest<HTMLElement>('.reveal');
    while (block) {
      reveal(block);
      block = block.parentElement?.closest<HTMLElement>('.reveal') ?? null;
    }
  });

  reducedMotion.addEventListener('change', (event) => {
    if (!event.matches) return;
    blocks.forEach(reveal);
    observer.disconnect();
  });
}
