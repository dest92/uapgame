/** Capturas de los edificios procedurales (techos por skeleton + fachada geométrica). */
export default async function run(page, values) {
  const prefix = values.out.replace(/\.png$/, '');
  const shot = (name) => page.screenshot({ path: `${prefix}-${name}.png`, timeout: 600000 });
  // El mapa del campus tapa la vista: solo se oculta para la captura.
  await page.addStyleTag({ content: '.campusmap{display:none!important}' });
  const drag = async (dx, dy) => {
    await page.mouse.move(640, 360);
    await page.mouse.down();
    await page.mouse.move(640 + dx, 360 + dy, { steps: 8 });
    await page.mouse.up();
  };
  await page.mouse.move(640, 360);
  for (let i = 0; i < 3; i++) await page.mouse.wheel(0, 300);
  await drag(-250, 30);
  await page.waitForTimeout(2000);
  await shot('near');
  for (let i = 0; i < 8; i++) await page.mouse.wheel(0, 400);
  await drag(500, 50);
  await page.waitForTimeout(2000);
  await shot('wide');
}
