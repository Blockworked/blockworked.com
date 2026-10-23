// Loads a Qt wasm page in headless Chromium and prints its console.
//   node smoke.mjs <url> <console text to wait for> [screenshot.png]
import { chromium } from 'playwright';
const [url, until, shot] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 900, height: 600 } });
const t0 = Date.now();
const lines = [];
let resolve; const done = new Promise(r => (resolve = r));
page.on('console', m => { const t = m.text(); lines.push(`[${Date.now() - t0} ms] ${t}`); if (t.includes(until)) resolve(); });
page.on('pageerror', e => lines.push(`[${Date.now() - t0} ms] PAGEERROR ${e}`));
await page.goto(url);
await Promise.race([done, new Promise(r => setTimeout(r, 90000))]);
await page.waitForTimeout(1500);
const perf = await page.evaluate(() => performance.getEntriesByType('resource').map(e => `${e.name.split('/').pop()} ${Math.round(e.duration)}ms ${e.transferSize}B`));
console.log(lines.join('\n'));
console.log('resources:\n' + perf.join('\n'));
if (shot) await page.screenshot({ path: shot });
await browser.close();
