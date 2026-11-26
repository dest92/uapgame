/** Recorrido del Hito 2: caminar, ver el hint, abrir el panel (INT-1..3). */
export default async function run(page) {
  const shot = (name) => page.screenshot({ path: `docs/screenshots/${name}.png` });
  await page.waitForTimeout(2500);
  await shot('hito2-spawn');
  await page.keyboard.down('KeyW');
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(250);
    if (await page.locator('.hint--visible').count()) break;
  }
  await page.keyboard.up('KeyW');
  await page.waitForTimeout(800);
  const hint = await page.locator('.hint--visible').count();
  console.log('hint visible:', hint > 0, hint ? await page.locator('.hint__name').innerText() : '');
  await shot('hito2-hint');
  if (!hint) throw new Error('INT-2: no apareció el hint al acercarse a la entrada');
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(1200);
  const open = await page.locator('.panel--open').count();
  console.log('panel abierto:', open > 0);
  await shot('hito2-panel');
  if (!open) throw new Error('INT-3: el panel no se abrió');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(600);
  if (await page.locator('.panel--open').count()) throw new Error('INT-3: Esc no cerró el panel');
  await page.keyboard.down('ShiftLeft');
  await page.keyboard.down('KeyA');
  await page.waitForTimeout(2500);
  await page.keyboard.up('KeyA');
  await page.keyboard.up('ShiftLeft');
  await shot('hito2-run');
}
