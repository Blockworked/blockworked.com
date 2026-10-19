// Starts the Qt build of Blockwork's editor (qt-demo/, built into
// public/demo/ by qt-demo/build.sh). One Qt instance draws every live block
// on the home page: each `[data-qt-screen]` element becomes a Qt screen, and
// DemoMain.qml puts a window on each, in the order of SCREENS.

/** Must match DemoMain.qml: the editor first, then its `previewKinds`. */
const SCREENS = ['editor', 'record', 'snap', 'logic', 'custom-block', 'battery'];

type QtLoad = (config: Record<string, unknown>) => Promise<unknown>;
declare global {
  interface Window {
    qtLoad?: QtLoad;
    blockwork_demo_entry?: (config: object) => Promise<object>;
    /** Read by main.cpp at startup, for a scale set before Qt was running. */
    blockworkEditorScale?: number;
  }
}

const BASE = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/demo/`;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Couldn't load ${src}`));
    document.head.appendChild(script);
  });
}

let started = false;
let instance: { setEditorScale?: (scale: number) => void } | null = null;

/** On phones the locked editor is a thumbnail of the desktop layout: Qt lays
 * it out at 1/scale of its element's size and draws it shrunk to fit. (A CSS
 * transform would be measured by Qt and shrink it twice.) */
export function setEditorScale(scale: number) {
  window.blockworkEditorScale = scale;
  instance?.setEditorScale?.(scale);
}

/** Loads and starts the editor once. Resolves when Qt has drawn its windows. */
export async function startQtDemo(): Promise<void> {
  if (started) return;
  started = true;
  const containers = SCREENS.map(name => document.querySelector<HTMLElement>(`[data-qt-screen="${name}"]`));
  if (containers.some(el => !el)) throw new Error('A Qt screen container is missing from the page');

  // Qt focuses its windows' elements as it shows them, which would scroll the
  // page to wherever the last one sits and send Space and the arrow keys to
  // it. Keep its focus calls from scrolling, and only let focus into the
  // editor once the visitor has clicked into it; the previews never need it.
  const [editor, ...previews] = containers as HTMLElement[];
  const hostOf = (el: Element) => {
    const root = el.getRootNode();
    return root instanceof ShadowRoot ? root.host : el;
  };
  const insideQt = (el: Element) => containers.some(c => c!.contains(hostOf(el)));
  const focus = HTMLElement.prototype.focus;
  HTMLElement.prototype.focus = function (this: HTMLElement, options?: FocusOptions) {
    return focus.call(this, insideQt(this) ? { ...options, preventScroll: true } : options);
  };
  let editorClicked = false;
  editor.addEventListener('pointerdown', () => { editorClicked = true; }, { capture: true });
  const refuseFocus = (event: FocusEvent) => {
    const target = event.composedPath()[0];
    if (target instanceof HTMLElement) target.blur();
  };
  previews.forEach(el => el.addEventListener('focusin', refuseFocus));
  editor.addEventListener('focusin', event => { if (!editorClicked) refuseFocus(event); });
  // A background tab gets no focus events, so also check once Qt is up.
  const sweepFocus = () => {
    let active = document.activeElement;
    while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
    if (!(active instanceof HTMLElement) || !insideQt(active)) return;
    const inPreview = previews.some(el => el.contains(hostOf(active)));
    if (inPreview || !editorClicked) active.blur();
  };

  // Qt only re-measures its screens on a window resize, so pass on the page's
  // own size changes too (the editor going fullscreen on phones, say).
  let resizeQueued = false;
  const resizes = new ResizeObserver(() => {
    if (resizeQueued) return;
    resizeQueued = true;
    requestAnimationFrame(() => {
      resizeQueued = false;
      window.dispatchEvent(new Event('resize'));
    });
  });
  containers.forEach(el => resizes.observe(el!));

  await loadScript(`${BASE}qtloader.js`);
  await loadScript(`${BASE}blockwork-demo.js`);
  await new Promise<void>((resolve, reject) => {
    window.qtLoad!({
      locateFile: (path: string) => BASE + path,
      qt: {
        containerElements: containers,
        // Keep the module: qtLoad itself resolves to nothing once app.exec()
        // hands control back to the browser.
        entryFunction: async (config: object) => {
          const module = await window.blockwork_demo_entry!(config);
          instance = module as typeof instance;
          return module;
        },
        onLoaded: () => {
          setTimeout(sweepFocus, 0);
          setTimeout(sweepFocus, 500);
          resolve();
        },
        onExit: (status: { text?: string; crashed?: boolean }) => {
          if (status.crashed) reject(new Error(status.text || 'The editor stopped'));
        },
      },
    }).catch(reject);
  });
}
