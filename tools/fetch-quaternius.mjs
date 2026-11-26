/**
 * Descarga los packs CC0 de Quaternius usados por el personaje (itch.io requiere
 * el flujo del navegador, por eso se usa Playwright) y los descomprime en .cache/.
 *   node tools/fetch-quaternius.mjs
 * Licencia de ambos packs: CC0 1.0 (ver CREDITS.md).
 */
import { createRequire } from 'node:module';
import { mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PACKS = [
  { url: 'https://quaternius.itch.io/universal-base-characters', out: '.cache/quaternius/ubc.zip' },
  { url: 'https://quaternius.itch.io/universal-animation-library', out: '.cache/quaternius/ual.zip' },
];

mkdirSync('.cache/quaternius', { recursive: true });
const browser = await chromium.launch();
try {
  for (const pack of PACKS) {
    if (existsSync(pack.out)) {
      console.log(`= ${pack.out} ya existe`);
      continue;
    }
    const ctx = await browser.newContext({ acceptDownloads: true });
    const page = await ctx.newPage();
    await page.goto(pack.url);
    await page.click('a.download_btn, .buy_btn');
    await page.locator('a.direct_download_btn').first().click();
    await page.waitForSelector('.upload .download_btn', { timeout: 30000 });
    const [dl] = await Promise.all([
      page.waitForEvent('download', { timeout: 300000 }),
      page.locator('.upload .download_btn').first().click(),
    ]);
    await dl.saveAs(pack.out);
    console.log(`✓ ${pack.out}`);
    await ctx.close();
  }
} finally {
  await browser.close();
}
for (const pack of PACKS) execFileSync('unzip', ['-q', '-o', pack.out, '-d', pack.out.replace('.zip', '')]);
console.log('✓ packs descomprimidos en .cache/quaternius/');
