/**
 * Smoke test E2E (spec 004/010): levanta `vite preview`, abre el juego en Chromium,
 * espera a que termine la carga, falla si hay errores de consola y guarda capturas.
 *   npm run build && npm run e2e -- [--out docs/screenshots/x.png] [--query "?backend=webgl"] [--script tools/e2e/steps.mjs]
 */
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const { values } = parseArgs({
  options: {
    out: { type: 'string', default: 'docs/screenshots/smoke.png' },
    query: { type: 'string', default: '' },
    width: { type: 'string', default: '1280' },
    height: { type: 'string', default: '720' },
    script: { type: 'string' },
    timeout: { type: 'string', default: '240000' },
  },
});

const PORT = 4318;
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe', detached: true });
await new Promise((ok, fail) => {
  server.stdout.on('data', (d) => String(d).includes(String(PORT)) && ok());
  server.on('exit', (c) => fail(new Error(`vite preview salió (${c})`)));
  setTimeout(() => fail(new Error('vite preview no arrancó')), 30000);
});

const errors = [];
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
  const page = await browser.newPage({ viewport: { width: Number(values.width), height: Number(values.height) } });
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
    if (process.env.E2E_VERBOSE) console.log(`[${m.type()}]`, m.text());
  });
  page.on('pageerror', (e) => errors.push(String(e)));
  const q = values.query ? values.query + '&autostart' : '?autostart';
  await page.goto(`http://localhost:${PORT}/${q}`);
  await page.waitForFunction(() => document.documentElement.dataset.ready, null, { timeout: Number(values.timeout), polling: 1000 });
  if ((await page.evaluate(() => document.documentElement.dataset.ready)) === 'error') {
    throw new Error(`Error de carga: ${await page.locator('.loading__label').innerText()}`);
  }
  console.log('backend:', await page.evaluate(() => document.documentElement.dataset.backend));
  if (values.script) {
    const mod = await import(pathToFileURL(resolve(values.script)).href);
    await mod.default(page, values);
  } else {
    await page.waitForTimeout(3000);
    await page.screenshot({ path: values.out, timeout: 600000 });
    console.log('captura:', values.out);
  }
  const relevant = errors.filter((e) => !/favicon/.test(e));
  if (relevant.length) throw new Error(`Errores de consola:\n${relevant.join('\n')}`);
  console.log('✓ smoke OK');
} catch (err) {
  console.error('✗', err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await browser.close();
  try { process.kill(-server.pid, 'SIGTERM'); } catch { server.kill(); }
  process.exit();
}
