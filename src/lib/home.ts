// The home page's editor loading, unlock/lock, phone preview scale and the
// header logo that appears once the hero title scrolls away.
import { setEditorScale, startQtDemo } from './qtDemo';

export function setupHomePage() {
  // The Qt editor is ~8 MB compressed, so it only starts once the visitor
  // scrolls toward it or the feature illustrations, which come from the same
  // instance.
  const loading = document.querySelector<HTMLElement>('[data-editor-loading]');
  const qtSections = document.querySelectorAll<HTMLElement>('#try, .features');
  // A crash after loading takes the whole editor down; say so over it.
  const stoppedCard = document.querySelector<HTMLElement>('[data-editor-stopped]');
  document.querySelector('[data-editor-reload]')?.addEventListener('click', () => location.reload());
  const stopped = (reason: string) => {
    console.error(reason);
    if (stoppedCard) stoppedCard.hidden = false;
  };
  const start = () => {
    startQtDemo(stopped)
      .then(() => loading?.remove())
      .catch(error => {
        console.error(error);
        if (loading) loading.textContent = "The editor couldn't start in this browser.";
      });
  };
  if (qtSections.length && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(e => e.isIntersecting)) return;
      observer.disconnect();
      start();
    }, { rootMargin: '600px 0px' });
    qtSections.forEach(el => observer.observe(el));
  } else {
    start();
  }

  // Unlock the demo editor on click, lock it again with Done. On phones this
  // also toggles a fullscreen overlay (see .editor-active under `pointer:
  // coarse` in the styles below) — lock page scroll behind it while it's up.
  const editorWindow = document.querySelector<HTMLElement>('[data-editor-window]');
  const rotateHint = document.querySelector<HTMLElement>('[data-editor-rotate-hint]');
  const coarsePointer = window.matchMedia('(pointer: coarse)');
  document.querySelector('[data-editor-unlock]')?.addEventListener('click', () => {
    editorWindow?.classList.add('editor-active');
    updateEditorPreviewScale();
    if (coarsePointer.matches) {
      document.body.classList.add('editor-fullscreen-lock');
      // Fullscreen the whole document rather than the editor window, so
      // the fixed overlay below keeps its gap and scrim.
      document.documentElement.requestFullscreen?.().catch(() => {});
    }
    rotateHint?.classList.remove('dismissed');
  });
  document.querySelector('[data-editor-done]')?.addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    editorWindow?.classList.remove('editor-active');
    updateEditorPreviewScale();
    document.body.classList.remove('editor-fullscreen-lock');
  });
  document.querySelector('[data-editor-rotate-dismiss]')?.addEventListener('click', (e) => {
    e.stopPropagation();
    rotateHint?.classList.add('dismissed');
  });
  // Exiting fullscreen through the browser/OS (back gesture, Esc, …) instead
  // of the Done button should still close the editor.
  document.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement) return;
    editorWindow?.classList.remove('editor-active');
    updateEditorPreviewScale();
    document.body.classList.remove('editor-fullscreen-lock');
  });

  // Before activation on phones, the editor is laid out at a fixed
  // desktop-ish width and scaled down to fit the frame's real width (Qt does
  // the scaling; the frame's height follows `--editor-preview-scale`), so
  // phones get a proportional wide preview instead of a squeezed one.
  const EDITOR_PREVIEW_NATURAL_WIDTH = 680;
  function updateEditorPreviewScale() {
    if (!editorWindow) return;
    const scale = Math.min(1, editorWindow.clientWidth / EDITOR_PREVIEW_NATURAL_WIDTH);
    editorWindow.style.setProperty('--editor-preview-scale', String(scale));
    const thumbnail = coarsePointer.matches && !editorWindow.classList.contains('editor-active');
    setEditorScale(thumbnail ? scale : 1);
  }
  updateEditorPreviewScale();
  window.addEventListener('resize', updateEditorPreviewScale);

  // The header's logo is hidden on the home page while the big title is on
  // screen, and appears once the title has scrolled out of view behind the
  // header (plus a little extra scroll); scrolling back up hides it again.
  /** Extra scroll past the point where the title is fully hidden, in px. */
  const SHOW_AFTER = 40;

  const title = document.querySelector<HTMLElement>('.hero-brand');
  const header = document.querySelector<HTMLElement>('.site-header');
  const brand = document.querySelector<HTMLElement>('.site-header .brand-home');

  if (title && header && brand) {
    let threshold = 0;

    const update = () => {
      const shown = window.scrollY > threshold;
      brand.classList.toggle('brand-shown', shown);
      brand.toggleAttribute('inert', !shown);
    };

    const measure = () => {
      const titleBottom = title.getBoundingClientRect().bottom + window.scrollY;
      threshold = titleBottom - header.getBoundingClientRect().bottom + SHOW_AFTER;
      update();
    };

    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', measure);
    document.fonts?.ready.then(measure);
    window.addEventListener('load', measure);
    measure();
  }
}
