/** Modo foto (P): oculta el HUD para capturas limpias. */
export function mountPhotoMode(hud: HTMLElement): void {
  window.addEventListener('keydown', (e) => {
    if (e.code !== 'KeyP' || e.target instanceof HTMLInputElement) return;
    hud.classList.toggle('hud--hidden');
  });
}
