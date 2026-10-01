document.documentElement.classList.add('js');

const revealItems = [...document.querySelectorAll('.reveal')];
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function updateRevealEffects() {
  const viewportHeight = window.innerHeight;

  revealItems.forEach((item) => {
    const rect = item.getBoundingClientRect();
    const distance = viewportHeight - rect.top;
    const rawProgress = distance / (viewportHeight + rect.height);
    const progress = Math.min(Math.max(rawProgress, 0), 1);
    const opacity = Math.min(Math.max(progress * 2.1, 0), 1);
    const translateY = (1 - opacity) * 26;
    const scale = 0.99 + opacity * 0.01;

    item.style.opacity = opacity;
    item.style.transform = `translateY(${translateY}px) scale(${scale})`;

    if (opacity > 0.9) {
      item.classList.add('visible');
    } else {
      item.classList.remove('visible');
    }
  });
}

if (prefersReducedMotion) {
  revealItems.forEach((item) => {
    item.classList.add('visible');
    item.style.opacity = '1';
    item.style.transform = 'none';
  });
  document.body.classList.add('loaded');
} else {
  window.addEventListener('scroll', updateRevealEffects, { passive: true });
  window.addEventListener('resize', updateRevealEffects);

  window.addEventListener('load', () => {
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'auto' });
      updateRevealEffects();
      document.body.classList.add('loaded');
    }, 800);
  });
}
