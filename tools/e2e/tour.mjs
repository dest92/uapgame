/** Recorrido fotográfico (Hito 3/4): vistas a distintas horas y ángulos. */
export default async function run(page, values) {
  const shot = (name) => page.screenshot({ path: `docs/screenshots/${name}.png`, timeout: 600000 });
  const prefix = values.out.replace(/^.*\//, '').replace(/\.png$/, '');
  const drag = async (dx, dy) => {
    await page.mouse.move(640, 360);
    await page.mouse.down();
    await page.mouse.move(640 + dx, 360 + dy, { steps: 8 });
    await page.mouse.up();
  };
  const setHour = (h) => page.evaluate((hh) => {
    const r = document.querySelector('.menu__range');
    r.value = String(hh);
    r.dispatchEvent(new Event('input', { bubbles: true }));
  }, h);
  await page.mouse.move(640, 360);
  for (let i = 0; i < 6; i++) await page.mouse.wheel(0, 300);
  await drag(0, 60);
  await page.waitForTimeout(1500);
  await shot(`${prefix}-a`);
  await drag(420, 0);
  await page.waitForTimeout(1200);
  await shot(`${prefix}-b`);
  await setHour(18.2);
  await page.waitForTimeout(1500);
  await shot(`${prefix}-golden`);
  await setHour(21.5);
  await page.waitForTimeout(1500);
  await shot(`${prefix}-night`);
}
