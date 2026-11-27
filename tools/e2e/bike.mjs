/** VEH-5/6: subir a la bici inicial, pedalear, bajar; B aparece otra bici. */
export default async function run(page) {
  const shot = (name) => page.screenshot({ path: `docs/screenshots/${name}.png`, timeout: 600000 });
  const hint = () => page.locator('.ctxhint').innerText();
  await page.waitForTimeout(1500);
  console.log('hint inicial:', await hint());
  if (!/Subir/.test(await hint())) throw new Error('VEH-6: no hay bici cerca al iniciar');
  await page.keyboard.press('KeyF');
  await page.waitForTimeout(1500);
  if (!/Bajar/.test(await hint())) throw new Error('VEH-5: no se montó la bici');
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(3500);
  await shot('bike-riding');
  await page.keyboard.up('KeyW');
  await page.keyboard.press('KeyF');
  await page.waitForTimeout(1500);
  console.log('hint tras bajar:', await hint());
  await page.keyboard.press('KeyB');
  await page.waitForTimeout(1500);
  await shot('bike-spawned');
}
