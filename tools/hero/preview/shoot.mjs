/**
 * Captura rápida de un hero asset en el visor de desarrollo (Playwright + WebGL por software).
 *   node tools/hero/preview/shoot.mjs public/models/hero/way-1.glb out.png "az=110&el=8&dist=70"
 */
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const { chromium } = createRequire(import.meta.url)('playwright');

const [glb, out, params = ''] = process.argv.slice(2);
const port = 8765 + Math.floor(Math.random() * 1000);
const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 800));
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('console', (m) => m.type() === 'error' && console.error('[page]', m.text()));
  page.on('pageerror', (e) => console.error('[page]', e.message));
  await page.goto(`http://127.0.0.1:${port}/tools/hero/preview/index.html?glb=/${glb}&${params}`);
  await page.waitForFunction(() => window.__done === true, null, { timeout: 300_000 });
  await page.locator('canvas').screenshot({ path: out });
  console.log('✓', out);
} finally {
  await browser.close();
  server.kill();
}
