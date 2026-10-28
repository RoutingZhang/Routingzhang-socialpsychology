/* Navigation is optional: all content and links also work without JavaScript. */
document.documentElement.classList.add('js');
const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#primary-navigation');
function closeMenu(returnFocus = false) {
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', 'Open navigation');
  navigation.classList.remove('is-open');
  if (returnFocus) menuButton.focus();
}
menuButton.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  navigation.classList.toggle('is-open', open);
});
navigation.addEventListener('click', event => {
  const link = event.target.closest('a');
  if (link) {
    closeMenu();
    const href = link.getAttribute('href');
    if (href?.startsWith('#')) document.getElementById(href.slice(1))?.focus({ preventScroll: true });
  }
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') closeMenu(true);
});
document.addEventListener('click', event => {
  if (!event.target.closest('.site-header')) closeMenu();
});
document.getElementById('year').textContent = new Date().getFullYear();

// Progressive enhancement: articles are always readable, including without JS.
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

// Only the background moves; the portrait and greeting remain stationary.
const keywordHero = document.querySelector('.landing-hero');
const keywordButton = document.querySelector('.keyword-motion');
if (keywordHero && keywordButton) {
  let manuallyPaused = false;
  let heroVisible = true;
  const syncKeywords = () => {
    const enabled = !reducedMotion.matches;
    keywordHero.classList.toggle('keywords-playing', enabled && !manuallyPaused && heroVisible && !document.hidden);
    keywordButton.hidden = !enabled;
    keywordButton.dataset.paused = String(manuallyPaused);
    const label = manuallyPaused ? 'Play background animation' : 'Pause background animation';
    keywordButton.setAttribute('aria-label', label);
    keywordButton.title = label;
  };
  keywordButton.addEventListener('click', () => {
    manuallyPaused = !manuallyPaused;
    syncKeywords();
  });
  reducedMotion.addEventListener('change', syncKeywords);
  document.addEventListener('visibilitychange', syncKeywords);
  if ('IntersectionObserver' in window) {
    const keywordObserver = new IntersectionObserver(entries => {
      heroVisible = entries[0].isIntersecting;
      syncKeywords();
    });
    keywordObserver.observe(keywordHero);
  }
  syncKeywords();
}

const activeReveals = new Map();
let revealObserver;
let pointerCleanup;

function configureReveals() {
  revealObserver?.disconnect();
  for (const animation of activeReveals.values()) animation.cancel();
  activeReveals.clear();
  if (reducedMotion.matches || !('IntersectionObserver' in window) || !Element.prototype.animate) return;

  const visibleArticles = new WeakSet();
  revealObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const article = entry.target;
      if (!entry.isIntersecting) {
        visibleArticles.delete(article);
        activeReveals.get(article)?.cancel();
        activeReveals.delete(article);
        continue;
      }
      if (visibleArticles.has(article)) continue;
      visibleArticles.add(article);
      const layout = article.querySelector('.paper-layout');
      if (!layout) continue;
      // One animation keeps the image and text perfectly in step. The outer
      // article stays stationary so movement cannot retrigger the observer.
      const animation = layout.animate([
        { opacity: 0, transform: 'translateY(18px)' },
        { opacity: 1, transform: 'translateY(0)' }
      ], {
        duration: 800,
        easing: 'cubic-bezier(.22,.61,.36,1)',
        fill: 'backwards'
      });
      activeReveals.set(article, animation);
      const release = () => {
        if (activeReveals.get(article) === animation) activeReveals.delete(article);
      };
      animation.finished.then(release, release);
    }
  }, { threshold: 0, rootMargin: '0px 0px -64px 0px' });
  document.querySelectorAll('.paper').forEach(article => revealObserver.observe(article));
}

function configurePointerGlow() {
  pointerCleanup?.();
  pointerCleanup = undefined;
  if (reducedMotion.matches || !finePointer.matches) return;

  const layer = document.createElement('div');
  layer.className = 'cursor-layer';
  layer.setAttribute('aria-hidden', 'true');
  const glow = document.createElement('div');
  glow.className = 'cursor-glow';
  layer.append(glow);
  document.body.append(layer);
  const listeners = new AbortController();
  let frame = 0;
  let x = 0;
  let y = 0;
  const hide = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    glow.classList.remove('is-active');
  };
  window.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse') return;
    x = event.clientX;
    y = event.clientY;
    if (frame) return;
    frame = requestAnimationFrame(() => {
      glow.style.transform = `translate3d(${x - 90}px, ${y - 90}px, 0)`;
      glow.classList.add('is-active');
      frame = 0;
    });
  }, { passive: true, signal: listeners.signal });
  document.addEventListener('pointerout', event => {
    if (!event.relatedTarget) hide();
  }, { signal: listeners.signal });
  window.addEventListener('blur', hide, { signal: listeners.signal });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) hide();
  }, { signal: listeners.signal });
  pointerCleanup = () => {
    listeners.abort();
    hide();
    layer.remove();
  };
}

configureReveals();
configurePointerGlow();
reducedMotion.addEventListener('change', () => {
  configureReveals();
  configurePointerGlow();
});
finePointer.addEventListener('change', configurePointerGlow);

// Original illustrations open in a scrollable, keyboard-accessible viewer.
const imageDialog = document.getElementById('image-viewer');
if (imageDialog) {
  const enlargedImage = imageDialog.querySelector('img');
  document.querySelectorAll('[data-image-dialog]').forEach(button => {
    button.addEventListener('click', () => {
      enlargedImage.src = button.dataset.src;
      enlargedImage.alt = button.dataset.alt;
      document.getElementById('image-viewer-title').textContent = button.dataset.title;
      imageDialog.showModal();
      imageDialog.querySelector('.image-dialog-scroll').scrollTop = 0;
    });
  });
  imageDialog.querySelector('.image-close').addEventListener('click', () => imageDialog.close());
  imageDialog.addEventListener('click', event => {
    if (event.target === imageDialog) imageDialog.close();
  });
}
